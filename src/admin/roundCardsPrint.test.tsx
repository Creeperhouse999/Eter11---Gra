import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrintCards } from './PrintCards';
import { validateContent } from '../firebase/validate';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { INTRO_RULES } from '../data/intro';
import { DEFAULT_ROUND_CARDS, MAX_ROUND_CARDS, liczbaKartRund, numeryRund } from '../data/roundCards';

/**
 * Adam: „karty rund — czyli prosta karta z cyframi, 11 kart, na każdej jedna
 * cyfra 1–11 (…) dodaj do instrukcji akapit tłumaczący, że gracze ustalają,
 * ile rund chcą mieć (…) rekomendacja 5, łatwiejszy poziom 8, najwięcej 11".
 *
 * W grze na ekranie liczbę rund pilnuje silnik; przy stole nikt jej nie
 * pilnuje, dopóki nie leży na stole jako karta.
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));

describe('karty rund — liczby', () => {
  it('domyślnie jedenaście, jak podał Adam', () => {
    expect(DEFAULT_ROUND_CARDS).toBe(11);
    expect(numeryRund(undefined)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('zła wartość spada do domyślnych, nie do NaN ani zera', () => {
    expect(liczbaKartRund(0)).toBe(11);
    expect(liczbaKartRund(-3)).toBe(11);
    expect(liczbaKartRund(2.5)).toBe(11);
    expect(liczbaKartRund(NaN)).toBe(11);
  });

  it('własna liczba ma pierwszeństwo, z sufitem', () => {
    expect(numeryRund(8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(liczbaKartRund(999)).toBe(MAX_ROUND_CARDS);
  });
});

describe('karty rund na wydruku', () => {
  it('drukuje jedenaście kart z cyframi od 1 do 11', () => {
    render(<PrintCards content={BUILTIN_CONTENT} />);
    for (let n = 1; n <= 11; n += 1) {
      expect(screen.getByTestId(`round-${n}`).textContent).toContain(String(n));
    }
    expect(screen.queryByTestId('round-12')).toBeNull();
  });

  it('liczba z panelu ma pierwszeństwo', () => {
    render(<PrintCards content={{ ...BUILTIN_CONTENT, roundCards: 5 }} />);
    expect(screen.getByTestId('round-5')).toBeTruthy();
    expect(screen.queryByTestId('round-6')).toBeNull();
  });

  /**
   * Suma na przycisku ma liczyć wszystko, co wychodzi z drukarki — Adam pytał
   * kiedyś wprost, czy opis się aktualizuje. Sprawdzamy przez porównanie
   * z tym, co naprawdę jest na stronie.
   */
  it('suma na przycisku zgadza się z liczbą kart na stronie', () => {
    render(<PrintCards content={BUILTIN_CONTENT} />);
    const naEkranie = document.querySelectorAll('article').length;
    const przycisk = screen.getByRole('button', { name: /Drukuj \(\d+/ });
    expect(Number(przycisk.textContent?.match(/\d+/)?.[0])).toBe(naEkranie);
  });
});

describe('walidacja kart rund', () => {
  const z = (roundCards: unknown) => validateContent({ ...BUILTIN_CONTENT, roundCards });

  it('poprawna liczba przechodzi', () => {
    expect(z(8).errors.filter((e) => e.includes('Karty rund'))).toEqual([]);
  });

  it('tekst, zero, ułamek i nadmiar są błędem', () => {
    expect(z('jedenaście').ok).toBe(false);
    expect(z(0).ok).toBe(false);
    expect(z(5.5).ok).toBe(false);
    expect(z(MAX_ROUND_CARDS + 1).ok).toBe(false);
  });
});

describe('instrukcja: ile rund na problem', () => {
  const scena = INTRO_RULES.find((s) => s.heading === 'Ile rund na problem');

  it('akapit istnieje i podaje trzy poziomy Adama', () => {
    expect(scena).toBeTruthy();
    expect(scena!.body).toContain('5');
    expect(scena!.body).toContain('8');
    expect(scena!.body).toContain('11');
  });

  it('tłumaczy odwracanie kart i co się dzieje po ostatniej rundzie', () => {
    expect(scena!.body).toContain('odwróćcie kolejną kartę');
    expect(scena!.body.toLowerCase()).toContain('wygrywa problem');
  });
});
