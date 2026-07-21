import { createGame, DEFAULT_CONFIG } from './reducer';
import type { Card, GameState, Problem } from './types';

/** Pomocniki wspólne dla testów silnika. */

export const makeCard = (id: string, category: Card['category']): Card => ({
  id,
  name: id,
  category,
  description: '',
  icon: 'star',
  family: 'red',
});

/** Talia z zapasem kart każdej kategorii — wystarcza na pełną rozgrywkę testową. */
export const testDeck = (): Card[] => {
  const cards: Card[] = [];
  const categories: Card['category'][] = [
    'psychological', 'digital', 'social', 'talent', 'mentor',
  ];
  for (const category of categories) {
    for (let i = 0; i < 12; i++) cards.push(makeCard(`${category}-${i}`, category));
  }
  return cards;
};

export const testProblem = (id: string): Problem => ({
  id,
  name: `Problem ${id}`,
  story: '',
  antagonist: '',
  consequence: '',
  goal: '',
  type: 'action',
  icon: 'star',
  slots: [
    { key: 'psychological', family: 'red', hint: '' },
    { key: 'digital', family: 'red', hint: '' },
    { key: 'social', family: 'red', hint: '' },
    { key: 'mentor', family: 'red', hint: '' },
    { key: 'talent', family: 'red', hint: '' },
  ],
});

/** Świeża gra na dwóch graczy z ustalonym ziarnem. */
export const newGame = (): GameState =>
  createGame({
    players: [
      { id: 'p1', name: 'Ala', characterId: 'c1' },
      { id: 'p2', name: 'Bartek', characterId: 'c2' },
    ],
    deck: testDeck(),
    problems: [testProblem('a'), testProblem('b'), testProblem('c')],
    seed: 42,
    config: DEFAULT_CONFIG,
  });

/** Wstawia kartę na wierzch ręki wskazanego gracza — ułatwia testy ruchów. */
export const giveCard = (
  state: GameState,
  playerId: string,
  card: Card,
): GameState => ({
  ...state,
  players: state.players.map((p) =>
    p.id === playerId ? { ...p, hand: [card, ...p.hand] } : p,
  ),
});
