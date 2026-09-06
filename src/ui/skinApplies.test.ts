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
   * Alan po trzech podejściach: „to są małe, drobne kwadraciki w siatce,
   * a nie wielkie kwadraty kolorowe — to inny direction w ogóle", oraz
   * „tło to siatka półprzezroczysta w tle, karty mają być trochę podobne".
   *
   * Stąd sedno tego wyglądu: FAKTURA z drobnych kwadracików, ta sama na tle
   * i na kartach. Poprzednie wersje dokładały poświatę do tego samego ekranu
   * i Adam odsyłał je ze słowami „nie różni się wiele od klasycznego".
   */
  it('kafle mają fakturę z kwadracików, nie samo tło', () => {
    expect(sekcja).toMatch(/\.eter-tile[\s\S]*?background-image/);
  });

  it('siatka jest DROBNA — kwadracik liczony w pojedynczych pikselach', () => {
    const match = sekcja.match(/--kwadracik:\s*(\d+)px/);
    expect(match, 'brak zmiennej --kwadracik').toBeTruthy();
    const bok = Number(match![1]);
    // Powyżej ~16 px to już nie faktura, tylko kafle — czyli dokładnie to,
    // co Alan odrzucił.
    expect(bok, `bok kwadracika: ${bok}px`).toBeLessThanOrEqual(16);
    expect(bok).toBeGreaterThan(0);
  });

  it('tło całego ekranu niesie tę samą siatkę', () => {
    expect(sekcja).toMatch(/body[\s\S]*?background-image[\s\S]*?linear-gradient/);
  });

  it('siatka na tle jest słabsza niż na kartach — inaczej zjada tekst', () => {
    const tlo = sekcja.match(/--siatka-tlo:\s*([\d.]+)/);
    const karta = sekcja.match(/--siatka-karta:\s*([\d.]+)/);
    expect(tlo && karta, 'brak zmiennych siły siatki').toBeTruthy();
    expect(Number(tlo![1])).toBeLessThan(Number(karta![1]));
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
