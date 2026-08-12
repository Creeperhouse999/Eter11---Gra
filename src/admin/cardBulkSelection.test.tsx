import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render as rtlRender, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ToastProvider } from '../ui/controls/Toast';
import { CardEditor } from './CardEditor';
import { ALL_CARDS } from '../data/cards';
import type { Card } from '../engine/types';

const render = (ui: ReactElement) => rtlRender(<ToastProvider>{ui}</ToastProvider>);

/**
 * Zmiana hurtem nie może po cichu ruszyć kart, których redaktor nie widzi.
 *
 * Zaznaczenie przeżywa zmianę filtra kategorii, a operacja hurtowa działa na
 * WSZYSTKICH zaznaczonych — także na tych odfiltrowanych. Redaktor zaznacza
 * więc kilkanaście kart psychologicznych, przełącza filtr na cyfrowe (na
 * ekranie nie ma już ani jednej zaznaczonej) i zmienia rodzinę, sądząc, że
 * działa na to, co przed oczami. Zmienia wtedy karty, których nie widzi, a
 * potwierdzenie mówi tylko „Zmieniono N kart", bez słowa, że żadna z nich nie
 * była na liście.
 *
 * Poprawka: pasek zaznaczenia mówi wprost, ile zaznaczonych kart jest poza
 * bieżącym widokiem — decyzja zostaje przy redaktorze, ale podejmuje ją
 * świadomie.
 */

describe('zaznaczanie kart do zmiany hurtem', { timeout: 30_000 }, () => {
  const noop = () => {};

  /** Dwie karty z różnych kategorii — tyle wystarczy do pokazania problemu. */
  const paraZRoznychKategorii = (): Card[] => {
    const psych = ALL_CARDS.find((c) => c.category === 'psychological')!;
    const cyfr = ALL_CARDS.find((c) => c.category === 'digital')!;
    return [psych, cyfr];
  };

  it('mówi, ile zaznaczonych kart jest poza bieżącym widokiem', () => {
    const [psych] = paraZRoznychKategorii();
    render(<CardEditor cards={paraZRoznychKategorii()} onChange={noop} />);

    // Zaznaczamy kartę psychologiczną.
    const pole = screen.getByLabelText(`Zaznacz kartę ${psych.name}`);
    fireEvent.click(pole);
    expect(screen.getByText(/Zaznaczono 1/)).toBeTruthy();

    // Przełączamy widok na inną kategorię — zaznaczona karta znika z listy.
    // `Select` to własny komponent — otwiera się kliknięciem, jak w panelu.
    fireEvent.click(screen.getByRole('button', { name: 'Filtruj kategorię' }));
    const kategorie = screen.getByRole('listbox', { name: 'Filtruj kategorię' });
    fireEvent.click(within(kategorie).getByRole('option', { name: /Cyfrow/i }));

    // Sedno: pasek ma powiedzieć, że zaznaczenie dotyczy czegoś spoza ekranu.
    expect(screen.getByText(/poza widokiem/i)).toBeTruthy();
  });

  it('gdy wszystko zaznaczone jest widoczne, nie dopisuje ostrzeżenia', () => {
    const [psych] = paraZRoznychKategorii();
    render(<CardEditor cards={paraZRoznychKategorii()} onChange={noop} />);

    fireEvent.click(screen.getByLabelText(`Zaznacz kartę ${psych.name}`));

    expect(screen.getByText(/Zaznaczono 1/)).toBeTruthy();
    expect(screen.queryByText(/poza widokiem/i)).toBeNull();
  });

  it('zmiana hurtem nadal działa na zaznaczonych kartach', () => {
    const [psych] = paraZRoznychKategorii();
    const onChange = vi.fn();
    render(<CardEditor cards={paraZRoznychKategorii()} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText(`Zaznacz kartę ${psych.name}`));
    fireEvent.click(screen.getByRole('button', { name: 'Zmień rodzinę zaznaczonym' }));
    const lista = screen.getByRole('listbox', { name: 'Zmień rodzinę zaznaczonym' });
    fireEvent.click(within(lista).getByRole('option', { name: /Zielona/i }));

    expect(onChange).toHaveBeenCalled();
    const zapisane = onChange.mock.calls[onChange.mock.calls.length - 1][0] as Card[];
    expect(zapisane.find((c) => c.id === psych.id)?.family).toBe('green');
  });
});
