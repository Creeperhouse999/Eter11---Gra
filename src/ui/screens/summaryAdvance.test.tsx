import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupGame } from '../useGame';
import { reduce, DEFAULT_CONFIG } from '../../engine/reducer';
import {
  TUTORIAL_PROBLEM,
  TUTORIAL_HAND,
  TUTORIAL_DECK,
  TUTORIAL_PLAYER,
} from '../../data/tutorial';
import { cardFitsSlot } from '../../engine/rules';
import type { Game } from '../useGame';
import type { GameState } from '../../engine/types';
import { SummaryScreen } from './SummaryScreen';

/**
 * Ekran podsumowania samouczka nie może mieć własnego „Dalej".
 *
 * Gracz zgłosił: „znowu mogę bez scenariusza się pominąć i przejść tutaj" —
 * i ląduje na pustej „Misji 2" bez talii i bez wyjścia. Przyczyną był zwykły
 * przycisk „Dalej" na podsumowaniu, który w samouczku wypychał grę poza
 * scenariusz (`END_MISSION_SUMMARY` przy jednej talii = pusty stos problemów).
 *
 * W samouczku dalej prowadzi ETER11 przez swój dymek. Test pilnuje, że własny
 * „Dalej" znika, gdy podamy `hideAdvance`, a w zwykłej grze zostaje.
 */

/** Rozegrana do wygranej misja samouczka — stan na ekranie podsumowania. */
function wonTutorialState(): GameState {
  let state = setupGame([TUTORIAL_PLAYER], 1, DEFAULT_CONFIG, {
    problems: [TUTORIAL_PROBLEM],
    fixedHand: TUTORIAL_HAND,
    orderedDeck: TUTORIAL_DECK,
  });
  state = reduce(state, { type: 'START_MISSION' }).state;
  const playerId = state.players[0].id;

  // Zagrywaj pierwszą pasującą kartę, w razie potrzeby wymieniając rękę, aż
  // problem zamknięty i misja wygrana. Twardy limit chroni przed pętlą.
  for (let guard = 0; guard < 40 && state.phase === 'mission'; guard += 1) {
    const mission = state.mission!;
    let move: { cardId: string; slot: (typeof mission.problems)[number]['slots'][number]; problemId: string } | null =
      null;
    for (const problem of mission.problems) {
      for (const slot of problem.slots) {
        const filled = mission.played.some(
          (p) => p.problemId === problem.id && p.slotKey === slot.key,
        );
        if (filled) continue;
        const card = state.players
          .find((p) => p.id === playerId)!
          .hand.find((c) => cardFitsSlot(c, slot.key, slot.family));
        if (card) {
          move = { cardId: card.id, slot, problemId: problem.id };
          break;
        }
      }
      if (move) break;
    }

    if (move) {
      state = reduce(state, {
        type: 'PLAY_CARD',
        playerId,
        cardId: move.cardId,
        slotKey: move.slot.key,
        problemId: move.problemId,
        fromMat: false,
      }).state;
    } else {
      // Nic nie pasuje — wymień całą rękę i próbuj dalej.
      const hand = state.players.find((p) => p.id === playerId)!.hand;
      state = reduce(state, {
        type: 'SWAP_HAND',
        playerId,
        cardIds: hand.map((c) => c.id),
      }).state;
    }
  }

  return state;
}

/** Minimalna atrapa gry — SummaryScreen czyta tylko te pola. */
function gameFor(state: GameState): Game {
  return {
    state,
    dispatch: () => {},
    rejection: null,
    dismissRejection: () => {},
  } as unknown as Game;
}

describe('SummaryScreen — wyjście dalej', () => {
  it('w zwykłej grze pokazuje „Dalej"', () => {
    const state = wonTutorialState();
    expect(state.phase, 'misja samouczka kończy się podsumowaniem').toBe(
      'missionSummary',
    );
    render(<SummaryScreen game={gameFor(state)} />);
    expect(screen.getByRole('button', { name: 'Dalej' })).toBeDefined();
  });

  it('w samouczku (hideAdvance) NIE pokazuje „Dalej"', () => {
    const state = wonTutorialState();
    render(<SummaryScreen game={gameFor(state)} hideAdvance />);
    // Bez tego przycisku gra nie wypycha dziecka poza scenariusz na pustą
    // „Misję 2"; dalej prowadzi wyłącznie dymek ETER11.
    expect(screen.queryByRole('button', { name: 'Dalej' })).toBeNull();
  });
});
