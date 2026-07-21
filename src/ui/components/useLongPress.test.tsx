import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useLongPress } from './useLongPress';

/**
 * Przytrzymanie karty pokazuje ją na cały ekran. Gest dzieli początek
 * z kliknięciem (wybór karty) i przeciąganiem (zagranie), więc te testy
 * pilnują, żeby nie wchodził im w drogę.
 */

function pointer(type: string, x: number, y: number): Event {
  return new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0 });
}

function Probe({ onFire }: { onFire: () => void }) {
  const hold = useLongPress(onFire);
  return <button data-testid="card" {...hold} />;
}

describe('przytrzymanie', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('odpala po przytrzymaniu', () => {
    const fired = vi.fn();
    render(<Probe onFire={fired} />);

    act(() => {
      screen.getByTestId('card').dispatchEvent(pointer('pointerdown', 50, 50));
    });
    act(() => void vi.advanceTimersByTime(500));

    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('nie odpala przy zwykłym kliknięciu', () => {
    const fired = vi.fn();
    render(<Probe onFire={fired} />);
    const card = screen.getByTestId('card');

    act(() => {
      card.dispatchEvent(pointer('pointerdown', 50, 50));
    });
    // Palec puszczony po 100 ms — to wybór karty, nie oglądanie jej.
    act(() => void vi.advanceTimersByTime(100));
    act(() => {
      card.dispatchEvent(pointer('pointerup', 50, 50));
    });
    act(() => void vi.advanceTimersByTime(500));

    expect(fired).not.toHaveBeenCalled();
  });

  it('nie odpala, gdy palec pojechał — to przeciąganie', () => {
    const fired = vi.fn();
    render(<Probe onFire={fired} />);
    const card = screen.getByTestId('card');

    act(() => {
      card.dispatchEvent(pointer('pointerdown', 50, 50));
    });
    act(() => {
      // Powyżej tolerancji, poniżej progu przeciągania: i tak ma anulować,
      // inaczej karta powiększyłaby się w trakcie ciągnięcia jej na ściankę.
      card.dispatchEvent(pointer('pointermove', 60, 58));
    });
    act(() => void vi.advanceTimersByTime(500));

    expect(fired).not.toHaveBeenCalled();
  });

  it('drobne drgnięcie palca nie przeszkadza', () => {
    const fired = vi.fn();
    render(<Probe onFire={fired} />);
    const card = screen.getByTestId('card');

    act(() => {
      card.dispatchEvent(pointer('pointerdown', 50, 50));
    });
    act(() => {
      // Nikt nie trzyma palca idealnie nieruchomo — zwłaszcza dziecko.
      card.dispatchEvent(pointer('pointermove', 52, 51));
    });
    act(() => void vi.advanceTimersByTime(500));

    expect(fired).toHaveBeenCalledTimes(1);
  });
});
