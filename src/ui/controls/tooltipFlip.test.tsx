import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from './Tooltip';

/**
 * Pionowe domknięcie dymka do ekranu.
 *
 * Regresja: pozycja była zawsze `rect.bottom + GAP` (pod elementem), a domknięcie
 * liczyło tylko poziom. Element przy dolnej krawędzi (np. „Zgłoś błąd" w rogu
 * ekranu gry, fixed bottom-3) dostawał dymek pod kadrem — niewidoczny. Teraz
 * dymek odwraca się nad element, gdy na dole brakuje miejsca.
 */
const mockRect = (el: Element, rect: Partial<DOMRect>) => {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON() {},
    ...rect,
  } as DOMRect);
};

describe('Tooltip — pionowe domknięcie', () => {
  it('odwraca dymek nad element przy dolnej krawędzi ekranu', () => {
    render(
      <Tooltip label="Zgłoś błąd">
        <button type="button">otwórz</button>
      </Tooltip>,
    );
    const wrap = screen.getByText('otwórz').closest('span')!;
    const H = window.innerHeight;
    const anchorTop = H - 40;
    mockRect(wrap, { top: anchorTop, bottom: H - 10, left: 100, right: 130, width: 30, height: 30 });

    fireEvent.pointerEnter(wrap);

    const tip = screen.getByRole('tooltip');
    const top = parseFloat(tip.style.top);
    // Bez fixu: top ≈ H-2 (pod elementem, poza kadrem). Z fixem: nad elementem.
    expect(top).toBeLessThan(anchorTop);
  });

  it('zostawia dymek pod elementem, gdy jest miejsce', () => {
    render(
      <Tooltip label="Podpowiedź">
        <button type="button">góra</button>
      </Tooltip>,
    );
    const wrap = screen.getByText('góra').closest('span')!;
    mockRect(wrap, { top: 10, bottom: 40, left: 100, right: 130, width: 30, height: 30 });

    fireEvent.pointerEnter(wrap);

    const tip = screen.getByRole('tooltip');
    // Pod dolną krawędzią elementu (40).
    expect(parseFloat(tip.style.top)).toBeGreaterThanOrEqual(40);
  });
});
