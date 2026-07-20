import { describe, it, expect } from 'vitest';
import { nextRandom, shuffle, draw } from './deck';
import type { Card } from './types';

const makeCard = (id: string): Card => ({
  id,
  name: id,
  category: 'talent',
  description: '',
  art: '⭐',
});

describe('nextRandom', () => {
  it('zwraca liczbę z przedziału [0,1) i nowe ziarno', () => {
    const [value, seed] = nextRandom(12345);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
    expect(seed).not.toBe(12345);
  });
});

describe('shuffle', () => {
  it('to samo ziarno daje tę samą kolejność', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const [a] = shuffle(items, 42);
    const [b] = shuffle(items, 42);
    expect(a).toEqual(b);
  });

  it('inne ziarno daje inną kolejność', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const [a] = shuffle(items, 42);
    const [b] = shuffle(items, 99);
    expect(a).not.toEqual(b);
  });

  it('zachowuje wszystkie elementy', () => {
    const items = [1, 2, 3, 4, 5];
    const [result] = shuffle(items, 7);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('nie mutuje wejścia', () => {
    const items = [1, 2, 3, 4, 5];
    shuffle(items, 7);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('draw', () => {
  it('dobiera żądaną liczbę kart z wierzchu talii', () => {
    const pile = [makeCard('a'), makeCard('b'), makeCard('c')];
    const result = draw(pile, [], 2, 1);
    expect(result.drawn.map((c) => c.id)).toEqual(['a', 'b']);
    expect(result.pile.map((c) => c.id)).toEqual(['c']);
  });

  it('nie mutuje przekazanej talii', () => {
    const pile = [makeCard('a'), makeCard('b'), makeCard('c')];
    draw(pile, [], 2, 1);
    expect(pile).toHaveLength(3);
  });

  it('przetasowuje stos odrzuconych, gdy talia pusta', () => {
    const discard = [makeCard('x'), makeCard('y')];
    const result = draw([], discard, 1, 1);
    expect(result.drawn).toHaveLength(1);
    expect(result.discard).toEqual([]);
    expect(result.pile).toHaveLength(1);
  });

  it('dobiera mniej, gdy brakuje kart wszędzie', () => {
    const result = draw([makeCard('a')], [], 5, 1);
    expect(result.drawn).toHaveLength(1);
  });
});
