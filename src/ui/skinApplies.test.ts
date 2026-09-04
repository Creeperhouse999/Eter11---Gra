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
  it('kafle dostają poświatę, nie tylko inny kolor obramowania', () => {
    // Sedno grafik Adama: klocki ŚWIECĄ. Bez cienia to zwykłe prostokąty.
    expect(sekcja).toMatch(/\.eter-tile[\s\S]*box-shadow/);
  });

  it('kafel jest kwadratowy, nie zaokrąglony jak panel', () => {
    expect(sekcja).toMatch(/\.eter-tile[\s\S]*border-radius/);
  });

  it('tło gry dostaje głębię, nie płaską czerń', () => {
    expect(sekcja).toMatch(/body[\s\S]*radial-gradient/);
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
