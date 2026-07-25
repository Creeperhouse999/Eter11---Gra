import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { GameState } from '../engine/types';
import type { Room } from './types';

/**
 * Regresja: w grze online okno Czarnego Łabędzia mógł zamknąć tylko gracz,
 * którego była kolej.
 *
 * `pendingSwanEvents` to stan WSPÓŁDZIELONY — okno (BlackSwanBanner) widzą
 * wszyscy klienci i blokuje ono kliknięcia pod spodem (jest modalne). Zamknięcie
 * szło jednak zwykłą ścieżką ruchu tury (`if (!myTurn) return 'To nie Twoja
 * kolej.'`), więc gracz NIE na kolejce — a często to właśnie on dobrał Łabędzia,
 * bo karta wchodzi w chwili dobrania niezależnie od tury — klikał „Rozumiem",
 * dostawał ciche odrzucenie i zostawał z zablokowanym oknem, dopóki aktywny
 * gracz nie zamknął go za niego. Czyszczenie kolejki jest idempotentne i
 * niezależne od tury, więc każdy gracz w pokoju musi móc zamknąć okno (liczone
 * w transakcji, jak ruch podsumowania — równoległe zamknięcia się nie nadpisują).
 */

let emit: ((room: Room | null) => void) | null = null;
const commitSummaryMove = vi.fn(
  async (_code: string, _uid: string, _action: unknown): Promise<string | null> => null,
);
const commitMove = vi.fn(
  async (_code: string, _uid: string, _next: unknown, _action: unknown): Promise<void> => {},
);

vi.mock('./room', () => ({
  watchRoom: vi.fn((_code: string, onChange: (room: Room | null) => void) => {
    emit = onChange;
    return () => {
      emit = null;
    };
  }),
  playersInOrder: (room: Room) => Object.values(room.players ?? {}),
  revealerUid: (room: Room) =>
    Object.values(room.players ?? {}).find((p) => p.online)?.uid,
  commitMove: (code: string, uid: string, next: unknown, action: unknown) =>
    commitMove(code, uid, next, action),
  commitMoveAsHost: vi.fn(),
  commitReveal: vi.fn(),
  commitSummaryMove: (code: string, uid: string, action: unknown) =>
    commitSummaryMove(code, uid, action),
  clearOffer: vi.fn(),
  offerCard: vi.fn(),
  sendReaction: vi.fn(),
  setReady: vi.fn(),
  kickPlayer: vi.fn(),
  startGame: vi.fn(),
  trackPresence: vi.fn(() => () => {}),
}));

const { useRoom } = await import('./useRoom');

/** Pokój w trwającej misji z wiszącym oknem Czarnego Łabędzia; aktywny = order[activeIndex]. */
const swanRoom = (activeIndex: number): Room =>
  ({
    code: 'ABCD',
    phase: 'playing',
    hostUid: 'p1',
    players: {
      p1: { uid: 'p1', name: 'Ala', characterId: 'c1', online: true, ready: true, joinedAt: 1 },
      p2: { uid: 'p2', name: 'Bo', characterId: 'c2', online: true, ready: true, joinedAt: 2 },
    },
    // playersInOrder = [p1, p2]; activePlayerIndex wskazuje, czyj ruch.
    state: {
      phase: 'mission',
      activePlayerIndex: activeIndex,
      players: [],
      mission: {
        pendingSwanEvents: [
          { playerId: 'p2', playerName: 'Bo', cardName: 'Kryzys', kind: 'extraProblem', applied: true },
        ],
      },
    } as unknown as GameState,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 0,
  }) as Room;

beforeEach(() => {
  emit = null;
  commitSummaryMove.mockClear();
  commitMove.mockClear();
});

describe('useRoom — zamknięcie okna Czarnego Łabędzia online', () => {
  it('gracz NIE na kolejce może zamknąć okno (to on dobrał Łabędzia)', async () => {
    // Aktywny jest p1 (order[0]); okno zamyka p2, który nie jest na kolejce.
    const { result } = renderHook(() => useRoom('ABCD', 'p2'));
    act(() => {
      emit?.(swanRoom(0));
    });

    let ret: string | null = 'nieustawione';
    await act(async () => {
      ret = await result.current.dispatch({ type: 'DISMISS_SWAN_EVENTS' });
    });

    // Przed poprawką: 'To nie Twoja kolej.' i żadnego zapisu — okno wisiało.
    expect(ret).toBeNull();
    expect(commitSummaryMove).toHaveBeenCalledTimes(1);
  });

  it('aktywny gracz zamyka okno tą samą ścieżką transakcji (bez wyścigu)', async () => {
    const { result } = renderHook(() => useRoom('ABCD', 'p1'));
    act(() => {
      emit?.(swanRoom(0));
    });

    let ret: string | null = 'nieustawione';
    await act(async () => {
      ret = await result.current.dispatch({ type: 'DISMISS_SWAN_EVENTS' });
    });

    expect(ret).toBeNull();
    expect(commitSummaryMove).toHaveBeenCalledTimes(1);
    // Nie idzie już przez gołe `commitMove` (pre-baked stan bez przeliczenia).
    expect(commitMove).not.toHaveBeenCalled();
  });
});
