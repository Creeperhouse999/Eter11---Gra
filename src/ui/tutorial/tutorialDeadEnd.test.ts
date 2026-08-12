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
 * Samouczek nie może zamknąć dziecka w ślepym zaułku.
 *
 * Każda wymiana kart zużywa rundę, a misja ma ich siedem. Ostatni krok
 * scenariusza („Została ostatnia ścianka") pozwalał na wymianę, więc dziecko,
 * które zamiast położyć kartę kilka razy kliknęło „Wymieniam karty",
 * przegrywało misję samouczka. Wtedy nie było już wyjścia: warunek ukończenia
 * kroku wymaga wygranej, więc ETER11 nigdy nie pokazywał „Dalej", a zwykły
 * przycisk „Dalej" jest w samouczku schowany. Zostawało tylko „Pomiń", czyli
 * porzucenie nauki — dla ośmiolatka wygląda to jak zepsuta gra.
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

const startTutorial = (): GameState => {
  const state = setupGame([TUTORIAL_PLAYER], 1, DEFAULT_CONFIG, {
    problems: [TUTORIAL_PROBLEM],
    fixedHand: TUTORIAL_HAND,
    orderedDeck: TUTORIAL_DECK,
  });
  return reduce(state, { type: 'START_MISSION' }).state;
};

describe('samouczek — ślepy zaułek po przegranej', () => {
  it('ostatni krok NIE pozwala na wymianę, która przegrywa misję', () => {
    const finish = TUTORIAL_STEPS.find((step) => step.id === 'finish');
    expect(finish, 'krok „finish" istnieje').toBeDefined();

    // Sedno: na ostatniej ściance dziecko ma w ręku wszystko, czego trzeba
    // (mówi to sam dymek). Wymiana jest tam tylko sposobem na przegranie.
    expect(finish!.allow).not.toContain('swap');
  });

  it('przegrana misja samouczka nie zostawia dziecka bez wyjścia', () => {
    let state = startTutorial();
    const playerId = state.players[0].id;

    // Dziecko pasuje, aż skończą się rundy — najkrótsza droga do przegranej,
    // ta sama, do której prowadziła wymiana na ostatnim kroku.
    for (let guard = 0; guard < 50; guard += 1) {
      if (state.mission?.phase !== 'playing') break;
      state = reduce(state, { type: 'PASS', playerId }).state;
    }

    expect(state.mission?.phase, 'misja przegrana').toBe('lost');

    // Warunek ukończenia ostatniego kroku musi umieć obsłużyć przegraną —
    // inaczej dymek stoi w miejscu, a „Dalej" nie pojawia się nigdy.
    expect(isGoalMet('finish', state, ctx())).toBe(true);
  });

  it('wygrana nadal kończy krok (nie rozluźniamy warunku za bardzo)', () => {
    let state = startTutorial();
    const playerId = state.players[0].id;

    // Krok „finish" ma się zaliczać dopiero po zamknięciu problemu, nie
    // w trakcie — inaczej dziecko przeskakiwałoby naukę.
    expect(isGoalMet('finish', state, ctx())).toBe(false);

    // Scenariusz jak w samouczku: kładziemy, co pasuje, a gdy nic nie pasuje —
    // wymieniamy rękę (dokładnie ten ruch, którego uczy krok „swap").
    for (let guard = 0; guard < 50; guard += 1) {
      if (state.mission?.phase !== 'playing') break;
      const move = firstPlayable(state);
      if (move) {
        const next = reduce(state, {
          type: 'PLAY_CARD',
          playerId,
          cardId: move.card.id,
          problemId: move.problemId,
          slotKey: move.slotKey,
          fromMat: false,
        });
        if (next.rejected) break;
        state = next.state;
        continue;
      }
      const hand = state.players[0].hand.map((card) => card.id);
      const next = reduce(state, { type: 'SWAP_HAND', playerId, cardIds: hand });
      if (next.rejected) break;
      state = next.state;
    }

    expect(state.mission?.phase).toBe('won');
    expect(isGoalMet('finish', state, ctx())).toBe(true);
  });
});
