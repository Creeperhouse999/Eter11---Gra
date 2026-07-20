import { describe, it, expect } from 'vitest';
import { createGame, reduce, DEFAULT_CONFIG } from './reducer';
import { testDeck, testProblem } from './testFixtures';
import type { GameState } from './types';

const game = (): GameState =>
  createGame({
    players: [{ id: 'p1', name: 'Ala', characterId: 'c1' }],
    deck: testDeck(),
    problems: [testProblem('a'), testProblem('b'), testProblem('c'), testProblem('d')],
    seed: 3,
    config: DEFAULT_CONFIG,
  });

/** Rozgrywa misję do porażki: pasowanie przez wszystkie rundy. */
function loseMission(start: GameState): GameState {
  let state = reduce(start, { type: 'START_MISSION' }).state;
  let guard = 0;
  while (state.mission?.phase === 'playing' && guard < 100) {
    state = reduce(state, { type: 'PASS', playerId: 'p1' }).state;
    guard++;
  }
  return reduce(state, { type: 'END_MISSION_SUMMARY' }).state;
}

describe('powrót nierozwiązanych problemów', () => {
  it('przegrany problem trafia na stos nierozwiązanych', () => {
    const state = loseMission(game());
    expect(state.unsolvedProblems).toHaveLength(1);
  });

  it('nie wraca do talii natychmiast po porażce', () => {
    const state = loseMission(game());
    const unsolvedId = state.unsolvedProblems[0].id;
    expect(state.problemPile.some((p) => p.id === unsolvedId)).toBe(false);
  });

  it('wraca do talii po dwóch kolejnych misjach', () => {
    let state = loseMission(game());
    const unsolvedId = state.unsolvedProblems[0].id;
    state = loseMission(state);
    state = loseMission(state);
    expect(state.problemPile.some((p) => p.id === unsolvedId)).toBe(true);
    expect(state.unsolvedProblems.some((p) => p.id === unsolvedId)).toBe(false);
  });

  it('wraca na spód talii, nie na wierzch', () => {
    let state = loseMission(game());
    const unsolvedId = state.unsolvedProblems[0].id;
    state = loseMission(state);
    state = loseMission(state);
    expect(state.problemPile[state.problemPile.length - 1].id).toBe(unsolvedId);
  });

  it('rozwiązany problem nigdy nie wraca do talii', () => {
    let state = reduce(game(), { type: 'START_MISSION' }).state;
    const problemId = state.mission!.problems[0].id;

    const fills = [
      ['psychological', 'psychological'],
      ['digital', 'digital'],
      ['social', 'social'],
      ['mentor', 'mentorTalent'],
    ] as const;

    fills.forEach(([category, slotKey], index) => {
      const card = {
        id: `fill-${index}`, name: 'x', category,
        description: '', icon: 'star',
      };
      state = {
        ...state,
        players: state.players.map((p) => ({ ...p, hand: [card, ...p.hand] })),
      };
      state = reduce(state, {
        type: 'PLAY_CARD', playerId: 'p1', cardId: card.id,
        slotKey, problemId, fromMat: false,
      }).state;
    });

    state = reduce(state, { type: 'END_MISSION_SUMMARY' }).state;
    state = loseMission(state);
    state = loseMission(state);

    expect(state.problemPile.some((p) => p.id === problemId)).toBe(false);
    expect(state.solvedProblems.some((p) => p.id === problemId)).toBe(true);
  });
});
