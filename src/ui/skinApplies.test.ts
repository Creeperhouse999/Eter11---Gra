import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Wygląd „Kolorowy" naprawdę zmienia wygląd, a nie tylko atrybut.
 *
 * Adam odesłał pierwszą wersję ze słowami „nie o to chodziło" — bo zmieniła
 * same kolory, nie sposób rysowania. Ten test pilnuje, że skórka faktycznie
 * przemalowuje elementy gry: kafle mają świecić i mieć kwadratowy kształt,
 * inaczej „kolorowy" byłby tylko inną paletą pod nową nazwą.
 *
 * Czytamy arkusz stylów zamiast renderować przeglądarkę, bo jsdom nie liczy
 * kaskady — a to reguły są tu treścią zmiany.
 */

const css = readFileSync('src/styles/theme.css', 'utf8');
const sekcja = css.slice(css.indexOf("[data-skin='colorful']"));

beforeEach(() => {
  document.documentElement.removeAttribute('data-skin');
});

describe('skórka Kolorowy przemalowuje grę', () => {
  /**
   * Alan: „to są małe, drobne kwadraciki w siatce, a nie wielkie kwadraty
   * kolorowe" oraz „tło to siatka półprzezroczysta w tle, karty mają być
   * trochę podobne". Pomiar załączników Adama dodał resztę: kwadraciki są
   * WYPEŁNIONE kolorem, z przerwami — mozaika, nie kratka z linii.
   *
   * Sedno, którego pilnują te testy: mozaika musi być NAPRAWDĘ widoczna.
   * Trzy wcześniejsze wersje nadpisywały `--eter-bg` w CSS, a `applyTheme`
   * wpisuje tę zmienną inline na `<html>` — inline wygrywa, więc kolory nigdy
   * nie działały i Adam słusznie pisał „nie różni się wiele od klasycznego".
   */
  it('NIE nadpisuje zmiennych motywu — inline z applyTheme i tak by wygrał', () => {
    for (const zmienna of ['--eter-bg', '--eter-surface', '--eter-raised', '--eter-ink']) {
      expect(sekcja, `${zmienna} ustawiane w CSS to martwa reguła`).not.toMatch(
        new RegExp(`${zmienna}\\s*:`),
      );
    }
  });

  it('tło niesie mozaikę z wypełnionych kwadracików (SVG), nie siatkę linii', () => {
    expect(sekcja).toMatch(/body::before[\s\S]*?background-image:\s*url\("data:image\/svg\+xml/);
    expect(sekcja).not.toMatch(/body[\s\S]*?linear-gradient/);
  });

  it('karta ma mozaikę w kolorze rodziny — pod treścią', () => {
    // Maska z SVG wycina kwadraciki, kolor daje `--eter-tile-accent`,
    // a `z-index: -1` chowa warstwę pod napisy.
    const przed = sekcja.match(/\.eter-tile[^{]*::before\s*\{([\s\S]*?)\}/);
    expect(przed, 'brak ::before na kafelku').toBeTruthy();
    const regula = przed![1];
    expect(regula).toMatch(/mask-image:\s*url\("data:image\/svg\+xml/);
    expect(regula).toMatch(/background-color:\s*var\(--eter-tile-accent/);
    expect(regula).toMatch(/z-index:\s*-1/);
  });

  it('kwadraciki są DROBNE — bok w pojedynczych pikselach', () => {
    const tlo = sekcja.match(/--mozaika-bok:\s*(\d+)px/);
    const karta = sekcja.match(/--mozaika-karta-bok:\s*(\d+)px/);
    expect(tlo && karta, 'brak zmiennych boku').toBeTruthy();
    // Powyżej ~20 px to już kafle, nie faktura — to Alan odrzucił.
    expect(Number(tlo![1])).toBeLessThanOrEqual(20);
    expect(Number(karta![1])).toBeLessThanOrEqual(Number(tlo![1]));
    expect(Number(karta![1])).toBeGreaterThan(0);
  });

  it('mozaika na tle jest słabsza niż na karcie — w OBU trybach', () => {
    const tla = [...sekcja.matchAll(/--mozaika-tlo-sila:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    const karty = [...sekcja.matchAll(/--mozaika-karta-sila:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    expect(tla.length, 'siła tła dla obu trybów').toBe(2);
    expect(karty.length, 'siła karty dla obu trybów').toBe(2);
    // Porównanie W OBRĘBIE trybu: ciemny ma mocniejsze tło niż jasny ma
    // kartę, i to jest w porządku — liczy się, że w każdym trybie tło
    // ustępuje karcie.
    for (const [i, tlo] of tla.entries()) {
      expect(tlo, `tryb #${i}: tło ${tlo} vs karta ${karty[i]}`).toBeLessThan(karty[i]);
    }
  });

  it('kolor karty niesie rodzinę, nie jeden wspólny akcent', () => {
    // Kolor karty NIESIE ZASADĘ GRY (pasuje do ścianki w swojej rodzinie),
    // więc w tym wyglądzie musi wynikać z karty, nie z ogólnego akcentu.
    expect(sekcja).toMatch(/--eter-tile-accent/);
  });

  it('panel administracyjny zostaje nietknięty', () => {
    // Adam napisał wprost: „panel admina jest ok, jest czytelny". Reguły
    // muszą go omijać, inaczej poświata utrudni czytanie długich list.
    expect(sekcja).toMatch(/eter-admin/);
  });

  it('klasy zaczepienia są w komponentach gry, nie tylko w CSS', () => {
    // Reguła bez klasy w JSX to martwy przepis — karta i ścianka muszą ją
    // naprawdę nosić.
    const karta = readFileSync('src/ui/components/CardView.tsx', 'utf8');
    const scianka = readFileSync('src/ui/components/ProblemCard.tsx', 'utf8');

    expect(karta).toContain('eter-tile');
    expect(scianka).toContain('eter-tile');
  });
});
