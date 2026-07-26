import { describe, it, expect } from 'vitest';
import { reduce, DEFAULT_CONFIG } from './reducer';
import { newGame } from './testFixtures';
import { firstOpenSlotFor } from './rules';
import { awardTitles, playerScore, teamResult } from './scoring';
import type { Action, GameState } from './types';

/**
 * Test integracyjny: deterministyczna pełna partia 2-osobowa przez sam reduktor,
 * od createGame aż do finału. Pilnuje niezmienników, których testy jednostkowe
 * poszczególnych akcji nie łapią przez całą rozgrywkę:
 *
 *  (i)   liczba FIZYCZNYCH kart (z talii) jest stała — karty się nie mnożą ani
 *        nie gubią przy grze, dobieraniu, przekazywaniu i przejściach misji;
 *  (ii)  żadna karta nie leży w dwóch miejscach naraz (brak duplikatów id);
 *  (iii) activePlayerIndex zawsze wskazuje istniejącego gracza;
 *  (iv)  reduktor nie odrzuca żadnego z generowanych, poprawnych ruchów, a gra
 *        na pewno dochodzi do finału (nie zawisa).
 *
 * Karty doświadczenia (`experience`) NIE są liczone — powstają w grze, nie
 * pochodzą z talii.
 */

const DECK_SIZE = 60; // testDeck: 5 kategorii × 12 kart

/** Id wszystkich fizycznych kart z talii, gdziekolwiek teraz są. */
function physicalCardIds(state: GameState): string[] {
  const ids: string[] = [];
  for (const player of state.players) {
    for (const card of player.hand) ids.push(card.id);
    for (const card of player.mat) ids.push(card.id);
  }
  for (const card of state.drawPile) ids.push(card.id);
  for (const card of state.discardPile) ids.push(card.id);
  for (const played of state.mission?.played ?? []) ids.push(played.card.id);
  return ids;
}

function checkInvariants(state: GameState, label: string): void {
  const ids = physicalCardIds(state);
  // (i) suma stała
  expect(ids.length, `${label}: liczba fizycznych kart`).toBe(DECK_SIZE);
  // (ii) brak duplikatów — ta sama karta w dwóch miejscach zawyżyłaby unię
  expect(new Set(ids).size, `${label}: brak duplikatów id`).toBe(ids.length);
  // (iii) aktywny gracz istnieje
  expect(state.activePlayerIndex, `${label}: activePlayerIndex >= 0`).toBeGreaterThanOrEqual(0);
  expect(state.activePlayerIndex, `${label}: activePlayerIndex < liczba graczy`).toBeLessThan(
    state.players.length,
  );
}

describe('pełna partia 2-osobowa — niezmienniki silnika', () => {
  it('rozgrywa się do finału, zachowując wszystkie niezmienniki', () => {
    let state = newGame();
    checkInvariants(state, 'start');

    let guard = 0;
    let missionsPlayed = 0;

    while (state.phase !== 'finale' && guard < 500) {
      guard += 1;
      const mission = state.mission;
      let action: Action;

      if (state.phase === 'setup' || mission === null) {
        action = { type: 'START_MISSION' };
      } else if (state.phase === 'missionSummary') {
        missionsPlayed += 1;
        action = { type: 'END_MISSION_SUMMARY' };
      } else if (mission.pendingSwanEvents.length > 0) {
        action = { type: 'DISMISS_SWAN_EVENTS' };
      } else {
        // faza 'mission', mission.phase === 'playing'
        const active = state.players[state.activePlayerIndex];
        const playable = active.hand.find((card) => firstOpenSlotFor(mission, card) !== null);
        if (playable) {
          const slot = firstOpenSlotFor(mission, playable)!;
          action = {
            type: 'PLAY_CARD',
            playerId: active.id,
            cardId: playable.id,
            slotKey: slot.slotKey,
            problemId: slot.problemId,
            fromMat: false,
          };
        } else {
          action = { type: 'PASS', playerId: active.id };
        }
      }

      const result = reduce(state, action);
      // (iv) żaden generowany ruch nie jest odrzucany — inaczej pętla mogłaby
      // się zablokować, a to sygnał realnego rozjazdu reguł.
      expect(result.rejected, `${action.type} odrzucony: ${result.rejected}`).toBeUndefined();
      state = result.state;
      checkInvariants(state, `po ${action.type} (krok ${guard})`);
    }

    // Gra na pewno dochodzi do finału (najpóźniej po missionsPerGame misjach).
    expect(state.phase, 'gra musi dojść do finału').toBe('finale');
    expect(guard, 'finał osiągnięty przed licznikiem bezpieczeństwa').toBeLessThan(500);
    expect(missionsPlayed, 'rozegrano co najmniej jedną misję').toBeGreaterThan(0);

    // Po finale: scoring i tytuły nie rzucają i dają sensowne wartości.
    expect(() => awardTitles(state.players)).not.toThrow();
    const titles = awardTitles(state.players);
    for (const winners of Object.values(titles)) {
      expect(Array.isArray(winners)).toBe(true);
    }
    for (const player of state.players) {
      const score = playerScore(player, DEFAULT_CONFIG);
      expect(score, 'wynik gracza nie jest ujemny').toBeGreaterThanOrEqual(0);
    }
    const team = teamResult(state);
    expect(team.solved).toBeGreaterThanOrEqual(0);
    expect(typeof team.won).toBe('boolean');
  });
});
