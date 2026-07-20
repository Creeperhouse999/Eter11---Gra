import { describe, it, expect } from 'vitest';
import { reduce } from './reducer';
import { giveCard, makeCard, newGame } from './testFixtures';
import type { Card, GameState } from './types';

/** Misja w toku plus znana karta w ręce wskazanego gracza. */
function missionWithCard(category: Card['category'], playerId = 'p1') {
  const { state } = reduce(newGame(), { type: 'START_MISSION' });
  const injected = makeCard(`injected-${category}`, category);
  return {
    state: giveCard(state, playerId, injected),
    cardId: injected.id,
    problemId: state.mission!.problems[0].id,
  };
}

describe('PLAY_CARD', () => {
  it('kładzie pasującą kartę do slotu', () => {
    const { state, cardId, problemId } = missionWithCard('psychological');
    const result = reduce(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardId,
      slotKey: 'psychological',
      problemId,
      fromMat: false,
    });
    expect(result.rejected).toBeUndefined();
    expect(result.state.mission?.played).toHaveLength(1);
  });

  it('usuwa zagraną kartę z ręki', () => {
    const { state, cardId, problemId } = missionWithCard('psychological');
    const result = reduce(state, {
      type: 'PLAY_CARD', playerId: 'p1', cardId,
      slotKey: 'psychological', problemId, fromMat: false,
    });
    const hand = result.state.players.find((p) => p.id === 'p1')!.hand;
    expect(hand.some((c) => c.id === cardId)).toBe(false);
  });

  it('odrzuca kartę niepasującą do slotu', () => {
    const { state, cardId, problemId } = missionWithCard('digital');
    const result = reduce(state, {
      type: 'PLAY_CARD', playerId: 'p1', cardId,
      slotKey: 'psychological', problemId, fromMat: false,
    });
    expect(result.rejected).toContain('nie pasuje');
  });

  it('odrzuca ruch gracza spoza kolejki', () => {
    const { state, problemId } = missionWithCard('psychological');
    const p2Card = state.players[1].hand[0];
    const result = reduce(state, {
      type: 'PLAY_CARD', playerId: 'p2', cardId: p2Card.id,
      slotKey: p2Card.category === 'mentor' || p2Card.category === 'talent'
        ? 'mentor'
        : (p2Card.category as 'psychological' | 'digital' | 'social'),
      problemId, fromMat: false,
    });
    expect(result.rejected).toContain('kolej');
  });

  it('odrzuca kartę, której gracz nie ma', () => {
    const { state, problemId } = missionWithCard('psychological');
    const result = reduce(state, {
      type: 'PLAY_CARD', playerId: 'p1', cardId: 'nie-istnieje',
      slotKey: 'psychological', problemId, fromMat: false,
    });
    expect(result.rejected).toContain('Nie masz');
  });

  it('odrzuca dołożenie do slotu już zapełnionego', () => {
    const first = missionWithCard('psychological');
    const afterFirst = reduce(first.state, {
      type: 'PLAY_CARD', playerId: 'p1', cardId: first.cardId,
      slotKey: 'psychological', problemId: first.problemId, fromMat: false,
    }).state;

    const second = makeCard('drugi-psy', 'psychological');
    const withSecond = giveCard(afterFirst, 'p2', second);
    const result = reduce(withSecond, {
      type: 'PLAY_CARD', playerId: 'p2', cardId: second.id,
      slotKey: 'psychological', problemId: first.problemId, fromMat: false,
    });
    expect(result.rejected).toContain('zapełniony');
  });

  it('przekazuje kolejkę następnemu graczowi', () => {
    const { state, cardId, problemId } = missionWithCard('psychological');
    const result = reduce(state, {
      type: 'PLAY_CARD', playerId: 'p1', cardId,
      slotKey: 'psychological', problemId, fromMat: false,
    });
    expect(result.state.activePlayerIndex).toBe(1);
  });

  it('odrzuca użycie drugiej karty z maty w tej samej misji', () => {
    const { state, problemId } = missionWithCard('psychological');
    const matCards = [
      makeCard('mat-psy', 'psychological'),
      makeCard('mat-dig', 'digital'),
    ];
    const withMat: GameState = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'p1' ? { ...p, mat: matCards } : p,
      ),
    };

    const afterFirst = reduce(withMat, {
      type: 'PLAY_CARD', playerId: 'p1', cardId: 'mat-psy',
      slotKey: 'psychological', problemId, fromMat: true,
    }).state;

    // Wracamy kolejkę do p1, żeby sprawdzić limit, a nie kolejność.
    const backToP1: GameState = { ...afterFirst, activePlayerIndex: 0 };
    const result = reduce(backToP1, {
      type: 'PLAY_CARD', playerId: 'p1', cardId: 'mat-dig',
      slotKey: 'digital', problemId, fromMat: true,
    });
    expect(result.rejected).toContain('postaci');
  });
});

describe('PASS', () => {
  it('przekazuje kolejkę bez wykładania karty', () => {
    const { state } = reduce(newGame(), { type: 'START_MISSION' });
    const result = reduce(state, { type: 'PASS', playerId: 'p1' });
    expect(result.state.activePlayerIndex).toBe(1);
    expect(result.state.mission?.played).toHaveLength(0);
  });

  it('po ruchu ostatniego gracza zaczyna nową rundę', () => {
    const { state } = reduce(newGame(), { type: 'START_MISSION' });
    const afterP1 = reduce(state, { type: 'PASS', playerId: 'p1' });
    const afterP2 = reduce(afterP1.state, { type: 'PASS', playerId: 'p2' });
    expect(afterP2.state.mission?.round).toBe(2);
    expect(afterP2.state.activePlayerIndex).toBe(0);
  });

  it('każdy gracz dobiera kartę na początku nowej rundy', () => {
    const { state } = reduce(newGame(), { type: 'START_MISSION' });
    const handBefore = state.players[0].hand.length;
    const afterP1 = reduce(state, { type: 'PASS', playerId: 'p1' });
    const afterP2 = reduce(afterP1.state, { type: 'PASS', playerId: 'p2' });
    expect(afterP2.state.players[0].hand.length).toBe(handBefore + 1);
  });

  it('po wyczerpaniu limitu rund misja jest przegrana', () => {
    let state = reduce(newGame(), { type: 'START_MISSION' }).state;
    let guard = 0;
    while (state.mission?.phase === 'playing' && guard < 100) {
      const playerId = state.players[state.activePlayerIndex].id;
      state = reduce(state, { type: 'PASS', playerId }).state;
      guard++;
    }
    expect(state.mission?.phase).toBe('lost');
    expect(state.phase).toBe('missionSummary');
  });
});

describe('SWAP_HAND', () => {
  it('wymienia całą rękę na nowe karty i kończy ruch gracza', () => {
    const { state } = reduce(newGame(), { type: 'START_MISSION' });
    const before = state.players[0].hand.map((c) => c.id);
    const result = reduce(state, { type: 'SWAP_HAND', playerId: 'p1' });
    const after = result.state.players[0].hand.map((c) => c.id);
    expect(after).not.toEqual(before);
    expect(after).toHaveLength(state.config.handSize);
    expect(result.state.activePlayerIndex).toBe(1);
  });
});
