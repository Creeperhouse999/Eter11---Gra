import { describe, it, expect } from 'vitest';
import { CODE_CHARS, normalizeCode } from './roomCode';

/**
 * Kod pokoju musi przeżyć przepisanie z ekranu na drugie urządzenie.
 *
 * Adam zgłaszał dwa razy, że dołączanie nie działa: „wpisywałem kod np. UA6E,
 * ale pojawia się komunikat »nie ma pokoju o takim kodzie«". Sprawdziłem
 * ścieżkę na żywej bazie — zakładanie, odczyt i dołączanie działają. Problem
 * jest wcześniej: kodu `UA6E` gra nie mogła wygenerować, bo w zestawie jest
 * i `6`, i `G`. Adam przeczytał `G` jako `6`.
 *
 * Zestaw wykluczał `I`, `L`, `O`, `0`, `1` — ale zostawił pięć innych par,
 * które na ekranie telefonu wyglądają tak samo: 6/G, 5/S, 8/B, 2/Z, U/V.
 * Dla ośmiolatka przepisującego kod to loteria.
 *
 * Stąd dwie rzeczy: nowe kody nie zawierają mylących znaków, a przy wpisywaniu
 * mylące znaki są sprowadzane do jednego wariantu — bo kody wydane wcześniej
 * dalej krążą, a i tak lepiej wpuścić gracza, niż kazać mu zgadywać.
 */

describe('znaki w kodzie pokoju', () => {
  it('zestaw nie zawiera par mylących przy przepisywaniu z ekranu', () => {
    // Każda para to jeden przypadek „wpisałem, co widziałem, i nie działa".
    const pary: Array<[string, string]> = [
      ['6', 'G'],
      ['5', 'S'],
      ['8', 'B'],
      ['2', 'Z'],
      ['U', 'V'],
      ['0', 'O'],
      ['1', 'I'],
    ];

    for (const [a, b] of pary) {
      const oba = CODE_CHARS.includes(a) && CODE_CHARS.includes(b);
      expect(oba, `${a} i ${b} są oba w zestawie — dziecko je pomyli`).toBe(false);
    }
  });

  it('zestaw wciąż daje dość kombinacji, żeby kody się nie powtarzały', () => {
    // Cztery znaki z N daje N^4. Przy kilkunastu pokojach naraz kolizja ma
    // być rzadkością, nie regułą — inaczej dwie klasy trafiłyby na ten sam kod.
    expect(CODE_CHARS.length ** 4).toBeGreaterThan(50_000);
  });
});

describe('wpisywanie kodu wybacza typowe pomyłki', () => {
  it('sprowadza mylące znaki do wariantu z zestawu', () => {
    // Adam wpisał `UA6E`, gra wydała `UAGE` — po zamianie trafia we właściwy
    // pokój zamiast odbić się komunikatem „nie ma takiego kodu".
    expect(normalizeCode('UA6E')).toBe(normalizeCode('UAGE'));
    expect(normalizeCode('5TOP')).toBe(normalizeCode('STOP'));
    expect(normalizeCode('8ARW')).toBe(normalizeCode('BARW'));
  });

  it('nie rozróżnia wielkości liter ani spacji', () => {
    // Dziecko wpisuje z klawiatury telefonu — spacja i małe litery to norma.
    expect(normalizeCode(' uage ')).toBe('UAGE');
  });

  it('wynik zawsze składa się ze znaków dozwolonych w kodzie', () => {
    // Gdyby zamiana wypuściła znak spoza zestawu, żaden pokój by nie pasował.
    for (const wejscie of ['UA6E', '5TOP', '8ARW', '2EBRA', 'V0LT', 'I1LO']) {
      for (const znak of normalizeCode(wejscie)) {
        expect(CODE_CHARS.includes(znak), `${znak} z „${wejscie}" jest spoza zestawu`).toBe(
          true,
        );
      }
    }
  });

  it('kod już poprawny zostaje bez zmian', () => {
    // Zamiana nie może psuć tego, co i tak działa.
    expect(normalizeCode('QRTX')).toBe('QRTX');
  });
});
