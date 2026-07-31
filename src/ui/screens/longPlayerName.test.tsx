import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupGame } from '../useGame';
import { ALL_CHARACTERS } from '../../data/characters';
import { ALL_PROBLEMS } from '../../data/problems';
import type { Game } from '../useGame';
import type { GameState } from '../../engine/types';
import { SummaryScreen } from './SummaryScreen';
import { FinaleScreen } from './FinaleScreen';
import { SetupScreen } from './SetupScreen';

/**
 * Imię gracza wpisuje dziecko przy stole — nic nie ogranicza jego długości.
 * Bez `maxLength` na wejściu i `truncate` na wyświetleniu, jedno długie słowo
 * bez spacji (bardzo prawdopodobne w tym wieku — np. powtórzone litery)
 * rozpycha wiersz z odznaką wyniku i ucina się na globalnym
 * `overflow-x:hidden` body, wyglądając jak zepsuty/urwany tekst.
 */

const LONG_NAME = 'A'.repeat(200);

function gameFor(state: GameState): Game {
  return {
    state,
    dispatch: () => {},
    rejection: null,
    dismissRejection: () => {},
  } as unknown as Game;
}

function summaryState(): GameState {
  const base = setupGame(
    [
      { id: 'p1', name: LONG_NAME, characterId: ALL_CHARACTERS[0].id },
      { id: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id },
    ],
    7,
  );
  const problem = ALL_PROBLEMS[0];
  return {
    ...base,
    players: base.players.map((p) => ({ ...p, hand: [], mat: [] })),
    phase: 'missionSummary',
    missionNumber: 1,
    mission: {
      problems: [problem],
      played: [],
      round: 3,
      phase: 'lost',
      matUsedBy: [],
      activeBlackSwans: [],
      slotsFilledBeforeDoubling: [],
      takenToMat: [],
      sharedCardIds: [],
      swappedThisRound: [],
      pendingSwanEvents: [],
    },
  };
}

describe('długie imię gracza nie rozwala layoutu', () => {
  it('SetupScreen ogranicza długość wpisywanego imienia', () => {
    render(<SetupScreen onStart={() => {}} />);
    const input = screen.getByLabelText(/imię gracza 1/i) as HTMLInputElement;
    expect(input.maxLength).toBeGreaterThan(0);
    expect(input.maxLength).toBeLessThanOrEqual(40);
  });

  it('SummaryScreen obcina długie imię zamiast rozpychać wiersz', () => {
    render(<SummaryScreen game={gameFor(summaryState())} />);
    const heading = screen.getAllByText(LONG_NAME).find((el) => el.tagName === 'H2');
    expect(heading).toBeDefined();
    expect(heading!.className).toMatch(/truncate/);
  });

  it('FinaleScreen obcina długie imię zamiast rozpychać wiersz', () => {
    const base = setupGame(
      [
        { id: 'p1', name: LONG_NAME, characterId: ALL_CHARACTERS[0].id },
        { id: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id },
      ],
      7,
    );
    const state: GameState = {
      ...base,
      phase: 'finale',
      config: { ...base.config, missionsPerGame: 1 },
      mission: null,
      solvedProblems: [ALL_PROBLEMS[0]],
      unsolvedProblems: [],
    };
    render(<FinaleScreen game={gameFor(state)} onRestart={() => {}} />);
    const heading = screen.getAllByText(LONG_NAME).find((el) => el.tagName === 'H3');
    expect(heading).toBeDefined();
    expect(heading!.className).toMatch(/truncate/);
  });
});
