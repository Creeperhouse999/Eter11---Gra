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
 *
 * Adam zgłosił stronę po raz drugi: liczby kart specjalnych pokazywały ile
 * jest RÓŻNYCH projektów (2 ETER11, 3 Łabędzie), a nie ile sztuk trafia do
 * fizycznej talii („w talii będzie 4 eter11, 4 czarne łabędzie" — tyle, ile
 * mówi zasada „specialCardCopies" w panelu). Liczymy więc z tej samej talii,
 * którą buduje `buildDeck` dla zakładki „Drukuj karty" — stąd karty
 * kompetencji/talentów/mentorów też wychodzą w dwóch egzemplarzach, tak jak
 * naprawdę są w pudełku.
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
  it('liczy sztuki w talii, nie różne projekty — każda karta zwykła idzie w dwóch egzemplarzach', () => {
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
    expect(ile('talent')).toBe(4);
    expect(ile('mentor')).toBe(2);
    expect(ile('psychological')).toBe(2);
    expect(ile('digital')).toBe(2);
    expect(ile('social')).toBe(2);

    // Ale różnych PROJEKTÓW karty — do wizualizacji — dalej jest tyle, ile w treści.
    expect(wynik.kategorie.find((k) => k.klucz === 'talent')?.karty).toHaveLength(2);
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

    // Jedna karta gotowa, ale w talii i tak w dwóch egzemplarzach.
    expect(wynik.kategorie.find((k) => k.klucz === 'talent')?.ile).toBe(2);
    expect(wynik.problemy).toBe(1);
    expect(wynik.kartyRazem).toBe(2);
  });

  it('karty specjalne liczą się tyle razy, ile mówi zasada w panelu — nie tyle, ile jest wariantów', () => {
    const wynik = podsumujZestaw({
      cards: [
        karta({ id: 'e1', category: 'eter11' }),
        karta({ id: 'e2', category: 'eter11' }),
        karta({ id: 'bs', category: 'blackswan' }),
      ],
      problems: [],
      characters: [],
      rules: { specialCardCopies: 4 },
    });

    // Adam: „w talii będzie 4 eter11, 4 czarne łabędzie" — po 4 na kategorię,
    // razem 8, niezależnie od tego, ile jest różnych wariantów Łabędzia.
    expect(wynik.specjalne.find((s) => s.klucz === 'eter11')?.ile).toBe(4);
    expect(wynik.specjalne.find((s) => s.klucz === 'blackswan')?.ile).toBe(4);
    expect(wynik.specjalneRazem).toBe(8);

    // Różnych projektów w tej kategorii dalej jest tyle, ile faktycznie
    // istnieje — do pełnej wizualizacji każdej karty.
    expect(wynik.specjalne.find((s) => s.klucz === 'eter11')?.karty).toHaveLength(2);
  });

  it('bez podanej zasady karty specjalne nie dublują się (zgodnie z buildDeck)', () => {
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

  it('pokazuje wszystkie różne karty kategorii, nie jeden przykład', () => {
    const wynik = podsumujZestaw({
      cards: [
        karta({ id: 'bez', category: 'mentor' }),
        karta({ id: 'zGrafika', category: 'mentor', image: 'https://x/y.png' }),
      ],
      problems: [],
      characters: [],
    });

    const identyfikatory = wynik.kategorie.find((k) => k.klucz === 'mentor')?.karty.map((c) => c.id);
    expect(identyfikatory).toEqual(['bez', 'zGrafika']);
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
