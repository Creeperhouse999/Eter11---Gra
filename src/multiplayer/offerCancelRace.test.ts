import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Room } from './types';
import type { Card, GameState, SlotKey } from '../engine/types';

/**
 * Anulowanie oferty przekazania karty musi realnie zatrzymać przekazanie.
 *
 * `acceptOffer` (Multiplayer.tsx) czyta `room.offer` lokalnie i z niego buduje
 * akcję SHARE_CARD — ale `commitSummaryMove` liczy ruch WEWNĄTRZ transakcji,
 * na świeżym stanie z bazy, i nigdy nie sprawdzał, czy `room.offer` wciąż
 * istnieje i pasuje do akcji. Gdy dający kliknął „Anuluj propozycję"
 * (`clearOffer` — zwykłe `remove()`, nie transakcja) tuż przed tym, jak
 * biorący kliknął „Przyjmij", oferta w bazie znikała, ale transakcja biorącego
 * i tak przepuszczała SHARE_CARD — reduktor sprawdza tylko właściciela karty
 * i fazę misji, nie wie nic o `room.offer`. Karta przechodziła mimo
 * anulowania, wbrew temu, co widział dający.
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

const { commitSummaryMove } = await import('./room');
const { reduce } = await import('../engine/reducer');
const { newGame, giveCard, makeCard } = await import('../engine/testFixtures');

const FILL: Array<[Card['category'], SlotKey]> = [
  ['psychological', 'psychological'],
  ['digital', 'digital'],
  ['social', 'social'],
  ['mentor', 'mentor'],
  ['talent', 'talent'],
];

/** Podsumowanie wygranej misji z kartami zagranymi w tej misji. */
function summaryState(): GameState {
  let state = reduce(newGame(), { type: 'START_MISSION' }).state;
  const problemId = state.mission!.problems[0].id;
  FILL.forEach(([category, slotKey], index) => {
    const playerId = state.players[state.activePlayerIndex].id;
    const injected = makeCard(`fill-${index}`, category);
    state = giveCard(state, playerId, injected);
    state = reduce(state, {
      type: 'PLAY_CARD', playerId, cardId: injected.id, slotKey, problemId, fromMat: false,
    }).state;
  });
  return state;
}

function roomWith(state: GameState, offer: Room['offer']): Room {
  return {
    code: 'ABCD',
    phase: 'playing',
    hostUid: 'p1',
    players: {
      p1: { uid: 'p1', name: 'Ala', characterId: 'c1', online: true, ready: true, joinedAt: 1 },
      p2: { uid: 'p2', name: 'Bartek', characterId: 'c2', online: true, ready: true, joinedAt: 2 },
    },
    state,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer,
    createdAt: 0,
  };
}

describe('commitSummaryMove — SHARE_CARD po anulowaniu oferty', () => {
  beforeEach(() => {
    currentRoom = null;
    lastResult = null;
  });

  it('odrzuca przekazanie, gdy oferta w bazie już zniknęła (anulowana przez dającego)', async () => {
    // Oferta w bazie to null — dokładnie tak wygląda pokój, gdy `clearOffer`
    // zdążyło się zapisać, zanim doszła transakcja biorącego.
    currentRoom = roomWith(summaryState(), null);

    const rejection = await commitSummaryMove('ABCD', 'p2', {
      type: 'SHARE_CARD', fromPlayerId: 'p1', toPlayerId: 'p2', cardId: 'fill-0',
    });

    expect(rejection).not.toBeNull();
    // Karta nie mogła zostać przekazana mimo braku aktualnej oferty.
    expect(lastResult?.state?.mission?.sharedCardIds ?? []).not.toContain('fill-0');
  });

  it('odrzuca przekazanie, gdy w bazie wisi INNA oferta niż ta, którą przyjmuje biorący', async () => {
    // Dający zdążył anulować i zaproponować drugą kartę, zanim doszła stara
    // akcja SHARE_CARD wysłana na podstawie pierwszej oferty.
    currentRoom = roomWith(summaryState(), {
      fromUid: 'p1', toUid: 'p2', cardId: 'fill-1', at: 0,
    });

    const rejection = await commitSummaryMove('ABCD', 'p2', {
      type: 'SHARE_CARD', fromPlayerId: 'p1', toPlayerId: 'p2', cardId: 'fill-0',
    });

    expect(rejection).not.toBeNull();
    expect(lastResult?.state?.mission?.sharedCardIds ?? []).not.toContain('fill-0');
  });

  it('wciąż pozwala przyjąć kartę, gdy oferta w bazie pasuje do akcji', async () => {
    currentRoom = roomWith(summaryState(), {
      fromUid: 'p1', toUid: 'p2', cardId: 'fill-0', at: 0,
    });

    const rejection = await commitSummaryMove('ABCD', 'p2', {
      type: 'SHARE_CARD', fromPlayerId: 'p1', toPlayerId: 'p2', cardId: 'fill-0',
    });

    expect(rejection).toBeNull();
    expect(lastResult?.state?.mission?.sharedCardIds ?? []).toContain('fill-0');
  });
});
