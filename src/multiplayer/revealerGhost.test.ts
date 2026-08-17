import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Room } from './types';

/**
 * Regresja: `revealerUid` liczy wyznaczonego gracza z SUROWEGO `room`
 * w trzech miejscach (`commitSummaryMove`, `commitMoveAsHost`, `commitReveal`),
 * bez przepuszczenia przez `hydrateRoom` — inaczej niż `order` w tych samych
 * (i sąsiednich) funkcjach, które hydratują świadomie (patrz commitMove.test.ts,
 * hostSkip.test.ts).
 *
 * Wpis-widmo zwykle ma `online: false` (tak odtwarza go spóźniony
 * `onDisconnect` po `kickPlayer`) i `revealerUid` go naturalnie omija —
 * dlatego te trzy miejsca przechodziły dotąd niezauważone. Ale
 * `trackPresence` (patrz room.ts) przy KAŻDYM reconnect najpierw zbroi
 * `onDisconnect(false)`, a POTEM zapisuje `online: true` — gdyby to drugie
 * zapisało się tuż po tym, jak `kickPlayer` skasował węzeł (reconnect
 * wyrzuconego gracza, zanim jego klient zdążył zareagować na kick), widmo na
 * chwilę ma `online: true`. Wtedy `revealerUid` bez hydratacji potrafi
 * znaleźć WŁAŚNIE to widmo (jego `uid` to `undefined`) zamiast prawdziwego
 * pierwszego-online gracza — żaden prawdziwy uid nigdy nie zrówna się z
 * `undefined`, więc odkrycie problemu, zamknięcie podsumowania i automatyczny
 * skip odrzucają się na stałe, dopóki widmo nie wróci do `online: false`.
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

const { commitReveal, commitSummaryMove, commitMoveAsHost } = await import('./room');
const { setupGame } = await import('../ui/useGame');
const { reduce } = await import('../engine/reducer');

// Widmo wstawione PRZED prawdziwymi graczami: `joinedAt` brak → porównanie
// z liczbą daje NaN, sort (stabilny) zostawia widmo na pierwszym miejscu.
const ghost = { online: true } as unknown as Room['players'][string];

describe('revealerUid bez hydratacji — widmo z online:true przejmuje pierwszeństwo', () => {
  beforeEach(() => {
    currentRoom = null;
    lastResult = null;
  });

  it('commitReveal: prawdziwy pierwszy-online gracz mimo widma wciąż odkrywa problem', async () => {
    const state = setupGame(
      [
        { id: 'p1', name: 'Ala', characterId: 'ch-odkrywca' },
        { id: 'p2', name: 'Bo', characterId: 'ch-odkrywca' },
      ],
      7,
    );
    currentRoom = {
      code: 'ABCD',
      phase: 'playing',
      hostUid: 'p1',
      players: {
        widmo: ghost,
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

    const rejection = await commitReveal('ABCD', 'p1');

    expect(rejection).toBeNull();
    expect(lastResult?.state?.phase).toBe('mission');
  });

  it('commitSummaryMove: wyznaczony gracz mimo widma wciąż zamyka podsumowanie', async () => {
    let state = setupGame(
      [
        { id: 'p1', name: 'Ala', characterId: 'ch-odkrywca' },
        { id: 'p2', name: 'Bo', characterId: 'ch-odkrywca' },
      ],
      7,
    );
    state = reduce(state, { type: 'START_MISSION' }).state;
    currentRoom = {
      code: 'ABCD',
      phase: 'playing',
      hostUid: 'p1',
      players: {
        widmo: ghost,
        p1: { uid: 'p1', name: 'Ala', characterId: 'ch-odkrywca', online: true, ready: true, joinedAt: 1 },
        p2: { uid: 'p2', name: 'Bo', characterId: 'ch-odkrywca', online: true, ready: true, joinedAt: 2 },
      },
      state: { ...state, phase: 'missionSummary' },
      lastAction: null,
      turnStartedAt: 0,
      reactions: [],
      offer: null,
      createdAt: 0,
    };

    const rejection = await commitSummaryMove('ABCD', 'p1', { type: 'END_MISSION_SUMMARY' });

    expect(rejection).toBeNull();
    expect(lastResult?.state?.phase).not.toBe('missionSummary');
  });

  it('commitMoveAsHost: koordynator mimo widma wciąż spasowuje rozłączonego', async () => {
    let state = setupGame(
      [
        { id: 'p1', name: 'Ala', characterId: 'ch-odkrywca' },
        { id: 'p2', name: 'Bo', characterId: 'ch-odkrywca' },
      ],
      7,
    );
    state = reduce(state, { type: 'START_MISSION' }).state;
    state = { ...state, activePlayerIndex: 1 }; // aktywny p2, ale jest offline
    currentRoom = {
      code: 'ABCD',
      phase: 'playing',
      hostUid: 'p1',
      players: {
        widmo: ghost,
        p1: { uid: 'p1', name: 'Ala', characterId: 'ch-odkrywca', online: true, ready: true, joinedAt: 1 },
        p2: { uid: 'p2', name: 'Bo', characterId: 'ch-odkrywca', online: false, ready: true, joinedAt: 2 },
      },
      state,
      lastAction: null,
      turnStartedAt: 0,
      reactions: [],
      offer: null,
      createdAt: 0,
    };

    await commitMoveAsHost('ABCD', 'p1', 'p2', { type: 'PASS', playerId: 'p2' });

    expect(lastResult?.lastAction).toEqual({ type: 'PASS', playerId: 'p2' });
    expect(lastResult?.state?.activePlayerIndex).not.toBe(1);
  });
});
