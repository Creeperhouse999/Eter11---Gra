import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntroScreen } from './IntroScreen';
import { INTRO_STORY } from '../../data/intro';

/**
 * Wstęp da się teraz pisać w panelu redakcyjnym. Te testy pilnują, że tekst
 * stamtąd faktycznie dociera na ekran — sama możliwość edycji jest bez
 * wartości, jeśli gra dalej pokazuje wersję z kodu.
 */
describe('IntroScreen', () => {
  const noop = () => {};

  it('pokazuje sceny z panelu zamiast wbudowanych', () => {
    render(
      <IntroScreen
        onDone={noop}
        onSkip={noop}
        intro={{
          story: [{ heading: 'Nagłówek z panelu', body: 'Treść z panelu.', icon: 'spark' }],
          rules: [],
          adults: [],
        }}
      />,
    );

    expect(screen.getByText('Nagłówek z panelu')).toBeTruthy();
    expect(screen.queryByText(INTRO_STORY[0].heading)).toBeNull();
  });

  it('wraca do tekstu wbudowanego, gdy panel nic nie zapisał', () => {
    render(<IntroScreen onDone={noop} onSkip={noop} />);

    expect(screen.getByText(INTRO_STORY[0].heading)).toBeTruthy();
  });

  it('wraca do tekstu wbudowanego, gdy redaktor skasował wszystkie sceny', () => {
    // Pusta lista to nie „wstęp bez treści", tylko „nic tu nie zapisano".
    // Bez tego dziecko zobaczyłoby pusty ekran zamiast historii.
    render(
      <IntroScreen onDone={noop} onSkip={noop} intro={{ story: [], rules: [], adults: [] }} />,
    );

    expect(screen.getByText(INTRO_STORY[0].heading)).toBeTruthy();
  });

  it('taby wstępu mają cel dotyku min-h-11 (na telefonie podpowiedź jest ukryta)', () => {
    const { container } = render(<IntroScreen onDone={noop} onSkip={noop} />);
    const nav = container.querySelector('nav[aria-label="Części wstępu"]');
    const tabs = nav?.querySelectorAll('button') ?? [];

    expect(tabs.length).toBeGreaterThan(0);
    // Bez fixu: same px-3 py-2 → ~36px, poniżej 44px celu dotyku dla dzieci.
    for (const tab of tabs) {
      expect(tab.className).toMatch(/\bmin-h-11\b/);
    }
  });
});
