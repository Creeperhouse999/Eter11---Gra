import { describe, it, expect } from 'vitest';
import { reduce, resolveDrawnBlackSwans } from './reducer';
import { makeCard, newGame } from './testFixtures';
import type { Card, GameState } from './types';

/**
 * Dobieranie kart nie może gubić kart ani zostawiać martwych Łabędzi.
 *
 * Trzy usterki miały wspólny korzeń: `resolveDrawnBlackSwans` odpalał się
 * tylko przy przejściu do nowej rundy, a `draw` po cichu zwracał mniej
 * kart, niż zażądano — i nikt tego nie sprawdzał.
 */

const swan = (id: string): Card => ({
  id,
  name: 'Czarny Łabędź',
  category: 'blackswan',
  description: '',
  icon: 'swan',
  blackSwanKind: 'extraProblem',
});

const started = (): GameState => reduce(newGame(), { type: 'START_MISSION' }).state;

describe('Czarny Łabędź dobrany przy wymianie', () => {
  it('odpala się od razu, nie zostaje w ręce', () => {
    let state = started();
    // Łabędź na wierzchu talii — wymiana go dociągnie.
    state = { ...state, drawPile: [swan('s-swap'), ...state.drawPile] };

    const player = state.players[state.activePlayerIndex];
    state = reduce(state, {
      type: 'SWAP_HAND',
      playerId: player.id,
      cardIds: [player.hand[0].id],
    }).state;

    const swanInAnyHand = state.players
      .flatMap((p) => p.hand)
      .some((c) => c.category === 'blackswan');

    expect(swanInAnyHand, 'Łabędź nie zostaje martwą kartą w ręce').toBe(false);
    expect(state.mission?.activeBlackSwans).toContain('extraProblem');
  });
});

describe('Łabędź nie zjada karty', () => {
  it('gracz, który go dobrał, ma tyle samo kart co reszta', () => {
    let state = started();
    state = { ...state, drawPile: [swan('s-round'), ...state.drawPile] };

    // Pełna runda: każdy pasuje, potem wszyscy dobierają po karcie.
    for (const player of state.players) {
      state = reduce(state, { type: 'PASS', playerId: player.id }).state;
    }

    const sizes = state.players.map((p) => p.hand.length);
    expect(
      new Set(sizes).size,
      `wszyscy mają tyle samo kart, a mają ${sizes.join(' i ')}`,
    ).toBe(1);
  });
});

describe('wymiana przy krótkiej talii', () => {
  it('oddaje tyle kart, ile zabrała — nawet gdy talia jest pusta', () => {
    let state = started();
    const player = state.players[state.activePlayerIndex];

    // Talia pusta, stos odrzuconych też: nie ma z czego dobierać.
    state = { ...state, drawPile: [], discardPile: [] };

    const before = player.hand.length;
    const result = reduce(state, {
      type: 'SWAP_HAND',
      playerId: player.id,
      cardIds: player.hand.map((c) => c.id),
    });

    const after = result.state.players.find((p) => p.id === player.id)!;
    expect(
      after.hand.length,
      'gracz nie może stracić kart tylko dlatego, że talia się skończyła',
    ).toBe(before);
  });

  it('oddane karty wracają do obiegu, gdy brakuje kart w talii', () => {
    let state = started();
    const player = state.players[state.activePlayerIndex];

    // Jedna karta w talii, wymieniamy trzy — brakujące muszą przyjść
    // z kart właśnie oddanych.
    state = { ...state, drawPile: [makeCard('jedyna', 'social')], discardPile: [] };

    const before = player.hand.length;
    const result = reduce(state, {
      type: 'SWAP_HAND',
      playerId: player.id,
      cardIds: player.hand.slice(0, 3).map((c) => c.id),
    });

    const after = result.state.players.find((p) => p.id === player.id)!;
    expect(after.hand.length).toBe(before);
  });
});

describe('wiele Łabędzi naraz', () => {
  it('żaden nie zostaje w ręce, choćby było ich więcej niż graczy', () => {
    let state = started();

    // Skrajny przypadek: dziewięć Łabędzi rozdanych po rękach. Sztywny limit
    // ośmiu obiegów zostawiał ostatnie karty w grze.
    const swans = Array.from({ length: 9 }, (_, i) => swan(`s-many-${i}`));
    state = {
      ...state,
      players: state.players.map((p, index) => ({
        ...p,
        hand: [
          ...p.hand,
          ...swans.filter((_, i) => i % state.players.length === index),
        ],
      })),
    };

    const { state: after } = resolveDrawnBlackSwans(state);
    const left = after.players.flatMap((p) => p.hand).filter(
      (c) => c.category === 'blackswan',
    );

    expect(left, 'wszystkie Łabędzie schodzą z rąk').toHaveLength(0);
  });
});
