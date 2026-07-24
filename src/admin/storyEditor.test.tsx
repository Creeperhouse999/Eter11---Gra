import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoryEditor } from './StoryEditor';
import { DEFAULT_INTRO, type IntroContent } from '../data/intro';

/**
 * Edytor wstępu nie może wywracać się na wstępie zapisanym przed dodaniem
 * którejś części. `intro ?? DEFAULT_INTRO` ratowało tylko wstęp nieistniejący
 * w całości; częściowy (bez klucza `adults`) przechodził, a pasek zakładek
 * czyta `current[part].length` dla KAŻDEJ części — więc brak jednej blankował
 * cały edytor.
 */
describe('StoryEditor — częściowy wstęp', () => {
  it('nie wywraca się na wstępie bez części „Dla dorosłych"', () => {
    // Zapis sprzed dodania części adults: klucz nieobecny.
    const partial = {
      story: DEFAULT_INTRO.story,
      rules: DEFAULT_INTRO.rules,
    } as unknown as IntroContent;

    expect(() => render(<StoryEditor intro={partial} onChange={vi.fn()} />)).not.toThrow();

    // Zakładka „Dla dorosłych" istnieje mimo braku danych — z liczbą scen
    // z wersji wbudowanej.
    expect(screen.getByText('Dla dorosłych')).toBeDefined();
  });

  it('nie wywraca się na części zapisanej jako nie-tablica', () => {
    const corrupt = {
      story: DEFAULT_INTRO.story,
      rules: null,
      adults: DEFAULT_INTRO.adults,
    } as unknown as IntroContent;

    expect(() => render(<StoryEditor intro={corrupt} onChange={vi.fn()} />)).not.toThrow();
  });
});
