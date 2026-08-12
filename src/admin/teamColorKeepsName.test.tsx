import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import type { TeamMember } from '../firebase/roles';

/**
 * Regresja: zapis koloru kasował imię ustawione chwilę wcześniej.
 *
 * `setRole` zapisuje CAŁY dokument roli (bez `merge`) — tak ma być, inaczej
 * nie dałoby się skasować koloru. Ale wybór koloru zapisuje się dopiero po
 * pół sekundy od ostatniego drgnięcia suwaka, a do zapisu szedł ten wpis
 * osoby, który był na ekranie w chwili KLIKNIĘCIA. Gdy w tym półsekundowym
 * okienku admin zdążył zapisać imię, opóźniony zapis koloru niósł wpis
 * jeszcze bez imienia i przywracał stan sprzed zmiany: pole „Imię" pustoszało,
 * a podpisy tej osoby w wątkach wracały do adresu e-mail.
 */

const setRole = vi.fn(async (_m: TeamMember) => {});
let team: TeamMember[] = [];
// Wszyscy nasłuchujący, nie tylko ostatni: React montuje komponent dwa razy,
// więc zapamiętanie jednego callbacku trafiłoby w instancję inną niż ta, którą
// test klika, i nowa lista nigdy by do niej nie dotarła.
const listeners = new Set<(m: TeamMember[]) => void>();
const pushTeam = (next: TeamMember[]) => {
  team = next;
  listeners.forEach((cb) => cb(next));
};

vi.mock('../firebase/roles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/roles')>();
  return {
    ...actual,
    watchTeam: (cb: (m: TeamMember[]) => void) => {
      listeners.add(cb);
      cb(team);
      return () => listeners.delete(cb);
    },
    setRole: (m: TeamMember) => setRole(m),
    removeRole: vi.fn(),
  };
});

vi.mock('../firebase/accountRemovals', () => ({
  requestRemoval: vi.fn(async () => ({ ok: true })),
  watchRemovals: (cb: (items: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
}));

const { TeamPanel } = await import('./TeamPanel');

beforeEach(() => {
  setRole.mockClear();
  listeners.clear();
  // Bez `shouldAdvanceTime`: czas ma stać, dopóki sami go nie przesuniemy —
  // inaczej półsekundowy timer koloru odpala się sam, jeszcze zanim test
  // zdąży dostarczyć nową listę zespołu, i sprawdzałby nie tę kolejność.
  vi.useFakeTimers();
});

describe('TeamPanel — kolor nie kasuje imienia', () => {
  it('opóźniony zapis koloru niesie imię zapisane w międzyczasie', async () => {
    team = [
      { uid: 'me', email: 'admin@eter11.pl', role: 'admin' },
      { uid: 'other', email: 'kolega@eter11.pl', role: 'coworker' },
    ];
    render(
      <ToastProvider>
        <TeamPanel currentUid="me" />
      </ToastProvider>,
    );

    // Admin zmienia kolor kolegi — zapis czeka pół sekundy na spokój.
    // Pole koloru jest zwinięte; presety pokazują się po jego otwarciu.
    fireEvent.click(screen.getAllByLabelText(/^Kolor kolega@eter11.pl: /)[0]);
    fireEvent.click(screen.getAllByLabelText(/^Ustaw #/)[0]);

    // W tym samym okienku zapisuje się imię i lista zespołu przychodzi z bazy
    // już z imieniem — dokładnie jak przy prawdziwym `onSnapshot`.
    act(() => {
      pushTeam([
        { uid: 'me', email: 'admin@eter11.pl', role: 'admin' },
        { uid: 'other', email: 'kolega@eter11.pl', role: 'coworker', name: 'Marcin' },
      ]);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    const colorWrite = setRole.mock.calls.map(([m]) => m).find((m) => m.color);
    expect(colorWrite).toBeDefined();
    // Sedno: zapis koloru nie może cofnąć imienia do stanu sprzed zmiany.
    expect(colorWrite?.name).toBe('Marcin');
  });
});
