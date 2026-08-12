import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';
import { newGame } from '../engine/testFixtures';

/**
 * Historia ruchów nie może rosnąć bez końca.
 *
 * Każdy wpis to pełna kopia stanu gry — talia, ręce, maty, log — czyli ~27 KB.
 * Przy ponad trzydziestu ruchach w partii uzbierało się z tego ponad 800 KB
 * w pamięci karty, a przy kilku partiach pod rząd bez przeładowania strony
 * starszy telefon ubijał zakładkę w środku gry. Cofania używa zresztą wyłącznie
 * tryb testowy w panelu i nikt nie sięga tam po trzydziesty ruch wstecz.
 */

describe('useGame — historia ma limit', () => {
  it('nie rośnie w nieskończoność, a cofanie nadal działa', () => {
    const start = newGame();
    const { result } = renderHook(() =>
      useGame(
        start.players.map((p) => ({ id: p.id, name: p.name, characterId: p.characterId })),
        1,
        undefined,
        undefined,
        // Bez zapisu: test nie ma po co dotykać localStorage.
        false,
      ),
    );

    act(() => {
      result.current.dispatch({ type: 'START_MISSION' });
    });

    const playerId = result.current.state.players[0].id;

    // Sto ruchów — dużo więcej niż limit.
    for (let i = 0; i < 100; i += 1) {
      act(() => {
        result.current.dispatch({ type: 'PASS', playerId: result.current.state.players[result.current.state.activePlayerIndex].id });
      });
    }
    expect(playerId).toBeTruthy();

    // Sedno: historia jest przycięta, a nie równa liczbie wykonanych ruchów.
    expect(result.current.history.length).toBeLessThanOrEqual(20);
    expect(result.current.history.length).toBeGreaterThan(0);

    // Cofanie po przycięciu nadal działa — tryb testowy ma z czego korzystać.
    const before = result.current.history.length;
    act(() => {
      result.current.undo();
    });
    expect(result.current.history.length).toBe(before - 1);
  });
});
