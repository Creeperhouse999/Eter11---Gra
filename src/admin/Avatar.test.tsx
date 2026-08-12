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

  it('Claude ma tło z motywu, nie kolor z palety', () => {
    // Jego znak jest zawsze pomarańczowy, a zmieniać się ma tło pod nim —
    // dlatego kółko bierze kolor motywu (zmienna CSS), w odróżnieniu od
    // pozostałych, którzy mają zwykłe tło.
    const colorOf = (name: string) =>
      (render(<Avatar name={name} />).container.firstChild as HTMLElement).style.background;

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

  it('kolor nadany przez admina bije wyliczony z imienia', () => {
    // Kolory nie są już zaszyte w kodzie — ustawia je admin przy członku
    // zespołu i to one obowiązują. Kolor z imienia zostaje wyłącznie dla kont,
    // którym nikt jeszcze nic nie nadał, żeby awatar nie był pusty.
    const colorOf = (element: HTMLElement) => element.style.background;

    const nadany = render(
      <Avatar name="Adam" color="#123456" />,
    ).container.firstChild as HTMLElement;
    const wyliczony = render(<Avatar name="Adam" />).container.firstChild as HTMLElement;

    expect(colorOf(nadany)).toBe('rgb(18, 52, 86)');
    expect(colorOf(nadany)).not.toBe(colorOf(wyliczony));
  });
});
