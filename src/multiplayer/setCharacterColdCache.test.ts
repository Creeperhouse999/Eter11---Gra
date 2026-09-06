import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Room } from './types';

/**
 * Adam trzeci raz: „niestety dalej nie mogę wybierać innej postaci. Zrób
 * dokładną analizę i wróć, jak będzie działać".
 *
 * Analiza: `setCharacter` robił `runTransaction` na CAŁYM węźle pokoju. To ta
 * sama pułapka, która wcześniej psuła dołączanie (patrz
 * `joinRoomColdCache.test.ts`): przy pierwszym dotknięciu ścieżki RTDB woła
 * funkcję aktualizującą z `null`, bo lokalny cache jest pusty — choć pokój
 * naprawdę istnieje na serwerze. Kod trafiał wtedy na `if (!room?.players)
 * return room`, czyli zwracał `null`, transakcja kończyła się BEZ ZAPISU
 * i bez błędu.
 *
 * Z perspektywy gracza: klikam postać, nic się nie dzieje, żaden komunikat.
 * Dokładnie to opisywał Adam. Wcześniejsza poprawka dodała `.catch()` na
 * komunikat o błędzie — ale tu żadnego błędu nie było, więc nie mogła pomóc.
 *
 * Poprawka: piszemy WPROST do `players/<uid>/characterId`, bez transakcji na
 * całym pokoju. Reguły RTDB pozwalają graczowi zapisać własny węzeł
 * (`$uid === auth.uid`), a zajętość postaci sprawdzamy świeżym `get()`.
 */

vi.mock('../firebase/client', () => ({ rtdb: {}, auth: {} }));

let pokoj: Room | null = null;
const zapisy: Array<{ path: string; value: unknown }> = [];
/** Czy klient „zna" już tę ścieżkę — pierwsza transakcja dostaje `null`. */
let cieplyCache = false;

vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => ({ path }),
  get: async () => ({ exists: () => pokoj !== null, val: () => pokoj }),
  set: vi.fn(async (r: { path: string }, value: unknown) => {
    zapisy.push({ path: r.path, value });
    // Odwzoruj zapis w stanie „serwera", żeby test widział skutek.
    // Ścieżka: rooms/<kod>/players/<uid>/characterId
    const czesci = r.path.split('/');
    const uid = czesci[czesci.length - 2];
    if (r.path.endsWith('/characterId') && pokoj?.players?.[uid]) {
      pokoj.players[uid].characterId = value as string;
    }
  }),
  update: vi.fn(),
  remove: vi.fn(),
  onDisconnect: vi.fn(),
  onValue: vi.fn(),
  runTransaction: vi.fn(async (_ref: unknown, updateFn: (r: unknown) => unknown) => {
    // Wierne odwzorowanie: przy zimnym cache pierwszy przebieg dostaje `null`.
    const wynik = updateFn(cieplyCache ? pokoj : null);
    if (wynik !== undefined && wynik !== null) pokoj = wynik as Room;
  }),
}));

const { setCharacter } = await import('./room');

function pokojZ(gracze: Record<string, string>): Room {
  return {
    code: 'ABCD',
    hostUid: 'a',
    phase: 'lobby',
    players: Object.fromEntries(
      Object.entries(gracze).map(([uid, characterId]) => [
        uid,
        { uid, name: uid, characterId, online: true, ready: false, joinedAt: 1 },
      ]),
    ),
  } as unknown as Room;
}

beforeEach(() => {
  zapisy.length = 0;
  cieplyCache = false;
});

describe('zmiana postaci w poczekalni', () => {
  it('działa przy ZIMNYM cache — to była przyczyna „nic się nie dzieje"', async () => {
    pokoj = pokojZ({ a: 'c1', b: 'c2' });

    const ok = await setCharacter('ABCD', 'b', 'c3');

    expect(ok).toBe(true);
    expect(pokoj.players.b.characterId).toBe('c3');
  });

  it('nie pozwala wziąć postaci zajętej przez kogoś innego', async () => {
    pokoj = pokojZ({ a: 'c1', b: 'c2' });

    const ok = await setCharacter('ABCD', 'b', 'c1');

    expect(ok).toBe(false);
    expect(pokoj.players.b.characterId).toBe('c2');
  });

  it('wybranie własnej postaci ponownie nie jest kolizją', async () => {
    pokoj = pokojZ({ a: 'c1' });
    expect(await setCharacter('ABCD', 'a', 'c1')).toBe(true);
  });

  it('gracza spoza pokoju nie dopisuje', async () => {
    pokoj = pokojZ({ a: 'c1' });
    expect(await setCharacter('ABCD', 'obcy', 'c2')).toBe(false);
  });

  it('nieistniejący pokój kończy się odmową, nie wyjątkiem', async () => {
    pokoj = null;
    expect(await setCharacter('ABCD', 'a', 'c1')).toBe(false);
  });
});
