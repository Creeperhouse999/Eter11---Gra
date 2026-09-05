import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Room } from './types';
import type { GameState } from '../engine/types';

/**
 * Auto-skip rozłączonego gracza patrzył tylko na `room.phase` (faza POKOJU:
 * 'lobby'/'playing'/'finished', trwa 'playing' przez całą partię), nie na
 * `room.state.phase` (faza STANU GRY: 'setup'/'mission'/'missionSummary'/
 * 'finale'). W 'setup' i 'missionSummary' `activePlayerIndex` to resztka
 * z poprzedniej misji — koordynator odpalał zbędną transakcję PASS za
 * każdym razem, gdy ten przestarzały „aktywny" gracz był offline, mimo że
 * nikt na nikogo w tej fazie nie czeka. Reduktor by ją i tak odrzucił (poza
 * 'mission' nie ma czyjej kolei), ale to niepotrzebny zapis przy każdym
 * wejściu na ekran poczekalni/podsumowania.
 */

let emit: ((room: Room | null) => void) | null = null;
const commitMoveAsHost = vi.fn(
  async (_code: string, _hostUid: string, _skippedUid: string, _action: unknown) => undefined,
);

vi.mock('./room', () => ({
  watchRoom: vi.fn((_code: string, onChange: (room: Room | null) => void) => {
    emit = onChange;
    return () => {
      emit = null;
    };
  }),
  playersInOrder: (room: Room) =>
    Object.values(room.players ?? {}).sort((a, b) => a.joinedAt - b.joinedAt),
  revealerUid: (room: Room) =>
    Object.values(room.players ?? {}).find((p) => p.online)?.uid,
  commitMove: vi.fn(),
  commitMoveAsHost: (code: string, hostUid: string, skippedUid: string, action: unknown) =>
    commitMoveAsHost(code, hostUid, skippedUid, action),
  commitSummaryMove: vi.fn(),
  clearOffer: vi.fn(),
  offerCard: vi.fn(),
  sendReaction: vi.fn(),
  setReady: vi.fn(),
  kickPlayer: vi.fn(),
  startGame: vi.fn(),
  trackPresence: vi.fn(() => () => {}),
}));

const { useRoom } = await import('./useRoom');

/** Pokój z aktywnym, ale offline graczem na indeksie 1 (Bo) — deadline dawno minął. */
function roomWith(statePhase: GameState['phase']): Room {
  return {
    code: 'ABCD',
    phase: 'playing',
    hostUid: 'p1',
    players: {
      p1: { uid: 'p1', name: 'Ala', characterId: 'c1', online: true, ready: true, joinedAt: 1 },
      p2: { uid: 'p2', name: 'Bo', characterId: 'c2', online: false, ready: true, joinedAt: 2 },
    },
    // `players` (silnika) niesie teraz aktywnego gracza — `useRoom` liczy
    // aktywnego z TEJ listy (`aktywnyUid`, patrz `turnOwner.ts`), tak samo
    // jak ekran misji, nie z osobnej kolejności pokoju.
    state: {
      phase: statePhase,
      activePlayerIndex: 1,
      players: [{ id: 'p1' }, { id: 'p2' }],
    } as unknown as GameState,
    lastAction: null,
    turnStartedAt: 0, // deadline (turnStartedAt + 60s) dawno w przeszłości
    reactions: [],
    offer: null,
    createdAt: 0,
  } as Room;
}

beforeEach(() => {
  emit = null;
  commitMoveAsHost.mockClear();
});

describe('useRoom — auto-skip patrzy na fazę STANU GRY, nie fazę pokoju', () => {
  it('NIE strzela w setup/missionSummary — activePlayerIndex to resztka z poprzedniej misji', async () => {
    // uid = 'p1' — pierwszy obecny gracz, więc to on jest koordynatorem.
    renderHook(() => useRoom('ABCD', 'p1'));
    await act(async () => {
      emit?.(roomWith('missionSummary'));
    });

    expect(commitMoveAsHost).not.toHaveBeenCalled();
  });

  it('wciąż strzela w fazie mission — offline gracz na kolejce ma zostać spasowany', async () => {
    renderHook(() => useRoom('ABCD', 'p1'));
    await act(async () => {
      emit?.(roomWith('mission'));
    });

    expect(commitMoveAsHost).toHaveBeenCalledTimes(1);
  });
});
