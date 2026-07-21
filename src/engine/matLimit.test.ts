import { describe, it, expect } from 'vitest';
import { reduce } from './reducer';
import { giveCard, makeCard, newGame } from './testFixtures';
import type { Card, GameState } from './types';

/**
 * Limit kart zabieranych na kartę postaci.
 *
 * Zasada mówi: jedna karta na misję. Limit pilnował tylko własnych kart —
 * karta otrzymana od innego gracza dopisywała się do maty bez sprawdzania,
 * więc w jednej misji dało się urosnąć o dowolną liczbę kart naraz.
 */

/** Misja z kartami zagranymi przez obu graczy, gotowa do podsumowania. */
function playedMission(): GameState {
  let state = reduce(newGame(), { type: 'START_MISSION' }).state;
  const problem = state.mission!.problems[0];

  // Każdy gracz zagrywa po dwie karty kompetencji — będzie czym się dzielić.
  const plays: Array<[string, string]> = [
    ['p1', problem.slots[0].key],
    ['p2', problem.slots[1].key],
    ['p1', problem.slots[2].key],
    ['p2', problem.slots[3].key],
  ];

  plays.forEach(([playerId, slotKey], index) => {
    const card = {
      ...makeCard(`karta-${index}`, slotKey as never),
      family: problem.slots.find((s) => s.key === slotKey)!.family,
    };
    state = giveCard(state, playerId, card);
    const result = reduce(state, {
      type: 'PLAY_CARD',
      playerId,
      cardId: card.id,
      slotKey: slotKey as never,
      problemId: problem.id,
      fromMat: false,
    });
    state = result.state;
  });

  return state;
}

describe('limit kart na macie w jednej misji', () => {
  it('gracz nie rośnie o więcej niż jedną kartę na misję', () => {
    let state = playedMission();
    if (state.phase !== 'missionSummary') {
      // Misja mogła się nie zamknąć — wymuszamy podsumowanie.
      state = { ...state, phase: 'missionSummary' };
    }

    const before = state.players.find((p) => p.id === 'p2')!.mat.length;

    // p2 bierze własną kartę…
    const own = state.mission!.played.find((p) => p.playerId === 'p2')!;
    state = reduce(state, {
      type: 'TAKE_CARD_TO_MAT',
      playerId: 'p2',
      cardId: own.card.id,
    }).state;

    // …a potem dostaje jeszcze jedną od p1.
    const gift = state.mission!.played.find((p) => p.playerId === 'p1')!;
    const result = reduce(state, {
      type: 'SHARE_CARD',
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      cardId: gift.card.id,
    });

    const after = result.state.players.find((p) => p.id === 'p2')!.mat.length;
    expect(after - before, 'mata rośnie najwyżej o jedną kartę na misję').toBe(1);
  });
});

describe('karty specjalne nie trafiają na kartę postaci', () => {
  it('odrzuca zabranie ETER11', () => {
    // Karta postaci ma pięć miejsc na kategorie i żadne nie pasuje do
    // ETER11. Zabranie przechodziło, karta znikała bez śladu, a gracz tracił
    // swój jedyny wybór w tej misji.
    let state = reduce(newGame(), { type: 'START_MISSION' }).state;
    const problem = state.mission!.problems[0];
    const slot = problem.slots[0];

    const eter: Card = {
      id: 'eter-test',
      name: 'ETER11',
      category: 'eter11',
      description: '',
      icon: 'spark',
    };
    state = giveCard(state, 'p1', eter);
    state = reduce(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardId: eter.id,
      slotKey: slot.key,
      problemId: problem.id,
      fromMat: false,
    }).state;

    state = { ...state, phase: 'missionSummary' };
    const result = reduce(state, {
      type: 'TAKE_CARD_TO_MAT',
      playerId: 'p1',
      cardId: eter.id,
    });

    expect(result.rejected).toContain('ETER11');
    expect(result.state.players.find((p) => p.id === 'p1')!.mat).toHaveLength(0);
  });
});
