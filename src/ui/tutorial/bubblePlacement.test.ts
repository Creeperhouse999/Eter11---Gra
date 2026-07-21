import { describe, it, expect } from 'vitest';
import { pickPlacement, BUBBLE_WIDTH, BUBBLE_GAP } from './placement';

/**
 * Dymek samouczka nie może zasłaniać tego, co podświetla — gracz zgłosił
 * dokładnie ten objaw. Poprzednia wersja sprawdzała tylko oś pionową, więc
 * przy szerokim celu (cała karta problemu) dymek lądował na nim.
 */

const VW = 1440;
const VH = 900;
const H = 190;

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

/** Czy prostokąty nachodzą na siebie. */
const overlaps = (p: { top: number; left: number }, target: DOMRect) =>
  p.left < target.right &&
  p.left + BUBBLE_WIDTH > target.left &&
  p.top < target.bottom &&
  p.top + H > target.top;

describe('umiejscowienie dymka', () => {
  it('nie zasłania wąskiego celu u góry ekranu', () => {
    const target = rect(600, 40, 240, 120);
    const placement = pickPlacement(target, H, VW, VH);
    expect(overlaps(placement, target)).toBe(false);
  });

  it('nie zasłania szerokiej karty problemu na środku', () => {
    // Ten przypadek gracz widział na zrzucie: cel szeroki i wysoki,
    // dymek siadał dokładnie na nim.
    const target = rect(390, 200, 660, 420);
    const placement = pickPlacement(target, H, VW, VH);
    expect(overlaps(placement, target)).toBe(false);
  });

  it('nie zasłania ręki z kartami na dole ekranu', () => {
    const target = rect(270, 640, 950, 220);
    const placement = pickPlacement(target, H, VW, VH);
    expect(overlaps(placement, target)).toBe(false);
  });

  it('nie zasłania podświetlonej ścianki w rogu', () => {
    const target = rect(140, 30, 480, 190);
    const placement = pickPlacement(target, H, VW, VH);
    expect(overlaps(placement, target)).toBe(false);
  });

  it('zawsze zostaje w granicach ekranu', () => {
    for (const target of [
      rect(0, 0, 200, 100),
      rect(1200, 700, 240, 200),
      rect(600, 400, 300, 200),
      rect(20, 20, 1400, 860),
    ]) {
      const p = pickPlacement(target, H, VW, VH);
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.top).toBeGreaterThanOrEqual(0);
      expect(p.left + BUBBLE_WIDTH).toBeLessThanOrEqual(VW);
      expect(p.top + H).toBeLessThanOrEqual(VH);
    }
  });

  it('mieści się na telefonie', () => {
    const target = rect(20, 300, 320, 180);
    const p = pickPlacement(target, H, 360, 640);
    expect(p.top).toBeGreaterThanOrEqual(0);
    expect(p.top + H).toBeLessThanOrEqual(640);
    expect(overlaps(p, target)).toBe(false);
  });

  it('nie wychodzi poza ekran, gdy dymek jest wyższy niż okno', () => {
    // Niski ekran z otwartą klawiaturą: dymek się nie zmieści, ale musi
    // zaczynać się w widocznym obszarze, a nie poniżej krawędzi.
    const p = pickPlacement(rect(20, 50, 320, 200), 380, 360, 400);
    expect(p.top).toBeGreaterThanOrEqual(0);
    expect(p.left).toBeGreaterThanOrEqual(0);
  });

  it('gdy cel wypełnia ekran, wybiera róg o najmniejszym nachodzeniu', () => {
    // Uniknięcie nachodzenia jest niemożliwe — liczy się, by zakryć jak
    // najmniej i nie wyjść poza ekran.
    const target = rect(20, 20, 1400, 860);
    const p = pickPlacement(target, H, VW, VH);
    expect(p.top === BUBBLE_GAP || p.top === VH - H - BUBBLE_GAP).toBe(true);
  });
});
