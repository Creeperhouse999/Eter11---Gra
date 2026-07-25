import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { setupGame } from '../useGame';
import { ALL_CHARACTERS } from '../../data/characters';
import { ALL_PROBLEMS } from '../../data/problems';
import type { Game } from '../useGame';
import type { GameState } from '../../engine/types';
import { FinaleScreen } from './FinaleScreen';

/**
 * Ekran końcowy podaje „Rozwiązane problemy: X z Y". Y to problemy NAPOTKANE
 * (rozwiązane + nierozwiązane), nie liczba misji.
 *
 * Czarny Łabędź „dodatkowy problem" dokłada drugi problem do misji, a wygrana
 * misja wnosi WSZYSTKIE swoje problemy do `solvedProblems` — więc rozwiązanych
 * bywa więcej niż misji. `z {missionsPerGame}` dawało wtedy bezsens „9 z 7".
 */
function gameFor(state: GameState): Game {
  return {
    state,
    dispatch: () => {},
    rejection: null,
    dismissRejection: () => {},
  } as unknown as Game;
}

describe('FinaleScreen — mianownik rozwiązanych problemów', () => {
  it('liczy z problemów napotkanych, nie z liczby misji', () => {
    const base = setupGame(
      [
        { id: 'p1', name: 'Ala', characterId: ALL_CHARACTERS[0].id },
        { id: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id },
      ],
      7,
    );
    // 3 rozwiązane, 1 nierozwiązany, a misji tylko 2 — dokładnie sytuacja po
    // „dodatkowym problemie": rozwiązanych więcej niż misji.
    const state: GameState = {
      ...base,
      phase: 'finale',
      config: { ...base.config, missionsPerGame: 2 },
      mission: null,
      solvedProblems: ALL_PROBLEMS.slice(0, 3),
      unsolvedProblems: ALL_PROBLEMS.slice(3, 4),
    };

    render(<FinaleScreen game={gameFor(state)} onRestart={() => {}} />);

    // 3 rozwiązane + 1 nierozwiązany = 4 napotkane. Nigdy „3 z 2".
    expect(document.body.textContent).toMatch(/Rozwiązane problemy:\s*3\s*z\s*4/);
  });
});
