import { describe, expect, it } from 'vitest';
import { applyTheme, DEFAULT_THEME, THEME_GROUPS } from './theme';
import { DEFAULT_CATEGORIES } from './categories';
import type { CardCategory } from '../engine/types';

/**
 * Każda kategoria kart musi dać się przemalować w panelu.
 *
 * ETER11 i Czarny Łabędź miały swoje zmienne w CSS, ale nie miały pól
 * w motywie — kolor był więc ustawiony na sztywno, a zakładka „Kolory" ich
 * nie pokazywała. Jako jedyne w grze nie dawały się zmienić i nikt nie
 * wiedział dlaczego.
 */
describe('kolory kategorii w panelu', () => {
  /** `psychological` → `catPsychological` */
  const themeKey = (category: string): string =>
    `cat${category.charAt(0).toUpperCase()}${category.slice(1)}`;

  const categories = Object.keys(DEFAULT_CATEGORIES) as CardCategory[];

  it('każda kategoria ma kolor w motywie', () => {
    for (const category of categories) {
      expect(DEFAULT_THEME).toHaveProperty(themeKey(category));
    }
  });

  it('zmieniony kolor trafia na zmienną, z której korzysta karta', () => {
    // Sprawdzamy skutek, nie mapowanie: `categoryColorVar` buduje nazwę
    // zmiennej doklejając klucz kategorii, więc kolor zapisany pod inną
    // nazwą wylądowałby w motywie i nigdy nie dotarł na kartę.
    const painted = { ...DEFAULT_THEME };
    for (const category of categories) {
      painted[themeKey(category) as keyof typeof painted] = '#abcdef';
    }
    applyTheme(painted);

    for (const category of categories) {
      const value = document.documentElement.style
        .getPropertyValue(`--eter-cat-${category}`)
        .trim();
      expect(value).toBe('#abcdef');
    }

    applyTheme(DEFAULT_THEME);
  });

  it('każdy kolor kategorii da się zmienić w panelu', () => {
    const editable = new Set(
      THEME_GROUPS.flatMap((group) => group.fields.map((field) => field.key as string)),
    );

    for (const category of categories) {
      expect(editable.has(themeKey(category))).toBe(true);
    }
  });
});
