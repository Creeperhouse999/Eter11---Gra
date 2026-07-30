import { describe, it, expect } from 'vitest';
import { createGame, reduce, DEFAULT_CONFIG } from './reducer';
import { makeCard, testDeck, testProblem } from './testFixtures';
import type { Card, GameState } from './types';

/**
 * Zabezpieczenie przed nierozgrywalną misją liczyło pozostałe ruchy tak, jakby
 * Łabędź zawsze wchodził na starcie rundy (`activePlayerIndex === 0`, nikt
 * jeszcze nie ruszał się w tej rundzie). Ale Łabędź dobrany przy WYMIANIE
 * karty (`SWAP_HAND`) odpala się w trakcie rundy, na koncie gracza, który
 * właśnie zużywa swój ruch na wymianę — a gracze przed nim w kolejce już
 * swój ruch wykorzystali. Licznik tego nie widział, więc zabezpieczenie
 * potrafiło przepuścić utrudnienie w misji, której faktycznie nie dało się
 * już domknąć w pozostałych ruchach — dokładnie to, przed czym miało chronić.
 */

const swan = (id: string): Card => ({
  id,
  name: 'Czarny Łabędź',
  category: 'blackswan',
  description: '',
  icon: 'swan',
  blackSwanKind: 'doubleRequirements',
});

describe('Łabędź „podwojenie" dobrany przy wymianie w trakcie rundy', () => {
  it('nie wchodzi, gdy po zużytych ruchach reszcie stołu realnie go nie starczy', () => {
    // 2 graczy, 5 rund, misja z 5 slotami — dokładnie na granicy: zabezpieczenie
    // liczone jak na starcie rundy (błędnie) daje 10 ruchów na 10 potrzebnych
    // (5 slotów × 2 po podwojeniu) i PRZEPUSZCZA. Licząc realnie zostało 8
    // ruchów (gracz 1 już poszedł, gracz 2 właśnie zużywa swój na wymianę) —
    // 10 > 8, więc powinno zablokować.
    const config = { ...DEFAULT_CONFIG, roundsPerMission: 5 };
    let state: GameState = createGame({
      players: [
        { id: 'p1', name: 'Ala', characterId: 'c1' },
        { id: 'p2', name: 'Bartek', characterId: 'c2' },
      ],
      deck: testDeck(),
      problems: [testProblem('a')],
      seed: 42,
      config,
    });
    state = reduce(state, { type: 'START_MISSION' }).state;
    expect(state.mission?.round).toBe(1);
    expect(state.activePlayerIndex).toBe(0);

    // Gracz 1 (index 0) kończy turę wymianą — nie wypełnia slotu, a runda
    // zostaje ta sama (drugi gracz jeszcze nie szedł). Talia rigowana zwykłą
    // kartą, żeby jego wymiana NIE dobrała Łabędzia.
    state = {
      ...state,
      drawPile: [makeCard('zwykla-1', 'social'), swan('s-mid-round'), ...state.drawPile],
    };
    const p1 = state.players[0];
    state = reduce(state, {
      type: 'SWAP_HAND',
      playerId: p1.id,
      cardIds: [p1.hand[0].id],
    }).state;
    expect(state.mission?.round).toBe(1);
    expect(state.activePlayerIndex).toBe(1);
    expect(state.mission?.activeBlackSwans).not.toContain('doubleRequirements');

    // Gracz 2 (index 1) wymienia i dobiera Łabędzia — jego własny ruch też
    // idzie na wymianę, nie na wypełnienie slotu.
    const p2 = state.players[1];
    state = reduce(state, {
      type: 'SWAP_HAND',
      playerId: p2.id,
      cardIds: [p2.hand[0].id],
    }).state;

    expect(
      state.mission?.activeBlackSwans,
      'podwojenie nie powinno wejść — realnie zostało za mało ruchów',
    ).not.toContain('doubleRequirements');
  });
});
