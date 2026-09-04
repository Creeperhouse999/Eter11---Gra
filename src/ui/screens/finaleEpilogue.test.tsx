import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupGame } from '../useGame';
import { ALL_CHARACTERS } from '../../data/characters';
import { ALL_PROBLEMS } from '../../data/problems';
import { DEFAULT_UI_TEXT } from '../../data/uiText';
import type { Game } from '../useGame';
import type { GameState } from '../../engine/types';
import { FinaleScreen } from './FinaleScreen';

/**
 * Epilog na ekranie końcowym.
 *
 * Adam poprosił wprost: „aby pełnymi zdaniami, myślę że 5-10 zdań opisywało
 * co się wydarzyło podczas tych rund, czego się nauczyliśmy, czego zabrakło
 * — jak Epilog w książce czy filmie", i podkreślił: „na pewno ważne, aby nie
 * było 1 zdanie". Wcześniej ekran końcowy miał tylko jednozdaniowy nagłówek
 * wyniku i (przy przegranej) jedno dopisane zdanie „Możecie przegrać bitwę,
 * ale nie wojnę" — dokładnie to, o co Adam prosił, żeby NIE było.
 */
function gameFor(state: GameState): Game {
  return {
    state,
    dispatch: () => {},
    rejection: null,
    dismissRejection: () => {},
  } as unknown as Game;
}

function finaleState(won: boolean): GameState {
  const base = setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: ALL_CHARACTERS[0].id },
      { id: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id },
    ],
    7,
  );
  return {
    ...base,
    phase: 'finale',
    mission: null,
    solvedProblems: won ? ALL_PROBLEMS.slice(0, 5) : ALL_PROBLEMS.slice(0, 2),
    unsolvedProblems: won ? [] : ALL_PROBLEMS.slice(2, 3),
  };
}

describe('epilog na ekranie końcowym', () => {
  it('po wygranej pokazuje wielozdaniowy epilog, nie jedno zdanie', () => {
    render(<FinaleScreen game={gameFor(finaleState(true))} onRestart={() => {}} />);

    expect(screen.getByText(DEFAULT_UI_TEXT.finaleEpilogueWon)).toBeTruthy();
    // Adam: „na pewno ważne aby nie było 1 zdanie" — liczymy kropki kończące
    // zdania (nie licząc skrótów w środku), musi ich być kilka.
    const zdania = DEFAULT_UI_TEXT.finaleEpilogueWon.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(zdania.length).toBeGreaterThanOrEqual(5);
  });

  it('po przegranej pokazuje inny, też wielozdaniowy epilog', () => {
    render(<FinaleScreen game={gameFor(finaleState(false))} onRestart={() => {}} />);

    expect(screen.getByText(DEFAULT_UI_TEXT.finaleEpilogueLost)).toBeTruthy();
    const zdania = DEFAULT_UI_TEXT.finaleEpilogueLost.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(zdania.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_UI_TEXT.finaleEpilogueLost).not.toBe(DEFAULT_UI_TEXT.finaleEpilogueWon);
  });

  it('puste pole epilogu nie zostawia pustego akapitu', () => {
    render(
      <FinaleScreen
        game={gameFor(finaleState(true))}
        onRestart={() => {}}
        text={{ ...DEFAULT_UI_TEXT, finaleEpilogueWon: '   ' }}
      />,
    );

    expect(screen.queryByText(/^\s*$/, { selector: 'p.leading-relaxed' })).toBeNull();
  });
});
