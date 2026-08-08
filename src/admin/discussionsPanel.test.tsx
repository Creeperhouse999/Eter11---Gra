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

const deleteDiscussion = vi.fn(async (_id: string) => {});
const setDiscussionClosed = vi.fn(async (_id: string, _closed: boolean) => {});
let thread: Discussion;

vi.mock('../firebase/discussions', () => ({
  watchDiscussions: (cb: (d: Discussion[]) => void) => {
    cb([thread]);
    return () => {};
  },
  addDiscussion: vi.fn(async () => ({ ok: true })),
  addMessage: vi.fn(async () => ({ ok: true })),
  setDiscussionClosed: (id: string, closed: boolean) => setDiscussionClosed(id, closed),
  deleteDiscussion: (id: string) => deleteDiscussion(id),
}));

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

const renderPanel = (role: Role) =>
  render(
    <ToastProvider>
      <DiscussionsPanel author="Tester" role={role} />
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
