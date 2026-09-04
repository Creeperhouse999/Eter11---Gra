import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { CardCodes } from './CardCodes';

/**
 * Tabela kodów kart.
 *
 * Adam poprosił: „zrób osobną zakładkę »Kody kart«, aby tam była lista
 * wszystkich kart z kodem, prosta czytelna tabela — nazwa, kod, rodzina,
 * kolor, grafika. I aby można było łatwo edytować z poziomu tej tabelki".
 *
 * Kod karty to jej identyfikator (np. `psy-r-odpornosc`) — ten sam, po którym
 * biblioteka grafik dopasowuje wgrany plik do karty. Grafikom potrzebna jest
 * lista tych kodów, żeby wiedzieli, jak nazwać pliki.
 *
 * Kluczowa różnica wobec zakładki „Karty": tutaj widać WSZYSTKO naraz w jednym
 * wierszu, bez rozwijania. Chodzi o przegląd i szybką poprawkę, nie o pełną
 * edycję jednej karty.
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {} }));

const renderTabeli = (onChange = vi.fn()) =>
  render(
    <ToastProvider>
      <CardCodes cards={BUILTIN_CONTENT.cards} onChange={onChange} />
    </ToastProvider>,
  );

describe('tabela kodów kart', () => {
  it('pokazuje wszystkie karty, także robocze', () => {
    // Karty robocze nie trafiają do gry, ale grafik i tak musi znać ich kod —
    // pracuje nad nimi, zanim zostaną zatwierdzone.
    renderTabeli();

    const wiersze = screen.getAllByRole('row');
    // Wiersze danych plus nagłówek.
    expect(wiersze.length).toBe(BUILTIN_CONTENT.cards.length + 1);
  });

  it('każdy wiersz pokazuje kod karty — po to jest ta tabela', () => {
    renderTabeli();

    const karta = BUILTIN_CONTENT.cards[0];
    expect(screen.getByText(karta.id)).toBeTruthy();
  });

  it('pokazuje kolor rodziny, nie tylko jej nazwę', () => {
    // Adam wymienił „rodzina" i „kolor" jako osobne kolumny: nazwa mówi, co to
    // za rodzina, a próbka koloru — jak wygląda na karcie.
    renderTabeli();

    const zRodzina = BUILTIN_CONTENT.cards.find((c) => c.family)!;
    const wiersz = screen.getByText(zRodzina.id).closest('tr')!;
    expect(within(wiersz).getByTestId('probka-koloru')).toBeTruthy();
  });

  it('mówi, czy karta ma grafikę', () => {
    renderTabeli();

    const bezGrafiki = BUILTIN_CONTENT.cards.find((c) => !c.image)!;
    const wiersz = screen.getByText(bezGrafiki.id).closest('tr')!;
    // „brak" wprost, zamiast pustej komórki — pusta wygląda jak usterka.
    expect(within(wiersz).getByText(/brak/i)).toBeTruthy();
  });

  it('zmiana nazwy w tabeli wraca do panelu i idzie do całego systemu', () => {
    // Sedno prośby: „zmiana w tej tabeli wpływa na zmiany w całym systemie".
    const onChange = vi.fn();
    renderTabeli(onChange);

    const karta = BUILTIN_CONTENT.cards[0];
    const wiersz = screen.getByText(karta.id).closest('tr')!;
    const pole = within(wiersz).getByDisplayValue(karta.name);

    fireEvent.change(pole, { target: { value: 'Nowa nazwa' } });

    expect(onChange).toHaveBeenCalled();
    const zapisane = onChange.mock.calls[onChange.mock.calls.length - 1][0] as typeof BUILTIN_CONTENT.cards;
    expect(zapisane.find((c) => c.id === karta.id)!.name).toBe('Nowa nazwa');
  });

  it('szukanie zawęża listę — przy stu kartach bez tego się nie da', () => {
    renderTabeli();

    const karta = BUILTIN_CONTENT.cards[0];
    fireEvent.change(screen.getByLabelText(/szukaj/i), { target: { value: karta.name } });

    expect(screen.getByText(karta.id)).toBeTruthy();
    // Lista naprawdę się skróciła, a nie tylko podświetliła trafienie.
    expect(screen.getAllByRole('row').length).toBeLessThan(BUILTIN_CONTENT.cards.length);
  });

  it('kod karty da się skopiować bez zaznaczania myszą', () => {
    // Grafik przepisuje kody do nazw plików — przy stu kartach ręczne
    // zaznaczanie każdego to proszenie się o literówkę.
    renderTabeli();

    const karta = BUILTIN_CONTENT.cards[0];
    const wiersz = screen.getByText(karta.id).closest('tr')!;
    expect(within(wiersz).getByRole('button', { name: /kopiuj/i })).toBeTruthy();
  });
});
