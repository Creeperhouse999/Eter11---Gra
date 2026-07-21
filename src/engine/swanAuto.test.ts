import { describe, it, expect } from 'vitest';
import { reduce } from './reducer';
import { giveCard, newGame } from './testFixtures';
import type { Card } from './types';

/**
 * Czarny Łabędź wchodzi na planszę sam.
 *
 * Zasada od zespołu merytorycznego: karta nie jest ruchem gracza. Kto ją
 * dobierze, ten od razu ponosi skutek, a gra ma o tym powiedzieć.
 */

const swan = (id: string, kind: Card['blackSwanKind']): Card => ({
  id,
  name: 'Czarny Łabędź',
  category: 'blackswan',
  description: '',
  icon: 'swan',
  blackSwanKind: kind,
});

const started = () => reduce(newGame(), { type: 'START_MISSION' }).state;

describe('Łabędź dobrany w trakcie rundy', () => {
  it('działa natychmiast i zostawia komunikat', () => {
    // Podkładamy Łabędzia na wierzch talii i domykamy rundę: każdy dobiera.
    let state = started();
    state = { ...state, drawPile: [swan('s1', 'extraProblem'), ...state.drawPile] };

    for (const player of state.players) {
      state = reduce(state, { type: 'PASS', playerId: player.id }).state;
    }

    expect(state.mission?.activeBlackSwans).toContain('extraProblem');
    expect(state.mission?.pendingSwanEvents.length).toBeGreaterThan(0);
    // Karta nie zostaje u nikogo w ręce.
    expect(
      state.players.flatMap((p) => p.hand).some((c) => c.category === 'blackswan'),
    ).toBe(false);
  });

  it('komunikat znika po potwierdzeniu', () => {
    let state = started();
    state = giveCard(state, 'p1', swan('s2', 'doubleRequirements'));
    state = reduce(state, { type: 'PASS', playerId: 'p1' }).state;
    state = reduce(state, { type: 'PASS', playerId: 'p2' }).state;

    const dismissed = reduce(state, { type: 'DISMISS_SWAN_EVENTS' }).state;
    expect(dismissed.mission?.pendingSwanEvents).toHaveLength(0);
    // Sam efekt zostaje — potwierdzenie zamyka okno, nie cofa karty.
    expect(dismissed.mission?.activeBlackSwans).toEqual(
      state.mission?.activeBlackSwans,
    );
  });

  it('nie blokuje żadnego ruchu gracza', () => {
    // Dawniej Łabędź w ręce blokował zagranie, pasowanie i wymianę.
    // Teraz nie ma czego blokować: karta znika w chwili dobrania.
    let state = started();
    state = { ...state, drawPile: [swan('s3', 'swapHands'), ...state.drawPile] };
    for (const player of state.players) {
      state = reduce(state, { type: 'PASS', playerId: player.id }).state;
    }

    const active = state.players[state.activePlayerIndex];
    const result = reduce(state, {
      type: 'SWAP_HAND',
      playerId: active.id,
      cardIds: [active.hand[0].id],
    });

    expect(result.rejected).toBeUndefined();
  });
});

describe('Łabędź z rozdania startowego', () => {
  it('odpala się przy starcie misji', () => {
    const base = newGame();
    const withSwan = {
      ...base,
      drawPile: [swan('s4', 'extraProblem'), ...base.drawPile],
    };

    // Karta trafia do ręki przy rozdaniu — misja zaczyna się od jej skutku.
    const started2 = reduce(withSwan, { type: 'START_MISSION' }).state;
    const inHand = started2.players
      .flatMap((p) => p.hand)
      .some((c) => c.category === 'blackswan');

    expect(inHand).toBe(false);
  });
});
