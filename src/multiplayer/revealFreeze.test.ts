import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Room } from './types';
import type { GameState } from '../engine/types';

/**
 * Odkrycie kolejnego problemu między misjami (faza `setup`) NIE może zależeć
 * od obecności hosta.
 *
 * W fazie `setup` `activePlayerIndex` stoi na 0, więc „turę" ma tylko pierwszy
 * gracz w kolejności (host). Gdy host rozłączy się właśnie między misjami,
 * nikt inny nie mógł odkryć problemu (START_MISSION przechodził jedynie dla
 * order[0]), a automatyczny skip liczy sam host i dotyczy tylko fazy `playing`.
 * Pokój wisiał na „Czekaj, aż host odkryje problem" bez ratunku.
 *
 * Poprawka: rewelatorem jest PIERWSZY ONLINE gracz — gdy host padł, przejmuje
 * kolejny obecny. `commitReveal` przelicza ruch w transakcji i autoryzuje
 * tylko tego jednego gracza, więc dwóch gości nie odkryje problemu naraz.
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

const { commitReveal } = await import('./room');
const { setupGame } = await import('../ui/useGame');

/** Stan między misjami: faza `setup`, jeszcze bez odkrytego problemu. */
function setupState(): GameState {
  return setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: 'ch-odkrywca' },
      { id: 'p2', name: 'Bo', characterId: 'ch-odkrywca' },
      { id: 'p3', name: 'Cyprian', characterId: 'ch-odkrywca' },
    ],
    7,
  );
}

function roomWith(online: { p1: boolean; p2: boolean; p3: boolean }): Room {
  return {
    code: 'ABCD',
    phase: 'playing',
    hostUid: 'p1',
    players: {
      p1: { uid: 'p1', name: 'Ala', characterId: 'ch-odkrywca', online: online.p1, ready: true, joinedAt: 1 },
      p2: { uid: 'p2', name: 'Bo', characterId: 'ch-odkrywca', online: online.p2, ready: true, joinedAt: 2 },
      p3: { uid: 'p3', name: 'Cyprian', characterId: 'ch-odkrywca', online: online.p3, ready: true, joinedAt: 3 },
    },
    state: setupState(),
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 0,
  };
}

describe('commitReveal — odkrycie problemu między misjami', () => {
  beforeEach(() => {
    currentRoom = null;
    lastResult = null;
  });

  it('host (order[0], online) odkrywa problem — gra rusza do misji', async () => {
    currentRoom = roomWith({ p1: true, p2: true, p3: true });
    const rejection = await commitReveal('ABCD', 'p1');

    expect(rejection).toBeNull();
    expect(lastResult?.state?.phase).toBe('mission');
    expect(lastResult?.lastAction).toEqual({ type: 'START_MISSION' });
  });

  it('gość NIE odkrywa, dopóki host jest online', async () => {
    currentRoom = roomWith({ p1: true, p2: true, p3: true });
    await commitReveal('ABCD', 'p2');

    // Bez zmian — rewelatorem jest wciąż obecny host.
    expect(lastResult?.state?.phase).toBe('setup');
    expect(lastResult?.lastAction).toBeNull();
  });

  it('gdy host padł, PIERWSZY ONLINE gość odkrywa problem — pokój nie wisi', async () => {
    // Host (p1) offline między misjami; wcześniej pokój zawieszał się na stałe.
    currentRoom = roomWith({ p1: false, p2: true, p3: true });
    const rejection = await commitReveal('ABCD', 'p2');

    expect(rejection).toBeNull();
    expect(lastResult?.state?.phase).toBe('mission');
    expect(lastResult?.lastAction).toEqual({ type: 'START_MISSION' });
  });

  it('gdy host padł, gość NIE będący pierwszym online nie odkrywa (brak wyścigu)', async () => {
    // Host offline, ale p2 też — rewelatorem jest p2? nie: p2 offline, więc p3.
    // Sprawdzamy, że p3 (pierwszy online) działa, a nie-pierwszy nie.
    currentRoom = roomWith({ p1: false, p2: false, p3: true });

    // p1 (offline, nie pierwszy online) nie może.
    await commitReveal('ABCD', 'p1');
    expect(lastResult?.state?.phase).toBe('setup');
    expect(lastResult?.lastAction).toBeNull();

    // p3 (pierwszy online) może.
    currentRoom = roomWith({ p1: false, p2: false, p3: true });
    const rejection = await commitReveal('ABCD', 'p3');
    expect(rejection).toBeNull();
    expect(lastResult?.state?.phase).toBe('mission');
  });
});
