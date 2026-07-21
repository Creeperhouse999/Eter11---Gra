import { describe, it, expect } from 'vitest';
import { reduce, DEFAULT_CONFIG } from './reducer';
import { newGame, testDeck } from './testFixtures';

describe('createGame', () => {
  it('rozdaje każdemu graczowi pełną rękę', () => {
    const state = newGame();
    expect(state.players[0].hand).toHaveLength(DEFAULT_CONFIG.handSize);
    expect(state.players[1].hand).toHaveLength(DEFAULT_CONFIG.handSize);
  });

  it('zaczyna w fazie setup bez aktywnej misji', () => {
    const state = newGame();
    expect(state.phase).toBe('setup');
    expect(state.mission).toBeNull();
  });

  it('to samo ziarno daje identyczny rozdany układ', () => {
    const a = newGame();
    const b = newGame();
    expect(a.players[0].hand.map((c) => c.id)).toEqual(
      b.players[0].hand.map((c) => c.id),
    );
  });

  it('karty rozdane graczom znikają z talii', () => {
    const state = newGame();
    const dealt = DEFAULT_CONFIG.handSize * 2;
    expect(state.drawPile).toHaveLength(testDeck().length - dealt);
  });

  it('gracze nie dostają tych samych kart', () => {
    const state = newGame();
    const first = state.players[0].hand.map((c) => c.id);
    const second = state.players[1].hand.map((c) => c.id);
    expect(first.some((id) => second.includes(id))).toBe(false);
  });
});

describe('START_MISSION', () => {
  it('wykłada pierwszy problem i przechodzi do fazy mission', () => {
    const { state } = reduce(newGame(), { type: 'START_MISSION' });
    expect(state.phase).toBe('mission');
    expect(state.mission?.problems).toHaveLength(1);
    expect(state.mission?.round).toBe(1);
    expect(state.missionNumber).toBe(1);
  });

  it('zdejmuje wyłożony problem ze stosu problemów', () => {
    const before = newGame();
    const { state } = reduce(before, { type: 'START_MISSION' });
    expect(state.problemPile).toHaveLength(before.problemPile.length - 1);
  });

  it('odrzuca start, gdy misja już trwa', () => {
    const { state: first } = reduce(newGame(), { type: 'START_MISSION' });
    const { rejected } = reduce(first, { type: 'START_MISSION' });
    expect(rejected).toBeTruthy();
  });

  it('kończy grę, gdy nie ma już czego odkryć', () => {
    // Pusty stos bez odłożonych problemów oznacza, że nic nie wróci.
    // Odrzucanie ruchu zostawiało graczy na ekranie startu bez wyjścia.
    const empty = { ...newGame(), problemPile: [], unsolvedProblems: [] };
    const { state, rejected } = reduce(empty, { type: 'START_MISSION' });

    expect(rejected).toBeUndefined();
    expect(state.phase).toBe('finale');
  });

  it('każe czekać, gdy odłożone problemy jeszcze wrócą', () => {
    const base = newGame();
    const waiting = {
      ...base,
      problemPile: [],
      // Problem zdjęty ze stosu czeka na powrót po dwóch misjach.
      unsolvedProblems: [base.problemPile[0]],
    };
    const { rejected } = reduce(waiting, { type: 'START_MISSION' });
    expect(rejected).toContain('Brak problemów');
  });
});
