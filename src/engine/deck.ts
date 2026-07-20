import type { Card } from './types';

/**
 * Mulberry32 — deterministyczny generator liczb pseudolosowych.
 * Zwraca [wartość z [0,1), nowe ziarno]. Ziarno żyje w GameState,
 * dzięki czemu każdy klient tasuje talię identycznie.
 */
export function nextRandom(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, t | 0];
}

/** Tasowanie Fisher-Yates. Nie mutuje wejścia. */
export function shuffle<T>(items: T[], seed: number): [T[], number] {
  const result = [...items];
  let currentSeed = seed;
  for (let i = result.length - 1; i > 0; i--) {
    const [value, nextSeed] = nextRandom(currentSeed);
    currentSeed = nextSeed;
    const j = Math.floor(value * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return [result, currentSeed];
}

/**
 * Dobiera karty. Gdy talia się kończy, przetasowuje stos odrzuconych.
 * Gdy zabraknie i tam, dobiera tyle, ile jest dostępne.
 */
export function draw(
  pile: Card[],
  discard: Card[],
  count: number,
  seed: number,
): { drawn: Card[]; pile: Card[]; discard: Card[]; seed: number } {
  let currentPile = [...pile];
  let currentDiscard = [...discard];
  let currentSeed = seed;
  const drawn: Card[] = [];

  for (let i = 0; i < count; i++) {
    if (currentPile.length === 0) {
      if (currentDiscard.length === 0) break;
      const [reshuffled, nextSeed] = shuffle(currentDiscard, currentSeed);
      currentPile = reshuffled;
      currentDiscard = [];
      currentSeed = nextSeed;
    }
    drawn.push(currentPile.shift()!);
  }

  return { drawn, pile: currentPile, discard: currentDiscard, seed: currentSeed };
}
