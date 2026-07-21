import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GameApp } from './GameApp';

/**
 * Wstęp pokazuje się tylko przy pierwszym wejściu i zapisuje to w
 * localStorage. Testy sprawdzają menu i rozgrywkę, więc udajemy gracza,
 * który wstęp już widział — inaczej każdy z nich zaczynałby od historii.
 */
beforeEach(() => {
  localStorage.setItem('eter11:intro-seen', '1');
});

/** Ekran startowy: imiona i start bez samouczka. */
function startGame() {
  render(<GameApp />);
  const inputs = screen.getAllByPlaceholderText('Imię');
  fireEvent.change(inputs[0], { target: { value: 'Ala' } });
  fireEvent.change(inputs[1], { target: { value: 'Bartek' } });
  fireEvent.click(screen.getByRole('button', { name: /Zaczynamy misję/ }));
}

describe('GameApp — ekran startowy', () => {
  it('pokazuje tytuł gry', () => {
    render(<GameApp />);
    expect(screen.getByRole('heading', { name: 'ETER11' })).toBeDefined();
  });

  it('proponuje samouczek jako pierwszą opcję', () => {
    render(<GameApp />);
    expect(screen.getByRole('button', { name: /Naucz mnie grać/ })).toBeDefined();
  });

  it('samouczek startuje bez wpisywania imion', () => {
    render(<GameApp />);

    // Zwykła gra czeka na imiona, samouczek nie — gra w nim jedna osoba.
    fireEvent.click(screen.getByRole('button', { name: /Zaczynamy misję/ }));
    expect(screen.queryByRole('button', { name: 'Odkryj problem' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Naucz mnie grać/ }));
    expect(screen.getByText(/ETER11/)).toBeDefined();
  });

  it('samouczek startuje od razu, bez pytania o misję', () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole('button', { name: /Naucz mnie grać/ }));

    // Bez ekranu „Odkryj problem" — samouczek wchodzi prosto do misji.
    expect(screen.queryByRole('button', { name: /Odkryj problem/ })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Samouczek' })).toBeDefined();
  });

  it('samouczek prowadzi jednego gracza z odkrytą ręką', () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole('button', { name: /Naucz mnie grać/ }));

    // Jedna karta postaci — nikt nie czeka na swoją kolej.
    expect(screen.getAllByLabelText(/Karta postaci/)).toHaveLength(1);
    // Ręka odkryta od startu: chowanie kart przed samym sobą nie ma sensu.
    expect(screen.queryByRole('button', { name: /Pokaż moje karty/ })).toBeNull();
    expect(screen.queryByText(/Karty są zakryte/)).toBeNull();
  });

  it('nie zaczyna gry bez imion i mówi, czego brakuje', () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole('button', { name: /Zaczynamy misję/ }));

    // Gra się nie zaczyna — nadal widać ekran ustawień, nie planszę.
    expect(screen.queryByRole('button', { name: 'Odkryj problem' })).toBeNull();
    // Puste pola są oznaczone, żeby gracz wiedział, gdzie kliknąć.
    const inputs = screen.getAllByPlaceholderText('Imię');
    expect(inputs[0].className).toContain('border-danger');
  });

  it('pozwala zacząć po wpisaniu imion', () => {
    startGame();
    expect(screen.getByRole('button', { name: 'Odkryj problem' })).toBeDefined();
  });

  it('pozwala dodać trzeciego gracza', () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj gracza' }));
    expect(screen.getAllByPlaceholderText('Imię')).toHaveLength(3);
  });
});

describe('GameApp — misja', () => {
  it('odkrycie problemu pokazuje planszę z pięcioma ściankami', () => {
    startGame();
    fireEvent.click(screen.getByRole('button', { name: 'Odkryj problem' }));

    expect(screen.getByText(/Runda/)).toBeDefined();
    // Pięć ścianek jako przyciski z etykietami kategorii.
    for (const label of ['Psychologiczna', 'Cyfrowa', 'Społeczna', 'Mentor', 'Talent']) {
      expect(
        screen.getAllByLabelText(new RegExp(label)).length,
        `brak ścianki ${label}`,
      ).toBeGreaterThan(0);
    }
  });

  it('karty są domyślnie zakryte', () => {
    startGame();
    fireEvent.click(screen.getByRole('button', { name: 'Odkryj problem' }));
    expect(screen.getByText(/Karty są zakryte/)).toBeDefined();
  });

  it('przycisk odsłania rękę aktywnego gracza', () => {
    startGame();
    fireEvent.click(screen.getByRole('button', { name: 'Odkryj problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż moje karty' }));
    expect(screen.queryByText(/Karty są zakryte/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Zakryj karty' })).toBeDefined();
  });

  it('zmiana tury automatycznie zakrywa karty', () => {
    startGame();
    fireEvent.click(screen.getByRole('button', { name: 'Odkryj problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż moje karty' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pasuję' }));
    expect(screen.getByText(/Karty są zakryte/)).toBeDefined();
  });

  it('podpowiada, żeby odkryć karty, zanim gracz je zobaczy', () => {
    startGame();
    fireEvent.click(screen.getByRole('button', { name: 'Odkryj problem' }));

    expect(screen.getByRole('status').textContent).toMatch(/odkryj karty/i);
  });

  it('po odkryciu kart mówi, ile z nich pasuje', () => {
    startGame();
    fireEvent.click(screen.getByRole('button', { name: 'Odkryj problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż moje karty' }));

    expect(screen.getByRole('status').textContent).toMatch(
      /pasuj|nie pasuje|Wymień|spasuj/i,
    );
  });

  it('wybór karty podpowiada, gdzie ją położyć', () => {
    startGame();
    fireEvent.click(screen.getByRole('button', { name: 'Odkryj problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż moje karty' }));

    const hand = screen.getByRole('region', { name: /Ręka gracza/ });
    const cardButtons = within(hand).getAllByRole('button', { pressed: false });
    fireEvent.click(cardButtons[0]);

    // Coach mówi albo gdzie karta pasuje, albo że nie pasuje nigdzie.
    expect(screen.getByRole('status').textContent).toMatch(
      /ścianki|ścianka|nie pasuje/i,
    );
  });

  it('pokazuje postęp zamykania ścianek', () => {
    startGame();
    fireEvent.click(screen.getByRole('button', { name: 'Odkryj problem' }));

    // Pięć ścianek problemu, żadna jeszcze niezamknięta.
    expect(screen.getByLabelText(/Zamknięte ścianki: 0 z 5/)).toBeDefined();
  });
});
