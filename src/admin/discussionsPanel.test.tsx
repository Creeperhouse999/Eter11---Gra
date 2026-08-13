import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import type { Discussion } from '../firebase/discussions';
import type { Role } from '../firebase/roles';

/**
 * Usuwanie wątku dyskusji.
 *
 * Reguły Firestore dopuszczają usunięcie wyłącznie adminowi (jestAdmin), tak
 * jak przy zgłoszeniach. Regresja: przycisk „Usuń" w wątku był NIEZABEZPIECZONY
 * — widział go też co-admin/edytor, klikał, reguły odrzucały zapis, a panel i
 * tak pokazywał „Wątek usunięty" i zamykał widok (fałszywe potwierdzenie).
 * Teraz przycisk bramkuje canDelete (jak ReportsPanel), a nieudane usunięcie
 * pokazuje błąd zamiast sukcesu.
 */

// Klient Firebase inicjalizuje się przy imporcie — atrapy, żeby panel dało się
// wyrenderować bez sieci. ImageUpload woła getStorage(app), więc też atrapa.
vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));
vi.mock('../firebase/upload', () => ({ uploadImage: vi.fn() }));

// Zespół i powiadomienia: panele nasłuchują listy członków (most podpis→konto)
// i wysyłają powiadomienia. W teście nie ma prawdziwej bazy, więc atrapy —
// bez nich `watchTeam` sięga do Firestore i test wywala się na starcie.
vi.mock("../firebase/roles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../firebase/roles")>();
  return { ...actual, watchTeam: (cb: (m: unknown[]) => void) => { cb([]); return () => {}; } };
});
vi.mock("../firebase/notifications", () => ({
  notify: vi.fn(async () => {}),
  uidsForAuthor: () => [],
}));


const deleteDiscussion = vi.fn(async (_id: string) => {});
const setDiscussionClosed = vi.fn(async (_id: string, _closed: boolean) => {});
const addMessage = vi.fn(async (..._args: unknown[]) => ({ ok: true }));
let thread: Discussion;

vi.mock('../firebase/discussions', async (importOriginal) => {
  // `canEditMessage` musi być PRAWDZIWA implementacja — test niżej sprawdza,
  // że panel przekazuje jej poprawny `authorUid`/`isAdmin`, więc atrapa, która
  // zawsze zwraca to samo, niczego by nie udowodniła.
  const actual = await importOriginal<typeof import('../firebase/discussions')>();
  return {
    ...actual,
    watchDiscussions: (cb: (d: Discussion[]) => void) => {
      cb([thread]);
      return () => {};
    },
    addDiscussion: vi.fn(async () => ({ ok: true })),
    addMessage: (discussion: Discussion, input: unknown) => addMessage(discussion, input),
    setDiscussionClosed: (id: string, closed: boolean) => setDiscussionClosed(id, closed),
    deleteDiscussion: (id: string) => deleteDiscussion(id),
  };
});

vi.mock('../firebase/reports', () => ({ addReport: vi.fn(async () => ({ ok: true })) }));

const { DiscussionsPanel } = await import('./DiscussionsPanel');

const makeThread = (): Discussion => ({
  id: 'd1',
  title: 'Wątek testowy',
  description: 'opis',
  author: 'Ala',
  createdAt: '2026-07-24T10:00:00.000Z',
  messages: [],
  closed: false,
});

const renderPanel = (role: Role, currentUid = 'u-tester') =>
  render(
    <ToastProvider>
      <DiscussionsPanel author="Tester" role={role} currentUid={currentUid} />
    </ToastProvider>,
  );

const openThread = () => {
  fireEvent.click(screen.getByText('Wątek testowy').closest('button')!);
};

beforeEach(() => {
  thread = makeThread();
  deleteDiscussion.mockClear();
  deleteDiscussion.mockResolvedValue(undefined);
  setDiscussionClosed.mockClear();
  setDiscussionClosed.mockResolvedValue(undefined);
  addMessage.mockClear();
  addMessage.mockResolvedValue({ ok: true });
});

/**
 * Wysłana wypowiedź musi nieść konto autora (`authorUid`).
 *
 * Regresja: `send()` wołał `addMessage` bez `authorUid`, więc KAŻDA nowa
 * wypowiedź lądowała bez konta właściciela — funkcja „popraw/usuń swoją
 * wypowiedź" (dodana w 3dc2f05) nigdy nie działała, bo `canEditMessage`
 * uznaje wypowiedź bez `authorUid` za niczyją (rusza ją tylko admin).
 */
describe('DiscussionsPanel — konto autora przy wysyłce', () => {
  it('wysłanie odpowiedzi zapisuje authorUid piszącego', async () => {
    renderPanel('coworker', 'u-tester');
    openThread();

    fireEvent.change(screen.getByLabelText('Twoja odpowiedź'), {
      target: { value: 'Nowa wypowiedź' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));

    expect(addMessage).toHaveBeenCalledTimes(1);
    const [, input] = addMessage.mock.calls[0] as [Discussion, { authorUid?: string }];
    expect(input.authorUid).toBe('u-tester');
  });
});

/**
 * `programmer` ma te same prawa co `admin` wszędzie indziej w aplikacji
 * (`roles.ts`: `canDelete`, reguła Firestore `jestAdmin()`). Regresja:
 * przełącznik „czy ruszyć cudzą wypowiedź" w DiscussionsPanel porównywał
 * rolę literalnie z `'admin'`, więc programista (Claude) nie widział
 * przycisków przy CUDZYCH wypowiedziach, mimo że reguły na to pozwalają.
 */
describe('DiscussionsPanel — moderacja cudzych wypowiedzi', () => {
  it('programmer rusza cudzą wypowiedź, tak jak admin', () => {
    thread = { ...makeThread(), messages: [
      { author: 'Ktoś Inny', authorUid: 'u-inny', text: 'cudza treść', at: '2026-08-01T00:00:00.000Z' },
    ] };
    renderPanel('programmer', 'u-tester');
    openThread();

    expect(screen.getByRole('button', { name: 'Popraw wypowiedź Ktoś Inny' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Usuń wypowiedź Ktoś Inny' })).toBeTruthy();
  });

  it('coworker NIE rusza cudzej wypowiedzi', () => {
    thread = { ...makeThread(), messages: [
      { author: 'Ktoś Inny', authorUid: 'u-inny', text: 'cudza treść', at: '2026-08-01T00:00:00.000Z' },
    ] };
    renderPanel('coworker', 'u-tester');
    openThread();

    expect(screen.queryByRole('button', { name: 'Popraw wypowiedź Ktoś Inny' })).toBeNull();
  });
});

describe('DiscussionsPanel — usuwanie wątku', () => {
  it('co-admin nie widzi przycisku „Usuń" (usuwać może tylko admin)', () => {
    renderPanel('co-admin');
    openThread();
    // Bez fixu: przycisk był niezabezpieczony i pojawiał się dla każdej roli.
    expect(screen.queryByRole('button', { name: 'Usuń' })).toBeNull();
  });

  it('admin widzi przycisk „Usuń"', () => {
    renderPanel('admin');
    openThread();
    expect(screen.getByRole('button', { name: 'Usuń' })).toBeTruthy();
  });

  it('gdy usunięcie się nie powiedzie, pokazuje błąd zamiast fałszywego „usunięto"', async () => {
    deleteDiscussion.mockRejectedValueOnce(new Error('permission denied'));
    renderPanel('admin');
    openThread();

    fireEvent.click(screen.getByRole('button', { name: 'Usuń' }));
    const dialog = await screen.findByRole('dialog', { name: 'Usunąć wątek?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Usuń' }));

    expect(await screen.findByText(/Nie udało się usunąć/i)).toBeTruthy();
    // Bez fixu: „Wątek usunięty." mimo odrzuconego zapisu.
    expect(screen.queryByText('Wątek usunięty.')).toBeNull();
  });
});

/**
 * Zamykanie/otwieranie wątku („Ustalone" / „Otwórz ponownie").
 *
 * Regresja: w odróżnieniu od `remove` w tym samym pliku, przycisk wołał
 * `setDiscussionClosed` z `void ...(...)` bez try/catch ani toasta — dokładnie
 * ten sam rodzaj fałszywej ciszy, przed którym broni `remove` (komentarz przy
 * `remove`: „Wzór jak w ReportsPanel.remove"), tylko nieprzeniesiony na tę
 * ścieżkę. Odrzucony zapis (reguły, wygasła sesja) nie dawał wtedy żadnego
 * sygnału — admin klikał „Ustalone" i nic się nie działo, bez wyjaśnienia.
 */
describe('DiscussionsPanel — zamykanie wątku', () => {
  it('nieudane zamknięcie wątku pokazuje błąd, nie ciszę', async () => {
    setDiscussionClosed.mockRejectedValueOnce(new Error('permission denied'));
    renderPanel('admin');
    openThread();

    fireEvent.click(screen.getByRole('button', { name: 'Ustalone' }));

    expect(await screen.findByText(/nie udało się/i)).toBeTruthy();
  });

  it('udane zamknięcie wątku nie pokazuje błędu', async () => {
    renderPanel('admin');
    openThread();

    fireEvent.click(screen.getByRole('button', { name: 'Ustalone' }));

    expect(setDiscussionClosed).toHaveBeenCalledWith('d1', true);
    expect(screen.queryByText(/nie udało się/i)).toBeNull();
  });
});
