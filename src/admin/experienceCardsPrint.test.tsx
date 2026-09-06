import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrintCards } from './PrintCards';
import { validateContent } from '../firebase/validate';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { INTRO_RULES } from '../data/intro';
import { DEFAULT_EXPERIENCE_CARDS } from '../data/experienceCards';

/**
 * Adam: „zrób do druku karty doświadczeń (dodaj do zakładki »Karty« kategorię
 * karty doświadczeń) oraz dodaj do kart do druku (…) ilość 4 (…) Dodaj do
 * instrukcji akapit tłumaczący, że grę możesz wygrać na 3 poziomach".
 *
 * Trzy rzeczy do sprawdzenia: wydruk daje dokładnie tyle kartoników, ile
 * zamówiono; zły zapis z panelu nie przechodzi do wydruku po cichu; instrukcja
 * ma akapit o trzech poziomach — i mówi to samo, co silnik.
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));

describe('karty doświadczeń na wydruku', () => {
  it('drukuje po cztery sztuki każdego z trzech rodzajów', () => {
    render(<PrintCards content={BUILTIN_CONTENT} />);
    for (const def of DEFAULT_EXPERIENCE_CARDS) {
      expect(
        screen.getAllByTestId(`experience-${def.kind}`),
        `rodzaj ${def.kind}`,
      ).toHaveLength(4);
    }
    expect(screen.getByText(/12 szt\./)).toBeTruthy();
  });

  it('liczba sztuk z panelu ma pierwszeństwo', () => {
    render(
      <PrintCards
        content={{
          ...BUILTIN_CONTENT,
          experienceCards: [{ kind: 'solve', title: 'T', text: 'Z', count: 2 }],
        }}
      />,
    );
    expect(screen.getAllByTestId('experience-solve')).toHaveLength(2);
    expect(screen.queryByTestId('experience-share')).toBeNull();
  });

  it('każda karta niesie tytuł i zdanie, za co się ją dostaje', () => {
    render(<PrintCards content={BUILTIN_CONTENT} />);
    const [pierwsza] = screen.getAllByTestId('experience-solve');
    expect(pierwsza.textContent).toContain(DEFAULT_EXPERIENCE_CARDS[0].title);
    expect(pierwsza.textContent).toContain(DEFAULT_EXPERIENCE_CARDS[0].text);
  });
});

describe('walidacja kart doświadczeń', () => {
  const z = (experienceCards: unknown) => validateContent({ ...BUILTIN_CONTENT, experienceCards });

  it('treść wbudowana przechodzi', () => {
    expect(validateContent(BUILTIN_CONTENT).ok).toBe(true);
  });

  it('zła liczba sztuk nie przechodzi — NaN wywróciłoby wydruk', () => {
    expect(z([{ kind: 'solve', title: 'T', text: 'Z', count: 'cztery' }]).ok).toBe(false);
    expect(z([{ kind: 'solve', title: 'T', text: 'Z', count: -1 }]).ok).toBe(false);
    expect(z([{ kind: 'solve', title: 'T', text: 'Z', count: 2.5 }]).ok).toBe(false);
  });

  it('literówka „44" nie da czterdziestu stron', () => {
    expect(z([{ kind: 'solve', title: 'T', text: 'Z', count: 44 }]).ok).toBe(false);
  });

  it('nieznany rodzaj i pusty tytuł są błędem', () => {
    expect(z([{ kind: 'luck', title: 'T', text: 'Z', count: 1 }]).ok).toBe(false);
    expect(z([{ kind: 'solve', title: '  ', text: 'Z', count: 1 }]).ok).toBe(false);
  });

  it('tekst zamiast listy jest błędem', () => {
    expect(z('cztery').ok).toBe(false);
  });
});

describe('instrukcja: trzy sposoby na wygraną', () => {
  const scena = INTRO_RULES.find((s) => s.heading === 'Trzy sposoby na wygraną');

  it('akapit istnieje w zasadach', () => {
    expect(scena).toBeTruthy();
  });

  /**
   * Akapit ma mówić to samo, co silnik: spełnienie to komplet pięciu kart
   * PLUS doświadczenie za rozwiązanie i za uczenie (`fulfillmentProgress`).
   * Gdyby papier obiecywał coś innego niż ekran finału, dzieci przy stole
   * i dzieci przy ekranie grałyby w dwie różne gry.
   */
  it('wymienia wszystkie trzy poziomy i warunek uczenia innych', () => {
    const tekst = scena!.body.toLowerCase();
    expect(tekst).toContain('wspólny sukces');
    expect(tekst).toContain('sukces indywidualny');
    expect(tekst).toContain('spełnienie postaci');
    expect(tekst).toContain('uczenie innych');
  });

  it('tłumaczy ideę: rozwój bez wygranej', () => {
    expect(scena!.body).toContain('Nie trzeba wygrać wszystkiego naraz');
  });
});
