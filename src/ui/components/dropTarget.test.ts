import { describe, it, expect } from 'vitest';
import { isOpenDropTarget } from './dropTarget';
import { reduce } from '../../engine/reducer';
import { newGame, makeCard } from '../../engine/testFixtures';
import type { GameState } from '../../engine/types';

/**
 * Sygnał „upuść tu" (zielony duch karty) musi znaczyć „ruch przejdzie".
 * Duch świecący na zielono nad ZAJĘTĄ ścianką kłamie: upuszczenie kończy się
 * odrzuceniem, a dziecko nie wie dlaczego. `isOpenDropTarget` liczy tak jak
 * silnik — kolor pasuje I ścianka wolna.
 */

function missionWithFilledSocial(): { state: GameState; problemId: string } {
  const state = reduce(newGame(), { type: 'START_MISSION' }).state;
  const problemId = state.mission!.problems[0].id;
  const withFilled: GameState = {
    ...state,
    mission: {
      ...state.mission!,
      played: [
        {
          card: makeCard('zapchajdziura-social', 'social'),
          playerId: 'inny',
          slotKey: 'social',
          problemId,
          fromMat: false,
        },
      ],
    },
  };
  return { state: withFilled, problemId };
}

describe('isOpenDropTarget', () => {
  it('pasująca karta na WOLNĄ ściankę → można upuścić', () => {
    const state = reduce(newGame(), { type: 'START_MISSION' }).state;
    const problemId = state.mission!.problems[0].id;
    const card = makeCard('moja-social', 'social'); // social, red
    expect(isOpenDropTarget(state.mission!, `${problemId}:social`, card)).toBe(true);
  });

  it('pasująca karta na ZAJĘTĄ ściankę → NIE można (duch nie może świecić zielono)', () => {
    const { state, problemId } = missionWithFilledSocial();
    const card = makeCard('moja-social', 'social');
    expect(isOpenDropTarget(state.mission!, `${problemId}:social`, card)).toBe(false);
  });

  it('niepasująca kolorem karta → NIE można', () => {
    const state = reduce(newGame(), { type: 'START_MISSION' }).state;
    const problemId = state.mission!.problems[0].id;
    // makeCard daje rodzinę red; ścianki testProblem też są red, więc żeby
    // odrzucić po kolorze, bierzemy inną KATEGORIĘ niż klucz ścianki? Nie —
    // cardFitsSlot patrzy na kategorię==klucz. Karta digital nie pasuje do
    // ścianki social.
    const wrong = makeCard('moja-digital', 'digital');
    expect(isOpenDropTarget(state.mission!, `${problemId}:social`, wrong)).toBe(false);
  });

  it('nieznany cel (zły identyfikator) → NIE można, bez wyjątku', () => {
    const state = reduce(newGame(), { type: 'START_MISSION' }).state;
    const card = makeCard('c', 'social');
    expect(isOpenDropTarget(state.mission!, 'nie-ma-takiego:social', card)).toBe(false);
    expect(isOpenDropTarget(state.mission!, 'bez-dwukropka', card)).toBe(false);
  });
});
