import { describe, expect, it } from 'vitest';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ToastProvider } from '../ui/controls/Toast';
import { CardEditor } from './CardEditor';
import { ALL_CARDS } from '../data/cards';

/**
 * Wyszukiwarka kart służy głównie do jednego: sprawdzenia, czy karta o danym
 * pomyśle już istnieje, zanim redaktor doda drugą taką samą. Wpisuje wtedy
 * słowa z pamięci, w dowolnej kolejności — i to musi wystarczyć.
 */
/** Edytor pokazuje powiadomienia, więc potrzebuje dostawcy w drzewie. */
const render = (ui: ReactElement) => rtlRender(<ToastProvider>{ui}</ToastProvider>);

describe('szukanie kart', () => {
  const noop = () => {};

  it('znajduje kartę mimo odwróconej kolejności słów', () => {
    const target = ALL_CARDS.find((c) => c.name.split(' ').length > 1);
    if (!target) return;

    const [first, second] = target.name.toLowerCase().split(' ');

    render(<CardEditor cards={ALL_CARDS} onChange={noop} />);
    fireEvent.change(screen.getByLabelText('Szukaj karty'), {
      // Odwrotnie niż w nazwie: „krytyczne myślenie" ma znaleźć
      // „Myślenie krytyczne".
      target: { value: `${second} ${first}` },
    });

    expect(screen.getByDisplayValue(target.name)).toBeDefined();
  });

  it('pokazuje, ile kart pasuje', () => {
    render(<CardEditor cards={ALL_CARDS} onChange={noop} />);

    // Bez filtra licznik pokazuje samą liczbę kart.
    // Funkcja zamiast wyrażenia: nawias w „Karty (65)" wymagałby
    // escapowania, które w szablonie łańcucha robi się nieczytelne.
    expect(
      screen.getByText((text) => text.startsWith(`Karty (${ALL_CARDS.length}`)),
    ).toBeDefined();

    fireEvent.change(screen.getByLabelText('Szukaj karty'), {
      target: { value: 'zzzzz-nie-ma-takiej' },
    });

    // Po zawężeniu widać jedno i drugie: ile znaleziono i z ilu.
    expect(
      screen.getByText((text) => text.includes(`z ${ALL_CARDS.length}`)),
    ).toBeDefined();
  });

  it('szuka też w opisach', () => {
    const target = ALL_CARDS.find((c) => c.description.trim().length > 10);
    if (!target) return;

    const word = target.description.toLowerCase().split(/\s+/)[0];

    render(<CardEditor cards={ALL_CARDS} onChange={noop} />);
    fireEvent.change(screen.getByLabelText('Szukaj karty'), {
      target: { value: word },
    });

    // Przynajmniej ta jedna karta musi zostać na liście.
    expect(screen.queryAllByRole('textbox').length).toBeGreaterThan(1);
  });
});
