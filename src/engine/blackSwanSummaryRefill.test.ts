import { describe, it, expect } from 'vitest';
import { reduce } from './reducer';
import { newGame } from './testFixtures';
import type { Card, MissionState } from './types';

/**
 * Łabędź dobrany przy uzupełnianiu ręki po zamknięciu podsumowania misji.
 *
 * Ten dobór idzie mimo wszystkich innych ścieżek karty (rozdanie startowe,
 * nowa runda, wymiana ręki) — żadna z nich go nie obejmuje, bo misja jest
 * już zamknięta, gdy do niego dochodzi.
 */
const swan = (id: string): Card => ({
  id,
  name: 'Czarny Łabędź',
  category: 'blackswan',
  description: '',
  icon: 'swan',
  blackSwanKind: 'extraProblem',
});

const wonMission: MissionState = {
  problems: [],
  played: [],
  round: 1,
  phase: 'won',
  matUsedBy: [],
  activeBlackSwans: [],
  slotsFilledBeforeDoubling: [],
  takenToMat: [],
  sharedCardIds: [],
  swappedThisRound: [],
  pendingSwanEvents: [],
};

describe('Łabędź dobrany przy uzupełnianiu ręki po misji', () => {
  it('nie zostaje w ręce gracza — trafia od razu na odrzucone', () => {
    let state = newGame();
    // Ręka gracza jest krótsza niż docelowy rozmiar, więc END_MISSION_SUMMARY
    // dobiera brakującą kartę. Na wierzchu talii kładziemy Łabędzia.
    const shortHand = state.players[0].hand.slice(0, state.config.handSize - 1);
    state = {
      ...state,
      phase: 'missionSummary',
      mission: wonMission,
      players: state.players.map((p, i) => (i === 0 ? { ...p, hand: shortHand } : p)),
      drawPile: [swan('s1'), ...state.drawPile],
    };

    const after = reduce(state, { type: 'END_MISSION_SUMMARY' }).state;

    expect(
      after.players.flatMap((p) => p.hand).some((c) => c.category === 'blackswan'),
    ).toBe(false);
    expect(after.discardPile.some((c) => c.id === 's1')).toBe(true);
    // Ręka i tak wraca do pełnego rozmiaru — Łabędź zostaje zamieniony,
    // a nie po prostu usunięty.
    const player = after.players.find((p) => p.id === 'p1')!;
    expect(player.hand).toHaveLength(state.config.handSize);
  });

  it('wymienia więcej niż jednego Łabędzia dobranego pod rząd', () => {
    let state = newGame();
    // Gracz brakuje dwóch kart, a na wierzchu talii leżą dwa Łabędzie z rzędu.
    const shortHand = state.players[0].hand.slice(0, state.config.handSize - 2);
    state = {
      ...state,
      phase: 'missionSummary',
      mission: wonMission,
      players: state.players.map((p, i) => (i === 0 ? { ...p, hand: shortHand } : p)),
      drawPile: [swan('s1'), swan('s2'), ...state.drawPile],
    };

    const after = reduce(state, { type: 'END_MISSION_SUMMARY' }).state;

    expect(
      after.players.flatMap((p) => p.hand).some((c) => c.category === 'blackswan'),
    ).toBe(false);
    expect(after.discardPile.some((c) => c.id === 's1')).toBe(true);
    expect(after.discardPile.some((c) => c.id === 's2')).toBe(true);
    const player = after.players.find((p) => p.id === 'p1')!;
    expect(player.hand).toHaveLength(state.config.handSize);
  });
});
