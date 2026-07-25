import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Room } from './types';
import type { Card, GameState, SlotKey } from '../engine/types';

/**
 * Wisząca oferta przekazania karty NIE może przeżyć końca podsumowania.
 *
 * Przekazanie odbywa się w fazie `missionSummary`: dający proponuje kartę,
 * biorący przyjmuje w oknie „Dostajesz kartę!". Oferta była czyszczona tylko
 * przy przyjęciu/odrzuceniu — gdy biorący ją zignorował, a ktoś kliknął „Dalej"
 * (END_MISSION_SUMMARY), zostawała w `room.offer` i wyskakiwała w KOLEJNEJ misji
 * podczas normalnej gry. Przyjęcie dispatchowało wtedy SHARE_CARD poza fazą
 * podsumowania, a reduktor je odrzucał — dziecko dostawało okno, którego nie da
 * się domknąć sensownie. Poprawka: `commitSummaryMove` czyści ofertę przy
 * wyjściu z podsumowania.
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

function roomWith(state: GameState): Room {
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
    // p1 proponuje p2 kartę fill-0, ale p2 jej nie tknął.
    offer: { fromUid: 'p1', toUid: 'p2', cardId: 'fill-0', at: 0 },
    createdAt: 0,
  };
}

describe('commitSummaryMove — wisząca oferta na końcu podsumowania', () => {
  beforeEach(() => {
    currentRoom = null;
    lastResult = null;
  });

  it('END_MISSION_SUMMARY czyści niezaakceptowaną ofertę', async () => {
    currentRoom = roomWith(summaryState());
    expect(currentRoom.state!.phase).toBe('missionSummary');

    await commitSummaryMove('ABCD', 'p1', { type: 'END_MISSION_SUMMARY' });

    // Faza opuściła podsumowanie, a oferta zniknęła — nie wyskoczy w kolejnej misji.
    expect(lastResult?.state?.phase).not.toBe('missionSummary');
    expect(lastResult?.offer).toBeNull();
  });

  it('ruch pozostający w podsumowaniu NIE czyści oferty (wciąż można ją przyjąć)', async () => {
    const state = summaryState();
    const play = state.mission!.played.find((p) => p.card.id === 'fill-1');
    currentRoom = roomWith(state);

    await commitSummaryMove('ABCD', play!.playerId, {
      type: 'TAKE_CARD_TO_MAT', playerId: play!.playerId, cardId: 'fill-1',
    });

    expect(lastResult?.state?.phase).toBe('missionSummary');
    expect(lastResult?.offer).not.toBeNull();
  });
});
