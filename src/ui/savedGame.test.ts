import { describe, it, expect, beforeEach } from 'vitest';
import { clearSavedGame, hasSavedGame, loadGame, saveGame, savedSeed } from './savedGame';
import { reduce } from '../engine/reducer';
import { newGame } from '../engine/testFixtures';

/**
 * Partia przeżywa odświeżenie strony.
 *
 * Rozgrywka trwa do siedmiu misji, a przeglądarka na telefonie potrafi
 * odświeżyć kartę sama — bez zapisu przepadała cała gra przy stole.
 */

beforeEach(() => localStorage.clear());

const started = () => reduce(newGame(), { type: 'START_MISSION' }).state;

describe('zapis partii', () => {
  it('wczytuje stan zapisany pod tym samym ziarnem', () => {
    const state = started();
    saveGame(42, state);

    const loaded = loadGame(42);
    expect(loaded?.missionNumber).toBe(state.missionNumber);
    expect(loaded?.players).toHaveLength(state.players.length);
  });

  it('nie wczytuje zapisu z innej partii', () => {
    saveGame(42, started());
    // Nowa gra ma inne ziarno — nie może przejąć cudzego stanu.
    expect(loadGame(99)).toBeNull();
  });

  it('zapomina partię po wyczyszczeniu', () => {
    saveGame(42, started());
    expect(hasSavedGame()).toBe(true);

    clearSavedGame();
    expect(hasSavedGame()).toBe(false);
    expect(loadGame(42)).toBeNull();
  });

  it('podaje ziarno zapisanej partii, żeby dało się ją wznowić', () => {
    saveGame(7, started());
    expect(savedSeed()).toBe(7);
  });

  it('ignoruje uszkodzony zapis zamiast wywracać grę', () => {
    localStorage.setItem('eter11:game', '{to nie jest json');
    expect(loadGame(42)).toBeNull();
    expect(hasSavedGame()).toBe(false);
  });

  it('ignoruje zapis bez graczy', () => {
    localStorage.setItem(
      'eter11:game',
      JSON.stringify({ version: 1, seed: 42, state: { players: [] } }),
    );
    expect(loadGame(42)).toBeNull();
  });

  it('ignoruje zapis w starej wersji formatu', () => {
    localStorage.setItem(
      'eter11:game',
      JSON.stringify({ version: 0, seed: 42, state: started() }),
    );
    expect(loadGame(42)).toBeNull();
  });

  it('przechodzi przez pełny cykl: zagranie, zapis, odczyt', () => {
    let state = started();
    const player = state.players[0];
    state = reduce(state, { type: 'PASS', playerId: player.id }).state;

    saveGame(1, state);
    const loaded = loadGame(1)!;

    // Stan po odczycie musi dać się grać dalej tym samym reducerem.
    const next = reduce(loaded, {
      type: 'PASS',
      playerId: loaded.players[loaded.activePlayerIndex].id,
    });
    expect(next.rejected).toBeUndefined();
  });

  it('odrzuca gracza bez ręki albo maty', () => {
    // Takie pola UI czyta bez sprawdzania — wczytanie kończyło się wyjątkiem
    // w renderze, czyli pustym ekranem zamiast wznowionej partii.
    localStorage.setItem(
      'eter11:game',
      JSON.stringify({ version: 1, seed: 1, state: { players: [{ id: 'a' }] } }),
    );
    expect(loadGame(1)).toBeNull();
  });

  it('odrzuca misję, która nie jest obiektem', () => {
    localStorage.setItem(
      'eter11:game',
      JSON.stringify({
        version: 1,
        seed: 1,
        state: {
          players: [{ id: 'a', hand: [], mat: [], experience: [] }],
          mission: 'zepsute',
          drawPile: [],
          problemPile: [],
        },
      }),
    );
    expect(loadGame(1)).toBeNull();
  });

  it('przyjmuje stan między misjami, gdzie mission jest null', () => {
    const state = started();
    saveGame(1, { ...state, mission: null });
    expect(loadGame(1)).not.toBeNull();
  });
});
