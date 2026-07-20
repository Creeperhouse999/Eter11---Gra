import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GameApp } from './GameApp';

/** Przechodzi ekran startowy: wpisuje imiona i zaczyna grę. */
function startGame() {
  render(<GameApp />);
  const inputs = screen.getAllByPlaceholderText('Wpisz imię');
  fireEvent.change(inputs[0], { target: { value: 'Ala' } });
  fireEvent.change(inputs[1], { target: { value: 'Bartek' } });
  fireEvent.click(screen.getByRole('button', { name: 'Zaczynamy misję' }));
}

describe('GameApp — ekran startowy', () => {
  it('pokazuje tytuł gry', () => {
    render(<GameApp />);
    expect(screen.getByRole('heading', { name: 'ETER11' })).toBeDefined();
  });

  it('blokuje start bez imion graczy', () => {
    render(<GameApp />);
    const start = screen.getByRole('button', { name: 'Zaczynamy misję' });
    expect(start.hasAttribute('disabled')).toBe(true);
  });

  it('pozwala zacząć po wpisaniu imion', () => {
    startGame();
    expect(screen.getByRole('button', { name: 'Odkryj problem' })).toBeDefined();
  });

  it('pozwala dodać trzeciego gracza', () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj gracza' }));
    expect(screen.getAllByPlaceholderText('Wpisz imię')).toHaveLength(3);
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

  it('wybór karty podpowiada, co zrobić dalej', () => {
    startGame();
    fireEvent.click(screen.getByRole('button', { name: 'Odkryj problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż moje karty' }));

    const hand = screen.getByRole('region', { name: /Ręka gracza/ });
    const cardButtons = within(hand).getAllByRole('button', { pressed: false });
    fireEvent.click(cardButtons[0]);

    expect(screen.getByText(/Kliknij ściankę/)).toBeDefined();
  });
});
