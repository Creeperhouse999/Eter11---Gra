import { describe, it, expect } from 'vitest';
import { reduce, DEFAULT_CONFIG } from '../../engine/reducer';
import { cardFitsSlot } from '../../engine/rules';
import {
  TUTORIAL_STEPS,
  TUTORIAL_PROBLEM,
  TUTORIAL_HAND,
  TUTORIAL_DECK,
  TUTORIAL_PLAYER,
} from '../../data/tutorial';
import { isGoalMet, type TutorialContext } from './useTutorial';
import { setupGame } from '../useGame';
import type { GameState } from '../../engine/types';

/**
 * Przejście całego samouczka krok po kroku, na prawdziwym reducerze.
 *
 * Testy jednostkowe sprawdzały pojedyncze warunki i przechodziły mimo
 * błędów, bo dostawały spreparowany kontekst. Ten test gra scenariusz tak,
 * jak zrobi to dziecko: wykonuje czynność opisaną w kroku i sprawdza, że
 * dopiero ona zalicza krok.
 */

const ctx = (patch: Partial<TutorialContext> = {}): TutorialContext => ({
  handRevealed: true,
  cardSelected: false,
  swapMode: false,
  swapSelected: 0,
  targetSlot: null,
  swapCount: 0,
  ...patch,
});

/** Pierwsza wolna ścianka, którą da się zamknąć kartą z ręki. */
const firstPlayable = (state: GameState) => {
  const mission = state.mission!;
  const player = state.players[0];
  for (const problem of mission.problems) {
    for (const slot of problem.slots) {
      const filled = mission.played.some(
        (p) => p.problemId === problem.id && p.slotKey === slot.key,
      );
      if (filled) continue;
      const card = player.hand.find((c) => cardFitsSlot(c, slot.key, slot.family));
      if (card) return { card, problemId: problem.id, slotKey: slot.key };
    }
  }
  return null;
};

describe('pełne przejście samouczka', () => {
  it('każdy krok wymaga swojej czynności i da się go wykonać', () => {
    let state = setupGame([TUTORIAL_PLAYER], 1, DEFAULT_CONFIG, {
      problems: [TUTORIAL_PROBLEM],
      fixedHand: TUTORIAL_HAND,
      orderedDeck: TUTORIAL_DECK,
    });
    state = reduce(state, { type: 'START_MISSION' }).state;

    const playerId = state.players[0].id;
    let swapCount = 0;

    for (const step of TUTORIAL_STEPS) {
      if (step.readOnly) {
        expect(isGoalMet(step.goal, state, ctx())).toBe(true);
        continue;
      }

      // Krok NIE może być zaliczony, zanim gracz cokolwiek zrobi.
      const before = isGoalMet(step.goal, state, ctx({ swapCount }));

      if (step.goal === 'selectCard') {
        expect(before).toBe(false);
        const move = firstPlayable(state);
        expect(move, 'jest karta do wybrania').not.toBeNull();
        expect(
          isGoalMet(step.goal, state, ctx({
            cardSelected: true,
            targetSlot: `${move!.problemId}:${move!.slotKey}`,
            swapCount,
          })),
        ).toBe(true);
        continue;
      }

      if (step.goal === 'swapCards') {
        expect(before, 'krok wymiany nie zalicza się sam').toBe(false);
        const player = state.players.find((p) => p.id === playerId)!;

        // ETER11 mówi tu „nic nie pasuje, wymień karty". Jeśli w ręku jest
        // choć jedna grywalna karta, ta kwestia jest nieprawdą — a gracz nie
        // ma powodu wymieniać. Dokładnie to zgłosił użytkownik.
        const playable = player.hand.filter((c) =>
          state.mission!.problems.some((pr) =>
            pr.slots.some(
              (s) =>
                !state.mission!.played.some(
                  (pl) => pl.problemId === pr.id && pl.slotKey === s.key,
                ) && cardFitsSlot(c, s.key, s.family),
            ),
          ),
        );
        expect(
          playable,
          'krok wymiany: żadna karta w ręku nie może pasować, inaczej ETER11 kłamie',
        ).toHaveLength(0);

        const useless = player.hand.filter(
          (c) => !state.mission!.problems.some((pr) =>
            pr.slots.some((s) => cardFitsSlot(c, s.key, s.family)),
          ),
        );
        expect(useless.length, 'są karty, które nie pasują nigdzie').toBeGreaterThan(0);

        const result = reduce(state, {
          type: 'SWAP_HAND',
          playerId,
          cardIds: useless.map((c) => c.id),
        });
        expect(result.rejected, 'wymiana przechodzi').toBeUndefined();
        state = result.state;
        swapCount += 1;
        expect(isGoalMet(step.goal, state, ctx({ swapCount }))).toBe(true);
        continue;
      }

      if (step.goal === 'takeCard') {
        expect(before).toBe(false);
        const own = state.mission!.played.find((p) => p.playerId === playerId);
        expect(own, 'gracz ma własną zagraną kartę do zabrania').toBeDefined();
        const result = reduce(state, {
          type: 'TAKE_CARD_TO_MAT',
          playerId,
          cardId: own!.card.id,
        });
        expect(result.rejected, 'zabranie na postać przechodzi').toBeUndefined();
        state = result.state;
        expect(isGoalMet(step.goal, state, ctx({ swapCount }))).toBe(true);
        continue;
      }

      // Kroki „połóż kartę": zagrywamy aż warunek kroku będzie spełniony.
      expect(before, `krok ${step.id} nie zalicza się sam`).toBe(false);
      let guard = 0;
      while (!isGoalMet(step.goal, state, ctx({ swapCount })) && guard < 10) {
        const move = firstPlayable(state);
        expect(move, `krok ${step.id}: jest czym zagrać`).not.toBeNull();
        const result = reduce(state, {
          type: 'PLAY_CARD',
          playerId,
          cardId: move!.card.id,
          slotKey: move!.slotKey,
          problemId: move!.problemId,
          fromMat: false,
        });
        expect(result.rejected, `krok ${step.id}: ruch przyjęty`).toBeUndefined();
        state = result.state;
        guard += 1;
      }
      expect(isGoalMet(step.goal, state, ctx({ swapCount })), `krok ${step.id} osiągalny`).toBe(true);
    }

    // Samouczek kończy się wygraną i kartą zabraną na postać.
    expect(state.mission?.takenToMat.length).toBeGreaterThan(0);
  });
});
