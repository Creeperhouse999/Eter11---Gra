import { describe, it, expect } from 'vitest';
import { reduce, applyBlackSwan, DEFAULT_CONFIG } from './reducer';
import { isSlotFilled } from './rules';
import { newGame } from './testFixtures';
import type { GameState } from './types';

/**
 * Czarny Łabędź utrudnia misję, ale nie może jej przesądzić.
 *
 * Dwa utrudnienia naraz dawały dwa problemy po podwojonych wymaganiach:
 * 20 kart do wyłożenia, podczas gdy dwóch graczy ma w całej misji 14 ruchów.
 * Misja była przegrana w chwili wylosowania drugiej karty — bez żadnego
 * błędu gracza i bez możliwości reakcji.
 */

/** Ile kart trzeba jeszcze wyłożyć, żeby zamknąć wszystkie problemy. */
function cardsNeeded(state: GameState): number {
  const mission = state.mission!;
  const perSlot = mission.activeBlackSwans.includes('doubleRequirements') ? 2 : 1;
  const open = mission.problems.reduce(
    (sum, problem) =>
      sum +
      problem.slots.filter((slot) => !isSlotFilled(mission, problem.id, slot.key)).length,
    0,
  );
  return open * perSlot;
}

/** Ile ruchów zostało całej drużynie do końca misji. */
function movesLeft(state: GameState): number {
  const rounds = state.config.roundsPerMission - state.mission!.round + 1;
  return rounds * state.players.length;
}

describe('misja zostaje możliwa do wygrania', () => {
  it('przy dwóch graczach i obu utrudnieniach naraz', () => {
    let state = reduce(newGame(), { type: 'START_MISSION' }).state;
    expect(state.players).toHaveLength(2);

    state = applyBlackSwan(state, 'extraProblem');
    state = applyBlackSwan(state, 'doubleRequirements');

    expect(
      cardsNeeded(state),
      `potrzeba ${cardsNeeded(state)} kart, a ruchów jest ${movesLeft(state)}`,
    ).toBeLessThanOrEqual(movesLeft(state));
  });

  it('także w odwrotnej kolejności utrudnień', () => {
    let state = reduce(newGame(), { type: 'START_MISSION' }).state;

    state = applyBlackSwan(state, 'doubleRequirements');
    state = applyBlackSwan(state, 'extraProblem');

    expect(cardsNeeded(state)).toBeLessThanOrEqual(movesLeft(state));
  });

  it('pojedyncze utrudnienie nadal działa', () => {
    // Zabezpieczenie nie może zjeść zwykłego przypadku: jeden Łabędź
    // przy pełnej puli rund mieści się bez problemu.
    let state = reduce(newGame(), { type: 'START_MISSION' }).state;
    state = applyBlackSwan(state, 'doubleRequirements');

    expect(state.mission?.activeBlackSwans).toContain('doubleRequirements');
  });

  it('utrudnienie odpada, gdy zostało za mało rund', () => {
    let state = reduce(newGame(), { type: 'START_MISSION' }).state;
    // Ostatnia runda: podwojenie nie ma prawa wejść.
    state = {
      ...state,
      mission: { ...state.mission!, round: DEFAULT_CONFIG.roundsPerMission },
    };

    const after = applyBlackSwan(state, 'doubleRequirements');
    expect(after.mission?.activeBlackSwans).not.toContain('doubleRequirements');
  });
});
