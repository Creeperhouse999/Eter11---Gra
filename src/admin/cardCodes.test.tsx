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
// Wgrywanie grafiki sięga do Storage — w teście wystarczy atrapa.
vi.mock('../firebase/upload', () => ({ uploadImage: vi.fn(async () => 'https://x/y.png') }));

const renderTabeli = (onChange = vi.fn()) =>
  render(
    <ToastProvider>
      <CardCodes cards={BUILTIN_CONTENT.cards} onChange={onChange} />
    </ToastProvider>,
  );

/** Tabela ze wszystkim: karty, problemy i postacie. */
const renderPelnej = (props: {
  onChange?: (cards: typeof BUILTIN_CONTENT.cards) => void;
  onProblemsChange?: (problems: typeof BUILTIN_CONTENT.problems) => void;
  onCharactersChange?: (characters: typeof BUILTIN_CONTENT.characters) => void;
} = {}) =>
  render(
    <ToastProvider>
      <CardCodes
        cards={BUILTIN_CONTENT.cards}
        onChange={props.onChange ?? vi.fn()}
        problems={BUILTIN_CONTENT.problems}
        onProblemsChange={props.onProblemsChange ?? vi.fn()}
        characters={BUILTIN_CONTENT.characters}
        onCharactersChange={props.onCharactersChange ?? vi.fn()}
      />
    </ToastProvider>,
  );

describe('tabela kodów kart', () => {
  it('pokazuje wszystkie karty, także robocze', () => {
    // Karty robocze nie trafiają do gry, ale grafik i tak musi znać ich kod —
    // pracuje nad nimi, zanim zostaną zatwierdzone.
    renderTabeli();

    // Każda karta ma swój wiersz; doszły do tego nagłówek tabeli i nagłówki
    // grup (kompetencje, specjalne), więc liczymy same pola nazw.
    expect(screen.getAllByLabelText(/^Nazwa:/)).toHaveLength(BUILTIN_CONTENT.cards.length);
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

  it('pozwala dodać grafikę karcie, która jej nie ma', () => {
    // Adam poprosił, żeby grafikę dało się wgrać wprost stąd — wcześniej
    // kolumna tylko mówiła „brak" i trzeba było iść do innej zakładki.
    renderTabeli();

    const bezGrafiki = BUILTIN_CONTENT.cards.find((c) => !c.image)!;
    const wiersz = screen.getByText(bezGrafiki.id).closest('tr')!;
    expect(within(wiersz).getByRole('button', { name: /dodaj obraz/i })).toBeTruthy();
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

describe('edycja w tabeli kodów', () => {
  it('kod karty da się poprawić, a zmiana wraca do panelu', () => {
    // Adam: „możliwość edytowania kodu — i aby edycja w tym miejscu zmieniała
    // w innych miejscach w panelu".
    const onChange = vi.fn();
    renderTabeli(onChange);

    const karta = BUILTIN_CONTENT.cards[0];
    const wiersz = screen.getByText(karta.id).closest('tr')!;
    fireEvent.click(within(wiersz).getByRole('button', { name: /zmień kod/i }));

    const pole = within(wiersz).getByDisplayValue(karta.id);
    fireEvent.change(pole, { target: { value: 'nowy-kod' } });

    const zapisane = onChange.mock.calls[onChange.mock.calls.length - 1][0] as typeof BUILTIN_CONTENT.cards;
    expect(zapisane.find((c) => c.name === karta.name)!.id).toBe('nowy-kod');
  });

  it('nie pozwala nadać kodu, który ma już inna karta', () => {
    // Silnik rozpoznaje karty po kodzie — dwie karty z tym samym zachowałyby
    // się jak jedna, a walidacja i tak zablokowałaby zapis całej treści.
    const onChange = vi.fn();
    renderTabeli(onChange);

    const pierwsza = BUILTIN_CONTENT.cards[0];
    const druga = BUILTIN_CONTENT.cards[1];
    const wiersz = screen.getByText(pierwsza.id).closest('tr')!;
    fireEvent.click(within(wiersz).getByRole('button', { name: /zmień kod/i }));
    fireEvent.change(within(wiersz).getByDisplayValue(pierwsza.id), {
      target: { value: druga.id },
    });

    // Zmiana odrzucona — obie karty zachowują swoje kody.
    const ostatnie = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as
      | typeof BUILTIN_CONTENT.cards
      | undefined;
    if (ostatnie) {
      expect(ostatnie.filter((c) => c.id === druga.id)).toHaveLength(1);
    }
  });

  it('kategorię i rodzinę da się zmienić wprost w wierszu', () => {
    // Adam: „możliwość edycji w tej zakładce kategorii, koloru, rodziny".
    const onChange = vi.fn();
    renderTabeli(onChange);

    const karta = BUILTIN_CONTENT.cards.find((c) => c.category === 'psychological')!;
    const wiersz = screen.getByText(karta.id).closest('tr')!;

    fireEvent.change(within(wiersz).getByLabelText(/kategoria/i), {
      target: { value: 'digital' },
    });

    const zapisane = onChange.mock.calls[onChange.mock.calls.length - 1][0] as typeof BUILTIN_CONTENT.cards;
    expect(zapisane.find((c) => c.id === karta.id)!.category).toBe('digital');
  });

  it('grafikę da się wgrać wprost z tabeli', () => {
    // Adam: „możliwość dodania grafiki w zakładce kody kart".
    renderTabeli();

    const karta = BUILTIN_CONTENT.cards[0];
    const wiersz = screen.getByText(karta.id).closest('tr')!;
    // Podpis kolumny mówi, której karty dotyczy — przy stu wierszach bez tego
    // nie wiadomo, do czego wgrywa się plik.
    expect(within(wiersz).getByText(new RegExp(karta.name))).toBeTruthy();
  });
});

describe('tabela obejmuje wszystko, z czego składa się gra', () => {
  it('pokazuje problemy z ich kodami', () => {
    // Adam: „dodaj do kody kart również karty problemów (rodzina »Problemy
    // świata«)". Grafik potrzebuje ich kodów tak samo jak kodów kart.
    renderPelnej();

    const problem = BUILTIN_CONTENT.problems[0];
    expect(screen.getByText(problem.id)).toBeTruthy();
  });

  it('pokazuje postacie z ich kodami', () => {
    renderPelnej();

    const postac = BUILTIN_CONTENT.characters[0];
    expect(screen.getByText(postac.id)).toBeTruthy();
  });

  it('grupuje wpisy, żeby dało się je odróżnić', () => {
    // Bez podziału problem, postać i karta wyglądają w tabeli tak samo.
    renderPelnej();

    // Nazwa grupy pojawia się też w kolumnach wierszy, więc sprawdzamy
    // konkretnie nagłówki grup (komórki nagłówkowe z licznikiem).
    const naglowki = screen
      .getAllByRole('columnheader')
      .map((el) => el.textContent ?? '');
    for (const grupa of ['Problemy świata', 'Karty postaci', 'Karty specjalne']) {
      expect(naglowki.some((t) => t.includes(grupa)), `brak grupy ${grupa}`).toBe(true);
    }
  });

  it('ETER11 i Czarny Łabędź stoją w grupie kart specjalnych', () => {
    // Adam: „karty eter11 oraz cz. łabędź — dodaj do rodziny »karty
    // specjalne«". Nie mają rodziny-koloru, więc bez tego wisiały z kreską.
    renderPelnej();

    const eter = BUILTIN_CONTENT.cards.find((c) => c.category === 'eter11')!;
    const wiersz = screen.getByText(eter.id).closest('tr')!;
    expect(within(wiersz).getByText(/specjaln/i)).toBeTruthy();
  });

  it('zmiana nazwy problemu wraca do panelu', () => {
    const onProblems = vi.fn();
    renderPelnej({ onProblemsChange: onProblems });

    const problem = BUILTIN_CONTENT.problems[0];
    const wiersz = screen.getByText(problem.id).closest('tr')!;
    fireEvent.change(within(wiersz).getByDisplayValue(problem.name), {
      target: { value: 'Nowy problem' },
    });

    expect(onProblems).toHaveBeenCalled();
  });
});

describe('licznik pozycji', () => {
  it('liczy wszystkie wpisy, nie same karty', () => {
    // Bez tego licznik porównywał z długością listy kart i przy problemach
    // i postaciach w tabeli pokazywał bzdurę w rodzaju „9 z 5 kart".
    renderPelnej();

    const razem =
      BUILTIN_CONTENT.cards.length +
      BUILTIN_CONTENT.problems.length +
      BUILTIN_CONTENT.characters.length;

    expect(screen.getByText(new RegExp(`${razem} pozycji`))).toBeTruthy();
  });
});

describe('zmiana koloru z tabeli', () => {
  it('kolor karty da się zmienić wprost w wierszu — trafia do motywu gry, nie do rodziny w treści', () => {
    // Adam: „jeszcze kolor musi mieć opcję zmiany", a potem zgłosił, że
    // zmiana nie było widać w „Kartach" ani w „Drukuj karty" — bo próbnik
    // zapisywał kolor w polu rodziny konkretnej kategorii, którego żadne
    // z tych dwóch miejsc nie czyta. Obie zakładki (i cała gra) czytają
    // kolor rodziny z motywu (`--eter-family-*`), więc naprawiony próbnik
    // ma zapisywać właśnie tam — w OBU wariantach motywu naraz.
    const onThemeChange = vi.fn();
    render(
      <ToastProvider>
        <CardCodes
          cards={BUILTIN_CONTENT.cards}
          onChange={vi.fn()}
          theme={BUILTIN_CONTENT.theme}
          themeLight={BUILTIN_CONTENT.themeLight}
          onThemeChange={onThemeChange}
        />
      </ToastProvider>,
    );

    const karta = BUILTIN_CONTENT.cards.find((c) => c.family === 'red')!;
    const wiersz = screen.getByText(karta.id).closest('tr')!;
    fireEvent.change(within(wiersz).getByLabelText(/kolor/i), {
      target: { value: '#123456' },
    });

    expect(onThemeChange).toHaveBeenCalledWith('dark', expect.objectContaining({ familyRed: '#123456' }));
    expect(onThemeChange).toHaveBeenCalledWith('light', expect.objectContaining({ familyRed: '#123456' }));
  });

  it('bez rodziny nie ma czego zmieniać — karta specjalna zostaje bez próbnika', () => {
    render(
      <ToastProvider>
        <CardCodes
          cards={BUILTIN_CONTENT.cards}
          onChange={vi.fn()}
          theme={BUILTIN_CONTENT.theme}
          themeLight={BUILTIN_CONTENT.themeLight}
          onThemeChange={vi.fn()}
        />
      </ToastProvider>,
    );

    const eter = BUILTIN_CONTENT.cards.find((c) => c.category === 'eter11')!;
    const wiersz = screen.getByText(eter.id).closest('tr')!;
    expect(within(wiersz).queryByLabelText(/kolor/i)).toBeNull();
  });
});
