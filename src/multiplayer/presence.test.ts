import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regresja: gracz znikał „poza grą" na stałe po chwilowej utracie sieci.
 *
 * Sama obietnica `onDisconnect` nie wystarcza. Gdy telefon na moment traci
 * łącze (norma na komórce) i Firebase łączy się z powrotem, serwer zdążył już
 * wykonać `onDisconnect` — ustawił `online: false` i „zużył" obietnicę. Stary
 * `trackPresence` zapisywał `online: true` tylko RAZ, przy wejściu, i nie
 * nasłuchiwał ponownego połączenia. Nikt nie zapisywał `true` z powrotem:
 * gracz zostawał „poza grą" na zawsze, a po minucie koordynator spasowywał
 * jego turę i wyrzucał go z partii, mimo że siedział połączony. Dokładnie to
 * psuło grę we dwoje na komórkach.
 *
 * Poprawka: `trackPresence` nasłuchuje `.info/connected` i przy KAŻDYM
 * (ponownym) połączeniu zbroi świeżą obietnicę rozłączenia i zapisuje
 * `online: true` na nowo.
 */

let connectedCb: ((snap: { val: () => unknown }) => void) | null = null;
const setCalls: Array<{ path: string; value: unknown }> = [];
const onDisconnectSet = vi.fn();
const onDisconnectCancel = vi.fn();

vi.mock('firebase/auth', () => ({ signInAnonymously: vi.fn() }));
vi.mock('../firebase/client', () => ({ rtdb: {}, auth: {} }));
vi.mock('firebase/database', () => ({
  // `ref` zwraca ścieżkę jako identyfikator — po niej rozpoznajemy węzeł.
  ref: (_db: unknown, path: string) => ({ path }),
  onValue: (r: { path: string }, cb: (snap: { val: () => unknown }) => void) => {
    if (r.path === '.info/connected') connectedCb = cb;
    return () => {
      connectedCb = null;
    };
  },
  onDisconnect: (r: { path: string }) => ({
    set: (v: unknown) => {
      onDisconnectSet(r.path, v);
      return Promise.resolve();
    },
    cancel: () => {
      onDisconnectCancel(r.path);
      return Promise.resolve();
    },
  }),
  set: (r: { path: string }, value: unknown) => {
    setCalls.push({ path: r.path, value });
    return Promise.resolve();
  },
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: () => 0,
}));

const { trackPresence } = await import('./room');

/** Pozwala domknąć łańcuch `onDisconnect().set().then(...)` (mikrozadania). */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const ONLINE_PATH = 'rooms/ABCD/players/u1/online';
const onlineTrues = () =>
  setCalls.filter((c) => c.path === ONLINE_PATH && c.value === true).length;

beforeEach(() => {
  connectedCb = null;
  setCalls.length = 0;
  onDisconnectSet.mockClear();
  onDisconnectCancel.mockClear();
});

describe('obecność gracza przetrwa ponowne połączenie', () => {
  it('po każdym (ponownym) połączeniu znów zapisuje online:true i zbroi onDisconnect', async () => {
    const stop = trackPresence('ABCD', 'u1');

    // Bez nasłuchu `.info/connected` w ogóle nie ma jak wykryć powrotu sieci —
    // to sedno buga.
    expect(connectedCb).toBeTypeOf('function');

    // Pierwsze połączenie: online:true + zbrojenie obietnicy rozłączenia.
    connectedCb!({ val: () => true });
    await flush();
    expect(onlineTrues()).toBe(1);
    expect(onDisconnectSet).toHaveBeenCalledTimes(1);

    // Chwilowe rozłączenie — nic nie zapisujemy z tej strony.
    connectedCb!({ val: () => false });
    await flush();
    expect(onlineTrues()).toBe(1);

    // Ponowne połączenie — TU był bug: stary kod nie zapisywał true drugi raz,
    // więc gracz zostawał „poza grą".
    connectedCb!({ val: () => true });
    await flush();
    expect(onlineTrues()).toBe(2);
    expect(onDisconnectSet).toHaveBeenCalledTimes(2);

    stop();
  });

  it('wyjście z pokoju odpina nasłuch i nie odtwarza wpisu-widma', async () => {
    const stop = trackPresence('ABCD', 'u1');
    connectedCb!({ val: () => true });
    await flush();

    stop();

    // Nasłuch odpięty — reconnect po wyjściu nie wraca do tego pokoju.
    expect(connectedCb).toBeNull();
    // Nie zapisujemy tu `online:false` ręcznie: dla wyrzuconego gracza
    // odtworzyłoby to skasowany węzeł jako wpis-widmo `{online:false}`.
    expect(
      setCalls.some((c) => c.path === ONLINE_PATH && c.value === false),
    ).toBe(false);
  });

  it('zapis online:true po sprzątnięciu nie wraca (wyścig reconnectu z wyjściem)', async () => {
    const stop = trackPresence('ABCD', 'u1');

    // Połączenie wróciło, ale zanim domknie się łańcuch obietnicy — wychodzimy.
    connectedCb!({ val: () => true });
    stop();
    await flush();

    // Gracz, który wyszedł, nie może zostać „wskrzeszony" jako online.
    expect(onlineTrues()).toBe(0);
  });
});
