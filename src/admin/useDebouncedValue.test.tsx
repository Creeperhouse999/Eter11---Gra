import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Odtwarza dokładnie wzorzec z AdminApp: pole tekstowe związane wprost z
 * `content`, a obok kosztowne obliczenie liczone z tej samej wartości przez
 * `useMemo`. Bez debounce `expensiveFn` (tu: szpieg) leci na każdy znak,
 * w tym samym renderze co aktualizacja pola — to jest realne źródło lagu
 * ze zgłoszenia „Laguje pisanie".
 */
function Probe({ expensiveFn }: { expensiveFn: (v: string) => void }) {
  const [content, setContent] = useState('');
  const debounced = useDebouncedValue(content, 250);
  useMemo(() => expensiveFn(debounced), [debounced, expensiveFn]);
  return (
    <input aria-label="pole" value={content} onChange={(e) => setContent(e.target.value)} />
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebouncedValue', () => {
  it('kosztowne obliczenie NIE leci na każdy znak — czeka, aż redaktor przestanie pisać', () => {
    const expensiveFn = vi.fn();
    const { getByLabelText } = render(<Probe expensiveFn={expensiveFn} />);
    expensiveFn.mockClear(); // pomijamy wywołanie z montażu (pusty content)

    fireEvent.change(getByLabelText('pole'), { target: { value: 'a' } });
    fireEvent.change(getByLabelText('pole'), { target: { value: 'ab' } });
    fireEvent.change(getByLabelText('pole'), { target: { value: 'abc' } });

    // Bez fixu (useMemo liczony wprost z `content`) to wywołałoby expensiveFn
    // trzy razy, po jednym na znak. Z debounce — ani razu, dopóki cisza.
    expect(expensiveFn).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(250));

    // Po ciszy dogania się RAZ, z ostateczną wartością — nie trzy razy z
    // pośrednimi.
    expect(expensiveFn).toHaveBeenCalledTimes(1);
    expect(expensiveFn).toHaveBeenCalledWith('abc');
  });

  it('pole samo pozostaje żywe — aktualizuje się natychmiast, niezależnie od debounce', () => {
    const { getByLabelText } = render(<Probe expensiveFn={vi.fn()} />);
    const input = getByLabelText('pole') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'x' } });

    expect(input.value).toBe('x');
  });

  /**
   * Odtwarza wzorzec z AdminApp: `content` i `savedContent` (bez debounce)
   * skaczą razem, w tym samym renderze, przy świeżym wczytaniu z bazy —
   * niezwiązane z wpisywaniem znak po znaku. Bez `resetKey` debounced wersja
   * doganiałaby dopiero po 250 ms, więc `dirty = debounced !== savedContent`
   * przez tę chwilę fałszywie pokazywałby niezapisane zmiany zaraz po wejściu
   * do panelu (zgłoszenie: „przy wejściu na admin flashuje... purpurowy
   * błąd" — badge „niezapisane: karty").
   */
  function LoadProbe() {
    const [content, setContent] = useState('stary');
    const [saved, setSaved] = useState('stary');
    const debounced = useDebouncedValue(content, 250, saved);
    return (
      <>
        <span data-testid="debounced">{debounced}</span>
        <button
          type="button"
          onClick={() => {
            setContent('świeży-z-bazy');
            setSaved('świeży-z-bazy');
          }}
        >
          wczytaj
        </button>
      </>
    );
  }

  it('resetKey dogania wartość NATYCHMIAST przy hurtowym skoku, bez czekania na delayMs', () => {
    const { getByText, getByTestId } = render(<LoadProbe />);

    fireEvent.click(getByText('wczytaj'));

    // Bez fixu: tu dalej „stary" — dogoniłby dopiero po 250 ms, w międzyczasie
    // fałszywie różniąc się od `saved` (już „świeży-z-bazy").
    expect(getByTestId('debounced').textContent).toBe('świeży-z-bazy');
  });
});
