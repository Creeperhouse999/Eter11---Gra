import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Avatar } from './Avatar';

/**
 * Awatar niesie dwie rzeczy naraz: inicjał, żeby rozpoznać osobę, i kolor,
 * który dla tej samej osoby jest zawsze ten sam — tak w wątku poznaje się
 * mówiącego po plamie koloru, zanim przeczyta się imię.
 */
describe('Avatar', () => {
  it('pokazuje pierwszą literę imienia', () => {
    const { container } = render(<Avatar name="Alan" />);
    expect(container.textContent).toBe('A');
  });

  it('ten sam człowiek dostaje zawsze ten sam kolor', () => {
    const a = render(<Avatar name="Bartek" />).container.firstChild as HTMLElement;
    const b = render(<Avatar name="Bartek" />).container.firstChild as HTMLElement;
    expect(a.style.background).toBe(b.style.background);
  });

  it('różne imiona zwykle różnią się kolorem', () => {
    // Nie gwarancja — kolorów jest pięć — ale przy tych imionach mają wypaść
    // różne, więc test chroni przed zwróceniem stałego koloru dla wszystkich.
    const a = render(<Avatar name="Alan" />).container.firstChild as HTMLElement;
    const b = render(<Avatar name="Celina" />).container.firstChild as HTMLElement;
    expect(a.style.background).not.toBe(b.style.background);
  });

  it('puste imię nie wywala się, daje znak zapytania', () => {
    const { container } = render(<Avatar name="" />);
    expect(container.textContent).toBe('?');
  });

  it('zespół ma swoje stałe kolory, każdy inny', () => {
    // Kolor z sumy znaków trafiał kilka osób w ten sam odcień — w wątku
    // wyglądali tak samo. Ustalone kolory: Claude pomarańczowy, Alan
    // jasnoniebieski, Adam czerwony, Marcin zielony, Joanna purpurowa.
    const colorOf = (name: string) =>
      (render(<Avatar name={name} />).container.firstChild as HTMLElement).style.background;

    const team = ['Claude', 'Alan', 'Adam', 'Marcin', 'Joanna'].map(colorOf);
    expect(new Set(team).size).toBe(team.length);
    // Żaden nie spada do palety kategorii (te są zmiennymi CSS).
    team.forEach((color) => expect(color).not.toContain('var('));
  });

  it('kolor nie zależy od zapisu imienia', () => {
    // Podpis bywa raz „Adam", raz „adam", raz z nazwiskiem albo adresem —
    // to wciąż ta sama osoba, więc kolor musi być ten sam.
    const colorOf = (name: string) =>
      (render(<Avatar name={name} />).container.firstChild as HTMLElement).style.background;

    const expected = colorOf('Adam');
    expect(colorOf('adam')).toBe(expected);
    expect(colorOf('  Adam  ')).toBe(expected);
    expect(colorOf('Adam Kotlorz')).toBe(expected);
  });
});
