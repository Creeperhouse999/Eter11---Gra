import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

/**
 * Adam: „zaktualizuj instrukcję do druku i upewnij się, że każdy element
 * tekstowy mogę edytować" — „Czym są karty" i „Jak rozłożyć kartę postaci"
 * (strona „Jak grać" wydruku) były wpisane wprost w komponencie wydruku;
 * teraz mają tu własne zakładki, jak reszta wstępu.
 */
describe('StoryEditor — nowe zakładki wydruku', () => {
  it('pokazuje zakładki „Czym są karty" i „Jak rozłożyć kartę postaci" z treścią wbudowaną', () => {
    render(<StoryEditor intro={DEFAULT_INTRO} onChange={vi.fn()} />);

    fireEvent.click(screen.getByText('Czym są karty'));
    expect(screen.getByDisplayValue(DEFAULT_INTRO.cardTypes![0].heading)).toBeDefined();

    fireEvent.click(screen.getByText('Jak rozłożyć kartę postaci'));
    expect(screen.getByDisplayValue(DEFAULT_INTRO.characterLayout![0].heading)).toBeDefined();
  });

  it('edycja treści w zakładce „Czym są karty" woła onChange z nową wartością', () => {
    const onChange = vi.fn();
    render(<StoryEditor intro={DEFAULT_INTRO} onChange={onChange} />);
    fireEvent.click(screen.getByText('Czym są karty'));

    const pierwszyNaglowek = screen.getByDisplayValue(DEFAULT_INTRO.cardTypes![0].heading);
    fireEvent.change(pierwszyNaglowek, { target: { value: 'Karta mocy' } });

    expect(onChange.mock.calls[0][0].intro.cardTypes[0].heading).toBe('Karta mocy');
    // Reszta wstępu (np. `story`) ma zostać nietknięta.
    expect(onChange.mock.calls[0][0].intro.story).toEqual(DEFAULT_INTRO.story);
  });
});
