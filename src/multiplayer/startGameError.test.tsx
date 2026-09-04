import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import type { Room, RoomPlayer } from './types';

/**
 * „Zaczynamy" w poczekalni gospodarza nie może zawiesić się bez śladu.
 *
 * `start()` w `Multiplayer.tsx` zapisuje stan gry przez `startGame` (RTDB) bez
 * try/catch. Wywołanie idzie przez `onStart={() => void start()}` — odrzucony
 * zapis (reguły, sieć) stawał się niezłapanym odrzuceniem obietnicy: gospodarz
 * klikał „Zaczynamy", nic się nie działo, żadnego komunikatu, gra się nie
 * zaczynała. Zgłoszenie „Nie da się grać w 2 graczy" opisuje dokładnie to.
 */

const players: Record<string, RoomPlayer> = {
  host1: { uid: 'host1', name: 'Host', characterId: 'ch-odkrywca', online: true, ready: false, joinedAt: 1 },
  guest2: { uid: 'guest2', name: 'Gość', characterId: 'ch-artysta', online: true, ready: false, joinedAt: 2 },
};

const lobbyRoom: Room = {
  code: 'ABCD',
  phase: 'lobby',
  hostUid: 'host1',
  players,
  state: null,
  lastAction: null,
  turnStartedAt: 0,
  reactions: [],
  offer: null,
  createdAt: 0,
};

vi.mock('./room', () => ({
  createRoom: vi.fn(async () => ({ code: 'ABCD', uid: 'host1' })),
  joinRoom: vi.fn(),
  watchRoom: (_code: string, cb: (r: Room) => void) => {
    cb(lobbyRoom);
    return () => {};
  },
  trackPresence: () => () => {},
  playersInOrder: (room: Room) => Object.values(room.players ?? {}).sort((a, b) => a.joinedAt - b.joinedAt),
  revealerUid: (room: Room) =>
    Object.values(room.players ?? {})
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .find((p) => p.online)?.uid,
  startGame: vi.fn(async () => {
    throw new Error('PERMISSION_DENIED: rooms/ABCD');
  }),
  setCharacter: vi.fn(),
  leaveRoom: vi.fn(),
  kickPlayer: vi.fn(),
  offerCard: vi.fn(),
  clearOffer: vi.fn(),
  commitMove: vi.fn(),
  commitMoveAsHost: vi.fn(),
  commitReveal: vi.fn(),
  commitSummaryMove: vi.fn(),
  sendReaction: vi.fn(),
  setReady: vi.fn(),
}));

const { Multiplayer } = await import('./Multiplayer');

describe('Multiplayer — błąd rozpoczęcia gry', () => {
  it('gdy startGame odrzuci, gospodarz dostaje czytelny komunikat, nie ciszę', async () => {
    render(
      <ToastProvider>
        <Multiplayer content={BUILTIN_CONTENT} onExit={vi.fn()} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Załóż pokój' }));
    fireEvent.change(screen.getByPlaceholderText('Imię'), { target: { value: 'Host' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Załóż pokój' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const startButton = await screen.findByRole('button', { name: /Zaczynamy/ });
    expect((startButton as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      fireEvent.click(startButton);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Techniczny ślad Firebase NIE wychodzi na ekran; czytelny komunikat tak.
    expect(screen.queryByText(/PERMISSION_DENIED/)).toBeNull();
    expect(await screen.findByText(/Nie udało się rozpocząć gry/)).toBeTruthy();
  });
});
