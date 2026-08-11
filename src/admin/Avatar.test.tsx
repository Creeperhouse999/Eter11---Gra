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

    const team = ['Alan', 'Adam', 'Marcin', 'Joanna'].map(colorOf);
    expect(new Set(team).size).toBe(team.length);
    // Żaden nie spada do palety kategorii (te są zmiennymi CSS).
    team.forEach((color) => expect(color).not.toContain('var('));
    // Claude stoi osobno: jego kółko bierze tło z motywu (zmienna CSS), bo to
    // znak ma być zawsze pomarańczowy, a zmieniać się ma tło pod nim.
    expect(colorOf('Claude')).toContain('var(');
  });

  /**
   * Kolory zespołu przeniosły się z kodu do bazy — admin ustawia je w
   * zakładce Zespół. Kolor podany jawnie musi bić stałą mapę, inaczej ustawienie
   * nowego odcienia komuś z listy (Adam, Alan…) nie dałoby żadnego efektu.
   */
  const colorOf = (element: HTMLElement) => element.style.background;

  it('podany kolor wygrywa ze stałą mapą zespołu', () => {
    const withOwn = render(
      <Avatar name="Adam" color="#123456" />,
    ).container.firstChild as HTMLElement;
    const fromMap = render(<Avatar name="Adam" />).container.firstChild as HTMLElement;

    expect(colorOf(withOwn)).toBe('rgb(18, 52, 86)');
    expect(colorOf(withOwn)).not.toBe(colorOf(fromMap));
  });

  it('podany kolor wygrywa też z paletą, gdy imienia nie ma w mapie', () => {
    const withOwn = render(
      <Avatar name="Celina" color="#abcdef" />,
    ).container.firstChild as HTMLElement;
    expect(colorOf(withOwn)).toBe('rgb(171, 205, 239)');
  });

  it('bez koloru zachowuje się jak dotąd', () => {
    // `color` jest opcjonalny — wszystkie miejsca poza zakładką Zespół nadal
    // renderują Avatar bez niego i mają dostać kolor z imienia.
    const explicitUndefined = render(
      <Avatar name="Marcin" color={undefined} />,
    ).container.firstChild as HTMLElement;
    const plain = render(<Avatar name="Marcin" />).container.firstChild as HTMLElement;
    expect(colorOf(explicitUndefined)).toBe(colorOf(plain));
  });

  it('uszkodzony kolor z bazy nie zostawia awatara bez tła', () => {
    // Pusty string albo ucięty zapis trafiony prosto do `background` dałby
    // inicjał na tle panelu — niewidoczny. Wtedy wracamy do koloru z imienia.
    const fallback = colorOf(render(<Avatar name="Adam" />).container.firstChild as HTMLElement);

    ['', '#12345', 'red; position:fixed'].forEach((broken) => {
      const el = render(<Avatar name="Adam" color={broken} />).container.firstChild as HTMLElement;
      expect(colorOf(el)).toBe(fallback);
    });
  });

  it('Claude nosi swój znak zamiast litery', () => {
    // W wątku ma być od razu widać, że to nie człowiek z zespołu. Znak jest
    // ścieżką SVG w kolorze tła, więc skaluje się i działa w obu motywach.
    const { container } = render(<Avatar name="Claude" />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.textContent).toBe('');
  });

  it('pozostali nadal mają inicjał', () => {
    const { container } = render(<Avatar name="Adam" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toBe('A');
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
