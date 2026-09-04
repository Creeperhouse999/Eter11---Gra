import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORIES } from './categories';

/**
 * Nazwy kategorii mówią językiem dziecka, nie podręcznika.
 *
 * Adam zgłosił to dwa razy („Dziecięce nazwy"), wybrał w dyskusji Wariant 4
 * („Supermoce") i dopytywał, czy jest zrobione. Gra jest dla dzieci 8–13 lat,
 * a „kompetencja psychologiczna" to słownik z podręcznika dla dorosłych —
 * dziecko na taką ściankę patrzy i nie wie, o czym mowa.
 *
 * Talent i Mentor zostają bez zmian: tak ustalił Adam, bo oba są krótkie
 * i zrozumiałe same z siebie.
 */

/** Słowa z języka dorosłych, których w nazwie widocznej dla dziecka nie chcemy. */
const TRUDNE = ['psycholog', 'kompetencj', 'cyfrow', 'społeczn'];

describe('nazwy kategorii dla dzieci', () => {
  it('żadna widoczna nazwa nie używa fachowego słownictwa', () => {
    for (const [klucz, styl] of Object.entries(DEFAULT_CATEGORIES)) {
      const nazwa = styl.label.toLowerCase();
      for (const trudne of TRUDNE) {
        expect(
          nazwa.includes(trudne),
          `Kategoria „${klucz}" ma nazwę „${styl.label}" — dla 8-latka to słowo z podręcznika.`,
        ).toBe(false);
      }
    }
  });

  it('trzy główne ścianki to Supermoce — wariant wybrany przez Adama', () => {
    expect(DEFAULT_CATEGORIES.psychological.label).toBe('Supermoc Umysłu');
    expect(DEFAULT_CATEGORIES.digital.label).toBe('Supermoc Technologii');
    expect(DEFAULT_CATEGORIES.social.label).toBe('Supermoc Ludzi');
  });

  it('Talent i Mentor zostają nietknięte — tak ustalił Adam', () => {
    expect(DEFAULT_CATEGORIES.talent.label).toBe('Talent');
    expect(DEFAULT_CATEGORIES.mentor.label).toBe('Mentor');
  });

  it('nazwy mieszczą się na karcie — długie się łamią albo urywają', () => {
    // Ścianki wokół problemu mają stałą szerokość; nazwa dłuższa niż ~22 znaki
    // nie mieści się w jednej linii na telefonie.
    for (const styl of Object.values(DEFAULT_CATEGORIES)) {
      expect(styl.label.length).toBeLessThanOrEqual(22);
    }
  });
});
