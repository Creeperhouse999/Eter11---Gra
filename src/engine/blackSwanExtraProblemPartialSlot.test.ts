import { describe, it, expect } from 'vitest';
import { applyBlackSwan, createGame, DEFAULT_CONFIG } from './reducer';
import { testDeck, testProblem } from './testFixtures';
import type { GameState, MissionState } from './types';

/**
 * Zabezpieczenie przed nierozgrywalną misją liczyło ruchy potrzebne na
 * dołożenie problemu tak, jakby KAŻDY niezapełniony slot (przy aktywnym
 * podwojeniu) wymagał od nowa 2 kart — także slot, na który gracz zdążył już
 * zagrać 1 z 2 wymaganych kart. Realnie taki slot potrzebuje już tylko 1
 * karty. Zawyżony wymóg potrafił zablokować dodatkowy problem, mimo że
 * pozostałych ruchów faktycznie starczało — dokładnie to, przed czym
 * zabezpieczenie miało chronić (rezultat jest zachowawczy, nie psuje
 * rozgrywki, ale jest niezgodny z własnym komentarzem kodu o liczeniu
 * „dokładnie tyle, ile trzeba").
 */
describe('Łabędź „dodatkowy problem" przy już aktywnym podwojeniu', () => {
  it('liczy realny deficyt slotu z 1 z 2 kart, nie pełne 2', () => {
    const config = { ...DEFAULT_CONFIG, roundsPerMission: 10 };
    const base: GameState = createGame({
      players: [
        { id: 'p1', name: 'Ala', characterId: 'c1' },
        { id: 'p2', name: 'Bartek', characterId: 'c2' },
      ],
      deck: testDeck(),
      problems: [testProblem('a')],
      seed: 42,
      config,
    });

    const problem = testProblem('a');
    const [firstSlot] = problem.slots;
    const partialCard = base.players[0].hand.find(
      (c) => c.category === firstSlot.key,
    )!;

    const mission: MissionState = {
      problems: [problem],
      // Jedna karta z dwóch wymaganych na pierwszym slocie — slot NIE jest
      // zapełniony (isSlotFilled === false), ale brakuje mu już tylko 1 karty.
      played: [
        {
          card: partialCard,
          playerId: 'p1',
          slotKey: firstSlot.key,
          problemId: problem.id,
          fromMat: false,
        },
      ],
      round: 1,
      phase: 'playing',
      matUsedBy: [],
      activeBlackSwans: ['doubleRequirements'],
      slotsFilledBeforeDoubling: [],
      takenToMat: [],
      sharedCardIds: [],
      swappedThisRound: [],
      pendingSwanEvents: [],
    };

    const extraProblem = testProblem('extra');
    const state: GameState = {
      ...base,
      config,
      mission,
      problemPile: [extraProblem],
    };

    // Realny deficyt: 4 sloty puste × 2 + 1 slot z 1/2 karty × 1 = 9 dla
    // misji obecnej, + 5 slotów nowego problemu × 2 = 10 → razem 19.
    // (10 - 1) rund pozostałych × 2 graczy + 1 ruch w tej rundzie = 19.
    const movesRemainingThisRound = 1;

    const next = applyBlackSwan(state, 'extraProblem', movesRemainingThisRound);

    expect(
      next.mission?.activeBlackSwans,
      'przy realnym deficycie (19 potrzebnych = 19 dostępnych) problem powinien wejść',
    ).toContain('extraProblem');
  });
});
