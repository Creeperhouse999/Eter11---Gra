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
});
