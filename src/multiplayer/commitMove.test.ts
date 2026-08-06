import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Room } from './types';
import type { GameState } from '../engine/types';

/**
 * `commitMove` to główny bezpiecznik tury w grze online: nowy stan zapisuje
 * WYŁĄCZNIE gracz, którego jest kolej. Bez tego ktoś mógłby nadpisać planszę
 * poza swoją turą (oszustwo albo desync przy zamieszaniu na łączu). Ten test
 * pilnuje samej reguły — w oderwaniu od RTDB, na zamockowanej transakcji.
 */

let currentRoom: Room | null = null;
let lastResult: Room | null = null;

vi.mock('firebase/auth', () => ({ signInAnonymously: vi.fn() }));
vi.mock('../firebase/client', () => ({ rtdb: {}, auth: {} }));
vi.mock('firebase/database', () => ({
  ref: () => ({}),
  runTransaction: async (_ref: unknown, updater: (r: Room | null) => Room | null) => {
    lastResult = updater(currentRoom);
    return { committed: true, snapshot: { val: () => lastResult } };
  },
  get: vi.fn(),
  onDisconnect: vi.fn(),
  onValue: vi.fn(),
  remove: vi.fn(),
  serverTimestamp: () => 0,
  set: vi.fn(),
  update: vi.fn(),
}));

const { commitMove } = await import('./room');
const { setupGame } = await import('../ui/useGame');
const { reduce } = await import('../engine/reducer');

/** Stan w trakcie misji, w którym aktywny jest gracz o indeksie `activeIndex`. */
function missionState(activeIndex: number): GameState {
  let state = setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: 'ch-odkrywca' },
      { id: 'p2', name: 'Bo', characterId: 'ch-odkrywca' },
    ],
    7,
  );
  state = reduce(state, { type: 'START_MISSION' }).state;
  return { ...state, activePlayerIndex: activeIndex };
}

// `playersInOrder` sortuje po joinedAt, więc order = [p1 (1), p2 (2)].
function roomWith(state: GameState, phase: Room['phase'] = 'playing'): Room {
  return {
    code: 'ABCD',
    phase,
    hostUid: 'p1',
    players: {
      p1: { uid: 'p1', name: 'Ala', characterId: 'ch-odkrywca', online: true, ready: true, joinedAt: 1 },
      p2: { uid: 'p2', name: 'Bo', characterId: 'ch-odkrywca', online: true, ready: true, joinedAt: 2 },
    },
    state,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 0,
  };
}

/** Znacznik, po którym poznajemy, że NASZ nowy stan naprawdę wszedł. */
function tagged(from: GameState): GameState {
  return { ...from, missionNumber: 42 };
}

const move = { type: 'PASS', playerId: 'p1' } as const;

describe('commitMove — bezpiecznik tury', () => {
  beforeEach(() => {
    currentRoom = null;
    lastResult = null;
  });

  it('gracz, którego jest kolej, zapisuje nowy stan', async () => {
    currentRoom = roomWith(missionState(0)); // aktywny p1 (order[0])
    await commitMove('ABCD', 'p1', tagged(currentRoom.state!), move);

    expect(lastResult?.lastAction).toEqual(move);
    expect(lastResult?.state?.missionNumber).toBe(42);
  });

  it('gracz spoza kolejki NIE zapisuje', async () => {
    currentRoom = roomWith(missionState(0)); // aktywny p1, a pisze p2
    await commitMove('ABCD', 'p2', tagged(currentRoom.state!), move);

    // Bez zmian — cudzy stan nie wchodzi.
    expect(lastResult?.lastAction).toBeNull();
    expect(lastResult?.state?.missionNumber).toBe(1);
  });

  it('drugi gracz na SWOJEJ turze zapisuje', async () => {
    currentRoom = roomWith(missionState(1)); // aktywny p2 (order[1])
    await commitMove('ABCD', 'p2', tagged(currentRoom.state!), move);

    expect(lastResult?.lastAction).toEqual(move);
    expect(lastResult?.state?.missionNumber).toBe(42);
  });

  it('poza fazą playing NIE zapisuje (np. w poczekalni)', async () => {
    currentRoom = roomWith(missionState(0), 'lobby');
    await commitMove('ABCD', 'p1', tagged(currentRoom.state!), move);

    expect(lastResult?.lastAction).toBeNull();
    expect(lastResult?.state?.missionNumber).toBe(1);
  });

  it('gdy pokój zniknął, nie wywala się i nic nie tworzy', async () => {
    currentRoom = null;
    await commitMove('ABCD', 'p1', missionState(0), move);
    expect(lastResult).toBeNull();
  });

  /**
   * Regresja: wpis-widmo (patrz hydrate.ts) w `room.players` zajmował slot
   * w `playersInOrder`, więc indeks aktywnego gracza wskazywał na widmo
   * zamiast na prawdziwego gracza — jego ruch był odrzucany na stałe, gra
   * wisiała bez żadnego komunikatu. Widmo powstaje, gdy `kickPlayer` kasuje
   * węzeł gracza, ale jego `onDisconnect(.../online).set(false)` wciąż jest
   * uzbrojone na starym łączu i strzela później, odtwarzając niepełny
   * wpis `{ online: false }` pod tym samym kluczem.
   */
  it('widmo po wyrzuconym graczu nie blokuje ruchu prawdziwego gracza', async () => {
    // W grze dwóch graczy (p1, p2 — tak jak buduje je `missionState`) aktywny
    // jest drugi: state.players[1].id === 'p2'.
    const state = missionState(1);
    currentRoom = {
      ...roomWith(state),
      players: {
        p1: { uid: 'p1', name: 'Ala', characterId: 'ch-odkrywca', online: true, ready: true, joinedAt: 1 },
        // Widmo: TRZECI, wcześniej wyrzucony gracz — jego onDisconnect
        // strzelił już PO `kickPlayer`, odtwarzając niepełny wpis pod jego
        // starym kluczem, bez uid/joinedAt.
        widmo: { online: false } as Room['players'][string],
        p2: { uid: 'p2', name: 'Bo', characterId: 'ch-odkrywca', online: true, ready: true, joinedAt: 3 },
      },
    };
    await commitMove('ABCD', 'p2', tagged(state), move);

    // Bez fixu: order = [p1, widmo, p2] (widmo zostaje na swoim miejscu
    // wstawienia — porównanie z joinedAt=undefined daje NaN) → order[1] to
    // widmo (uid undefined), więc ruch PRAWDZIWEGO drugiego gracza jest
    // odrzucany na stałe, bez żadnego komunikatu. Z fixem: widmo odsiane
    // przed liczeniem kolejności, order = [p1, p2] → order[1] to p2, ruch wchodzi.
    expect(lastResult?.lastAction).toEqual(move);
    expect(lastResult?.state?.missionNumber).toBe(42);
  });
});
