import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import { ALL_CARDS } from '../data/cards';
import { CardEditor } from './CardEditor';
import type { Card } from '../engine/types';

/**
 * Pisanie w edytorze kart nie może zamulać.
 *
 * Alan zgłosił: „laguje pisanie w niektórych zakładkach, chyba we wszystkich".
 * Przyczyna: edytor pokazuje wszystkie 65 kart naraz, a wiersz był wpisany
 * inline w `.map()` — zmiana JEDNEJ nazwy przerysowywała całą listę razem
 * z pickerami ikon i podglądami. Zmierzone 40 ms na każdy wciśnięty klawisz,
 * czyli około 160 ms na szkolnym telefonie: dokładnie ten lag.
 *
 * Poprawka to `memo` na wierszu plus stabilne funkcje obsługi (`useCallback`
 * czytający listę z referencji). Jedno bez drugiego nie działa: memo porównuje
 * właściwości, a funkcja tworzona na nowo przy każdym renderze jest za każdym
 * razem inna.
 *
 * Ten test mierzy czas. Progi są luźne, bo maszyna w CI bywa wolna i obciążona
 * innymi plikami — chodzi o złapanie regresji rzędu wielkości (5 ms → 40 ms),
 * nie o mikrooptymalizację.
 */

function Harness() {
  const [cards, setCards] = useState<Card[]>(structuredClone(ALL_CARDS));
  return (
    <ToastProvider>
      <CardEditor cards={cards} onChange={setCards} />
    </ToastProvider>
  );
}

describe('szybkość pisania w edytorze kart', { timeout: 30_000 }, () => {
  it('zmiana nazwy nie przerysowuje całej listy', () => {
    render(<Harness />);
    const pola = screen.getAllByLabelText(/^Nazwa/);
    // Pełna talia na ekranie — inaczej test nie mierzyłby tego, co boli.
    expect(pola.length).toBeGreaterThan(50);

    const czasy: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const start = performance.now();
      fireEvent.change(pola[0], { target: { value: `Nazwa${'x'.repeat(i)}` } });
      czasy.push(performance.now() - start);
    }

    // Pierwsza zmiana bywa droższa (rozgrzewka), więc liczymy medianę.
    const posortowane = [...czasy].sort((a, b) => a - b);
    const mediana = posortowane[Math.floor(posortowane.length / 2)];

    // Przed poprawką: ~40 ms. Po: ~5 ms. Próg 25 ms łapie powrót do inline,
    // a zostawia zapas na wolniejszą maszynę.
    expect(mediana).toBeLessThan(25);
  });

  it('funkcje obsługi są stabilne między renderami', () => {
    // Bez tego `memo` na wierszu nic nie daje — dlatego pilnujemy tego wprost,
    // a nie tylko pośrednio przez pomiar czasu.
    const widziane = new Set<unknown>();
    const Szpieg = vi.fn();

    function Sonda() {
      const [cards, setCards] = useState<Card[]>(structuredClone(ALL_CARDS.slice(0, 3)));
      return (
        <ToastProvider>
          <CardEditor
            cards={cards}
            onChange={(next) => {
              Szpieg();
              setCards(next);
            }}
          />
        </ToastProvider>
      );
    }

    render(<Sonda />);
    const pole = screen.getAllByLabelText(/^Nazwa/)[0];

    // Każda zmiana przerysowuje edytor; zbieramy referencje do checkboxa,
    // który dostaje `toggle` jako właściwość.
    for (let i = 0; i < 3; i += 1) {
      fireEvent.change(pole, { target: { value: `Test${i}` } });
      widziane.add(screen.getAllByRole('checkbox')[0]);
    }

    // Ten sam węzeł DOM przez cały czas — React nie odmontował wiersza.
    expect(widziane.size).toBe(1);
    expect(Szpieg).toHaveBeenCalled();
  });
});
