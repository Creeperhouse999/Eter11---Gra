import { describe, it, expect } from 'vitest';
import { podsumujZestaw } from './printSummary';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import type { Card, Character, Problem } from '../engine/types';

/**
 * Adam: „dodaj w instrukcji drukowanej »Podsumowanie techniczne«, gdzie
 * podsumujesz, ile jest kart problemów, postaci, specjalnych kart oraz kart
 * talentów, mentorów, psych, cyfr i społecznych".
 *
 * Cała wartość tej strony leży w tym, że liczby są PRAWDZIWE. Instrukcja idzie
 * na papier: gdy ktoś doda kartę w panelu, a wydruk mówi starą liczbę, dziecko
 * przy pierwszym przeliczeniu zestawu uzna, że czegoś brakuje. Dlatego liczymy
 * z treści gry i dlatego wersje robocze (`draft`) — które do gry nie trafiają —
 * nie mogą się doliczać.
 */

function karta(over: Partial<Card>): Card {
  return {
    id: 'k',
    name: 'Karta',
    category: 'talent',
    description: '',
    icon: 'star',
    ...over,
  };
}

describe('podsumowanie techniczne zestawu', () => {
  it('liczy karty w każdej kategorii osobno', () => {
    const wynik = podsumujZestaw({
      cards: [
        karta({ id: 'a', category: 'talent' }),
        karta({ id: 'b', category: 'talent' }),
        karta({ id: 'c', category: 'mentor' }),
        karta({ id: 'd', category: 'psychological' }),
        karta({ id: 'e', category: 'digital' }),
        karta({ id: 'f', category: 'social' }),
      ],
      problems: [],
      characters: [],
    });

    const ile = (klucz: string) => wynik.kategorie.find((k) => k.klucz === klucz)?.ile;
    expect(ile('talent')).toBe(2);
    expect(ile('mentor')).toBe(1);
    expect(ile('psychological')).toBe(1);
    expect(ile('digital')).toBe(1);
    expect(ile('social')).toBe(1);
  });

  it('nie liczy wersji roboczych — te nie trafiają do pudełka', () => {
    const wynik = podsumujZestaw({
      cards: [
        karta({ id: 'gotowa', category: 'talent' }),
        karta({ id: 'robocza', category: 'talent', draft: true }),
      ],
      problems: [
        { id: 'p1' } as Problem,
        { id: 'p2', draft: true } as Problem,
      ],
      characters: [],
    });

    expect(wynik.kategorie.find((k) => k.klucz === 'talent')?.ile).toBe(1);
    expect(wynik.problemy).toBe(1);
    expect(wynik.kartyRazem).toBe(1);
  });

  it('karty specjalne mają własną sumę', () => {
    const wynik = podsumujZestaw({
      cards: [
        karta({ id: 'e1', category: 'eter11' }),
        karta({ id: 'e2', category: 'eter11' }),
        karta({ id: 'bs', category: 'blackswan' }),
      ],
      problems: [],
      characters: [],
    });

    expect(wynik.specjalneRazem).toBe(3);
    expect(wynik.specjalne.find((s) => s.klucz === 'eter11')?.ile).toBe(2);
  });

  it('przykładem jest karta z grafiką, gdy taka w kategorii istnieje', () => {
    const wynik = podsumujZestaw({
      cards: [
        karta({ id: 'bez', category: 'mentor' }),
        karta({ id: 'zGrafika', category: 'mentor', image: 'https://x/y.png' }),
      ],
      problems: [],
      characters: [],
    });

    expect(wynik.kategorie.find((k) => k.klucz === 'mentor')?.przyklad?.id).toBe('zGrafika');
  });

  it('policzone postacie zgadzają się z listą', () => {
    const wynik = podsumujZestaw({
      cards: [],
      problems: [],
      characters: [{ id: 'c1' } as Character, { id: 'c2' } as Character],
    });
    expect(wynik.postacie).toBe(2);
  });

  it('na wbudowanej treści gry żadna kategoria nie jest pusta', () => {
    const wynik = podsumujZestaw(BUILTIN_CONTENT);
    expect(wynik.problemy).toBeGreaterThan(0);
    expect(wynik.postacie).toBeGreaterThan(0);
    for (const pozycja of [...wynik.kategorie, ...wynik.specjalne]) {
      expect(pozycja.ile, `${pozycja.nazwa} nie może być puste`).toBeGreaterThan(0);
    }
  });
});
