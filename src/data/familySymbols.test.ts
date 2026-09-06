import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FAMILY_SYMBOLS,
  SYMBOL_LABELS,
  SYMBOL_CHOICES,
  symbolRodziny,
} from './familySymbols';
import { FAMILY_IDS } from './families';

/**
 * Adam: „wprowadź do każdej karty, która ma dany kolor, symbol w górnym
 * środkowym miejscu karty, aby osoby, które nie widzą kolorów, mogły rozpoznać
 * po symbolu ten kolor. (…) czerwony — kółko, zielony — trójkąt, niebieski —
 * kwadrat, żółty — gwiazdka".
 *
 * To dostępność, nie ozdoba: kolor rodziny niesie zasadę gry (karta pasuje do
 * ścianki tylko przy zgodnej rodzinie), więc dziecko mylące czerwień z zielenią
 * bez symbolu nie zagra samodzielnie.
 */

describe('symbole rodzin', () => {
  it('każda rodzina ma symbol', () => {
    for (const family of FAMILY_IDS) {
      expect(DEFAULT_FAMILY_SYMBOLS[family], `brak symbolu dla ${family}`).toBeTruthy();
    }
  });

  it('symbole są takie, jak wskazał Adam', () => {
    expect(DEFAULT_FAMILY_SYMBOLS.red).toBe('circleShape');
    expect(DEFAULT_FAMILY_SYMBOLS.green).toBe('triangleUp');
    expect(DEFAULT_FAMILY_SYMBOLS.blue).toBe('squareShape');
    expect(DEFAULT_FAMILY_SYMBOLS.yellow).toBe('star');
  });

  /**
   * Sedno całej sprawy: dwie rodziny o tym samym symbolu nie odróżniałyby się
   * dla gracza, który nie widzi kolorów — czyli symbol nie robiłby tego, po co
   * jest.
   */
  it('żadne dwie rodziny nie dzielą symbolu', () => {
    const symbole = Object.values(DEFAULT_FAMILY_SYMBOLS);
    expect(new Set(symbole).size).toBe(symbole.length);
  });

  it('każdy domyślny symbol ma polską nazwę do panelu', () => {
    for (const symbol of Object.values(DEFAULT_FAMILY_SYMBOLS)) {
      expect(SYMBOL_LABELS[symbol], `brak nazwy dla ${symbol}`).toBeTruthy();
    }
  });

  it('lista do wyboru zawiera wszystkie domyślne', () => {
    for (const symbol of Object.values(DEFAULT_FAMILY_SYMBOLS)) {
      expect(SYMBOL_CHOICES).toContain(symbol);
    }
  });
});

describe('odczyt symbolu z treści gry', () => {
  it('bez zapisanego zestawu bierze domyślny', () => {
    expect(symbolRodziny('red')).toBe('circleShape');
    expect(symbolRodziny('blue', {})).toBe('squareShape');
  });

  it('zapisany symbol ma pierwszeństwo', () => {
    expect(symbolRodziny('red', { red: 'heart' })).toBe('heart');
  });

  it('wgrana grafika też jest symbolem', () => {
    expect(symbolRodziny('green', { green: 'url:https://x/znak.png' })).toBe(
      'url:https://x/znak.png',
    );
  });

  /**
   * Pusty ciąg to nie wybór, tylko wyczyszczone pole w panelu — karta ma wtedy
   * zostać z domyślnym symbolem, a nie bez żadnego.
   */
  it('puste pole nie kasuje symbolu', () => {
    expect(symbolRodziny('yellow', { yellow: '' })).toBe('star');
  });
});
