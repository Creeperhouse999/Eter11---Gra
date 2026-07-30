import { describe, it, expect } from 'vitest';
import { matchCardByFileName, normalizeForMatch } from './cardImageMatch';
import type { Card } from '../engine/types';

const CARDS: Card[] = [
  {
    id: 'psy-r-odpornosc',
    name: 'Odporność psychiczna',
    category: 'psychological',
    description: '',
    icon: 'shield',
    family: 'red',
  },
  {
    id: 'dig-y-programowanie',
    name: 'Programowanie',
    category: 'digital',
    description: '',
    icon: 'code',
    family: 'yellow',
  },
];

describe('normalizeForMatch', () => {
  it('usuwa polskie znaki, wielkość liter i interpunkcję', () => {
    expect(normalizeForMatch('Odporność psychiczna')).toBe('odpornosc-psychiczna');
    expect(normalizeForMatch('psy-r-odpornosc')).toBe('psy-r-odpornosc');
  });

  it('przycina myślniki na brzegach i scala powtórzone separatory', () => {
    expect(normalizeForMatch('  Programowanie!! ')).toBe('programowanie');
  });
});

describe('matchCardByFileName', () => {
  it('dopasowuje po id karty w nazwie pliku', () => {
    expect(matchCardByFileName('psy-r-odpornosc.png', CARDS)?.id).toBe('psy-r-odpornosc');
  });

  it('dopasowuje po nazwie karty, niezależnie od polskich znaków i wielkości liter', () => {
    expect(matchCardByFileName('odpornosc psychiczna.JPG', CARDS)?.id).toBe('psy-r-odpornosc');
  });

  it('zwraca undefined, gdy żadna karta nie pasuje', () => {
    expect(matchCardByFileName('losowy-plik-123.png', CARDS)).toBeUndefined();
  });

  it('zwraca undefined dla pustej nazwy po usunięciu rozszerzenia', () => {
    expect(matchCardByFileName('.png', CARDS)).toBeUndefined();
  });
});
