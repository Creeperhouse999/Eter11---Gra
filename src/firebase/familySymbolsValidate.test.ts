import { describe, it, expect } from 'vitest';
import { validateContent } from './validate';
import { BUILTIN_CONTENT } from '../data/builtinContent';

/**
 * Walidacja symboli kolorów — pole `familySymbols` w treści gry.
 *
 * docs/PETLA.md, pułapka o `migrate()`: przy KAŻDYM nowym polu `GameContent`
 * sprawdzaj kształt osobno, bo ręczna edycja dokumentu w konsoli Firestore
 * zostawia wartości złego typu, a loader je przepuszcza. Dodałem
 * `familySymbols` bez takiego sprawdzenia — ten test i blok w `validate.ts`
 * domykają lukę.
 *
 * Symbol jest dla graczy niewidzących kolorów, więc jego cichy brak (wartość
 * nie-tekstowa pod poprawnym kluczem trafia prosto do `<Icon name=…>`) to nie
 * kosmetyka, tylko utrata jedynej informacji, którą taki gracz ma.
 */

const z = (familySymbols: unknown) => validateContent({ ...BUILTIN_CONTENT, familySymbols });

describe('walidacja symboli kolorów', () => {
  it('brak pola jest poprawny — treść sprzed tej zmiany', () => {
    expect(validateContent(BUILTIN_CONTENT).ok).toBe(true);
  });

  it('poprawna mapa przechodzi, także z wgraną grafiką', () => {
    const wynik = z({ red: 'circleShape', green: 'url:https://x/znak.png' });
    expect(wynik.errors.filter((e) => e.includes('Symbole'))).toEqual([]);
  });

  it('tekst zamiast mapy jest błędem', () => {
    const wynik = z('circleShape');
    expect(wynik.ok).toBe(false);
    expect(wynik.errors.some((e) => e.includes('nie są mapą'))).toBe(true);
  });

  it('lista zamiast mapy jest błędem', () => {
    expect(z(['circleShape']).ok).toBe(false);
  });

  it('nieznany kolor jest błędem', () => {
    const wynik = z({ purple: 'star' });
    expect(wynik.ok).toBe(false);
    expect(wynik.errors.some((e) => e.includes('nieznany kolor'))).toBe(true);
  });

  it('symbol, który nie jest nazwą ikony, jest błędem', () => {
    expect(z({ red: 42 }).ok).toBe(false);
    expect(z({ red: '' }).ok).toBe(false);
    expect(z({ red: null }).ok).toBe(false);
  });
});
