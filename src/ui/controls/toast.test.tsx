import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

/**
 * Każdy toast znika po swoich 4 s — niezależnie od tego, że w międzyczasie
 * pojawił się kolejny.
 *
 * Regresja: `onDone` szedł jako świeża strzałka na każdym renderze providera,
 * a że dodanie/usunięcie toasta przerysowuje providera, efekt każdego toasta
 * restartował swój `setTimeout`. Odliczanie zerowało się wtedy wszystkim, więc
 * przy powiadomieniach częstszych niż co 4 s (seria zapisów w panelu) żadne
 * nie znikało — piętrzyły się na ekranie.
 */

function Harness() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast('Pierwszy')}>a</button>
      <button onClick={() => toast('Drugi')}>b</button>
    </>
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ToastProvider', () => {
  it('starszy toast znika po swoim czasie mimo pojawienia się nowego', () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText('a'));
    });
    expect(screen.getByText('Pierwszy')).toBeDefined();

    // 3 s później dochodzi drugi toast — to on dawniej zerował licznik pierwszego.
    act(() => {
      vi.advanceTimersByTime(3000);
      fireEvent.click(screen.getByText('b'));
    });
    expect(screen.getByText('Drugi')).toBeDefined();

    // W t=4,5 s pierwszy (dodany w t=0) musi już zniknąć — jego własne 4 s
    // minęło. Bez fixu jego licznik przeskoczył na t=7 s i wciąż by wisiał.
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.queryByText('Pierwszy')).toBeNull();
    // Drugi (dodany w t=3 s) jeszcze żyje — jego 4 s mija dopiero w t=7 s.
    expect(screen.getByText('Drugi')).toBeDefined();
  });

  it('przycisk zamknięcia usuwa właściwy toast', () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText('a'));
    });
    expect(screen.getByText('Pierwszy')).toBeDefined();

    // `onDone` bierze teraz id — przycisk musi je podać, nie zdarzenie kliknięcia.
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Zamknij powiadomienie' }));
    });
    // Komunikat gaśnie przez chwilę, zanim zniknie z listy: bez tego ubywał
    // skokiem i sąsiednie kafle podskakiwały. Test przesuwa czas o tyle, ile
    // trwa wygaszenie.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText('Pierwszy')).toBeNull();
  });
});
