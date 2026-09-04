import { describe, it, expect } from 'vitest';
import { COLORFUL_THEME, DEFAULT_THEME, THEME_PRESETS } from './theme';

/**
 * Styl „Kolorowy" — wariant dla dzieci.
 *
 * Adam zgłosił: obecny wygląd ma zostać jako „Klasyczny", a obok ma stanąć
 * nowy „Kolorowy" — dziecięcy, wesoły, zrobiony wg grafik z załącznika
 * (tęczowe świecące klocki na ciemnym tle, mocne nasycone barwy).
 *
 * Testy pilnują trzech rzeczy, które łatwo po cichu zepsuć przy kolejnej
 * zmianie kolorów:
 *  1. Kolorowy naprawdę różni się od Klasycznego (inaczej przełącznik nic nie
 *     robi, a użytkownik myśli, że kliknięcie nie zadziałało).
 *  2. Rodziny i kategorie zostają rozróżnialne — kolor NIESIE ZNACZENIE
 *     w mechanice (karta pasuje do ścianki tylko przy zgodnym kolorze), więc
 *     dwie rodziny w tym samym odcieniu psułyby samą grę, nie tylko wygląd.
 *  3. Tekst ma kontrast wobec tła. Wesołe kolory kuszą, żeby dać jasny napis
 *     na jasnym tle — dla dziecka to nieczytelne.
 */

/** Relatywna jasność wg WCAG — do policzenia kontrastu. */
function luminancja(hex: string): number {
  const kanaly = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * kanaly[0] + 0.7152 * kanaly[1] + 0.0722 * kanaly[2];
}

function kontrast(a: string, b: string): number {
  const [x, y] = [luminancja(a), luminancja(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('styl Kolorowy', () => {
  it('jest wpisany na listę stylów do wyboru razem z Klasycznym', () => {
    // Bez tego przełącznik w panelu nie ma czego pokazać.
    const nazwy = THEME_PRESETS.map((p) => p.name);
    expect(nazwy).toContain('Klasyczny');
    expect(nazwy).toContain('Kolorowy');
  });

  it('naprawdę różni się od Klasycznego', () => {
    // Gdyby ktoś skopiował wartości, przełącznik działałby „na niby".
    const rozne = (Object.keys(DEFAULT_THEME) as Array<keyof typeof DEFAULT_THEME>).filter(
      (k) => DEFAULT_THEME[k] !== COLORFUL_THEME[k],
    );
    expect(rozne.length).toBeGreaterThan(10);
  });

  it('cztery rodziny mają wyraźnie różne kolory — kolor niesie zasadę gry', () => {
    // Karta pasuje do ścianki tylko przy zgodnej rodzinie, więc dwa podobne
    // odcienie robią z reguły gry zgadywankę.
    const rodziny = [
      COLORFUL_THEME.familyRed,
      COLORFUL_THEME.familyBlue,
      COLORFUL_THEME.familyYellow,
      COLORFUL_THEME.familyGreen,
    ];
    expect(new Set(rodziny).size).toBe(4);

    for (let i = 0; i < rodziny.length; i += 1) {
      for (let j = i + 1; j < rodziny.length; j += 1) {
        // Nie porównujemy „na oko" — liczymy odległość barw w RGB.
        const a = rodziny[i];
        const b = rodziny[j];
        const dystans = [1, 3, 5].reduce(
          (suma, k) => suma + Math.abs(parseInt(a.slice(k, k + 2), 16) - parseInt(b.slice(k, k + 2), 16)),
          0,
        );
        expect(dystans, `${a} i ${b} są zbyt podobne`).toBeGreaterThan(120);
      }
    }
  });

  it('tekst jest czytelny na tle — także ten przygaszony', () => {
    // 4.5:1 to próg WCAG dla zwykłego tekstu; przygaszonemu dajemy 3:1,
    // bo to podpisy i daty, nie treść do czytania.
    expect(kontrast(COLORFUL_THEME.ink, COLORFUL_THEME.bg)).toBeGreaterThanOrEqual(4.5);
    expect(kontrast(COLORFUL_THEME.inkDim, COLORFUL_THEME.surface)).toBeGreaterThanOrEqual(3);
  });

  it('wszystkie kolory to poprawne zapisy #rrggbb', () => {
    // Literówka w kolorze nie wywala aplikacji — przeglądarka po cichu
    // ignoruje złą wartość, a element zostaje bez koloru. Łatwo przeoczyć.
    for (const [klucz, wartosc] of Object.entries(COLORFUL_THEME)) {
      expect(wartosc, `${klucz} = ${wartosc}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
