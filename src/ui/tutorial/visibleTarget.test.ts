import { describe, it, expect, afterEach } from 'vitest';
import { findVisible } from './Spotlight';

/**
 * Podświetlenie musi trafiać w element, który gracz naprawdę widzi.
 *
 * Plansza renderuje ścianki dwa razy — układ stołowy (od 900 px) i wąski —
 * a przełącza je CSS. `querySelector` brał zawsze pierwszy w kodzie, czyli
 * desktopowy, który na telefonie ma zerowe wymiary. ETER11 mówił wtedy
 * „ścianka zaświeciła", a nic się nie świeciło.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

/** jsdom nie liczy układu, więc wymiary podajemy wprost. */
const withSize = (element: Element, width: number, height: number) => {
  element.getBoundingClientRect = () =>
    ({ width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
};

describe('findVisible', () => {
  it('pomija ukryty duplikat i zwraca widoczny', () => {
    document.body.innerHTML = `
      <div data-slot="p1:mentor" id="desktop"></div>
      <div data-slot="p1:mentor" id="mobile"></div>
    `;
    const [desktop, mobile] = document.querySelectorAll('[data-slot="p1:mentor"]');
    withSize(desktop, 0, 0);
    withSize(mobile, 300, 120);

    expect(findVisible('[data-slot="p1:mentor"]')?.id).toBe('mobile');
  });

  it('zwraca pierwszy, gdy oba są widoczne', () => {
    document.body.innerHTML = `
      <div data-slot="p1:talent" id="a"></div>
      <div data-slot="p1:talent" id="b"></div>
    `;
    for (const element of document.querySelectorAll('[data-slot="p1:talent"]')) {
      withSize(element, 200, 80);
    }

    expect(findVisible('[data-slot="p1:talent"]')?.id).toBe('a');
  });

  it('zwraca null, gdy żaden nie jest widoczny', () => {
    document.body.innerHTML = '<div data-slot="p1:social"></div>';
    withSize(document.querySelector('[data-slot="p1:social"]')!, 0, 0);

    expect(findVisible('[data-slot="p1:social"]')).toBeNull();
  });

  it('zwraca null dla selektora bez trafień', () => {
    expect(findVisible('[data-slot="nie-ma"]')).toBeNull();
  });
});
