import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EXPERIENCE_CARDS,
  EXPERIENCE_KIND_LABELS,
  kartyDoswiadczen,
  liczbaKartDoswiadczen,
  rozwinDoDruku,
} from './experienceCards';

/**
 * Adam: „zrób do druku karty doświadczeń (…) — Doświadczenie za rozwiązanie
 * problemu — ilość 4, Doświadczenie za uczenie innych — ilość 4, Doświadczenie
 * za rozwój postaci — ilość 4".
 *
 * Przy stole dziecko musi coś dostać do ręki, żeby wiedzieć, że coś zdobyło.
 * Te testy pilnują, że pudełko dostaje dokładnie to, co Adam zamówił, i że
 * literówka w panelu nie zrobi z tego czterdziestu stron.
 */

describe('karty doświadczeń — domyślne', () => {
  it('są trzy rodzaje po cztery sztuki, jak zamówił Adam', () => {
    expect(DEFAULT_EXPERIENCE_CARDS.map((d) => d.kind)).toEqual(['solve', 'share', 'growth']);
    for (const d of DEFAULT_EXPERIENCE_CARDS) expect(d.count, d.kind).toBe(4);
    expect(liczbaKartDoswiadczen(DEFAULT_EXPERIENCE_CARDS)).toBe(12);
  });

  it('każda ma tytuł, zdanie i nazwę rodzaju do panelu', () => {
    for (const d of DEFAULT_EXPERIENCE_CARDS) {
      expect(d.title.trim().length, d.kind).toBeGreaterThan(5);
      expect(d.text.trim().length, d.kind).toBeGreaterThan(20);
      expect(EXPERIENCE_KIND_LABELS[d.kind]).toBeTruthy();
    }
  });

  /**
   * `solve` i `share` to te same nazwy, co w silniku (`ExperienceCard.kind`),
   * żeby wydruk, instrukcja i ekran finału mówiły jednym językiem.
   */
  it('rodzaje z silnika mają swoje karty', () => {
    const kinds = new Set(DEFAULT_EXPERIENCE_CARDS.map((d) => d.kind));
    expect(kinds.has('solve')).toBe(true);
    expect(kinds.has('share')).toBe(true);
  });
});

describe('karty doświadczeń — z treści gry', () => {
  it('brak i pusta lista dają domyślne — wydruk bez nagród to nie wydruk', () => {
    expect(kartyDoswiadczen(undefined)).toBe(DEFAULT_EXPERIENCE_CARDS);
    expect(kartyDoswiadczen([])).toBe(DEFAULT_EXPERIENCE_CARDS);
  });

  it('własna lista ma pierwszeństwo', () => {
    const wlasne = [{ kind: 'solve' as const, title: 'A', text: 'B', count: 2 }];
    expect(kartyDoswiadczen(wlasne)).toBe(wlasne);
  });

  it('rozwinięcie daje tyle kartoników, ile sztuk, z osobnymi kluczami', () => {
    const karty = rozwinDoDruku([
      { kind: 'solve', title: 'A', text: 'B', count: 3 },
      { kind: 'growth', title: 'C', text: 'D', count: 1 },
    ]);
    expect(karty).toHaveLength(4);
    expect(new Set(karty.map((k) => k.id)).size).toBe(4);
    expect(karty.filter((k) => k.kind === 'solve')).toHaveLength(3);
  });

  it('ujemna liczba sztuk znaczy zero, nie wyjątek', () => {
    expect(rozwinDoDruku([{ kind: 'share', title: 'A', text: 'B', count: -2 }])).toEqual([]);
    expect(liczbaKartDoswiadczen([{ kind: 'share', title: 'A', text: 'B', count: -2 }])).toBe(0);
  });
});
