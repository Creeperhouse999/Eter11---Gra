import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Błąd w komponencie nie może zostawić pustego ekranu.
 *
 * Bez tej bariery dowolny wyjątek w renderze odmontowuje całe drzewo Reacta:
 * gracz przy stole widzi białą stronę, bez komunikatu i bez wyjścia.
 */

function Wybucha(): never {
  throw new Error('celowa awaria testowa');
}

beforeEach(() => {
  // React wypisuje przechwycony błąd do konsoli — w teście to tylko szum.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.clear();
});

afterEach(() => vi.restoreAllMocks());

describe('ErrorBoundary', () => {
  it('przepuszcza zawartość, gdy nic się nie psuje', () => {
    render(
      <ErrorBoundary>
        <p>plansza</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('plansza')).toBeDefined();
  });

  it('pokazuje komunikat zamiast pustego ekranu', () => {
    render(
      <ErrorBoundary>
        <Wybucha />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Coś poszło nie tak/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Odśwież stronę/ })).toBeDefined();
  });

  it('daje wyjście na wypadek, gdy to zapis jest przyczyną', () => {
    localStorage.setItem('eter11:game', '{"cokolwiek":true}');

    render(
      <ErrorBoundary>
        <Wybucha />
      </ErrorBoundary>,
    );

    const reset = screen.getByRole('button', { name: /Zacznij od nowa/ });
    expect(reset).toBeDefined();
  });

  it('pokazuje treść błędu dla zgłoszenia', () => {
    render(
      <ErrorBoundary>
        <Wybucha />
      </ErrorBoundary>,
    );

    expect(screen.getByText('celowa awaria testowa')).toBeDefined();
  });
});
