import { describe, it, expect, beforeEach } from 'vitest';
import { readSkin, applySkin, SKIN_LABELS, type GameSkin } from './useGameSkin';

/**
 * Drugi wygląd gry: „Kolorowy".
 *
 * Adam odesłał pierwszą wersję: „nie o to chodziło. (…) Nie chodzi o kolorki
 * różnych elementów, ale o to, abyś wykorzystał ideę kolorowych kwadracików
 * i stworzył z nich całkowicie inną wizualizację panelu gracza. (…) Gracz
 * powinien mieć możliwość przełączania widoków: 1. Ciemny vs jasny,
 * 2. Klasyczny vs Kolorowy".
 *
 * To dwa NIEZALEŻNE wymiary. Jasny/ciemny mówi o jasności tła, klasyczny/
 * kolorowy o całym języku wizualnym — świecące kafle zamiast spokojnych
 * paneli. Wrzucone w jeden przełącznik dałyby cztery kombinacje w jednym
 * pokrętle i gracz nie wiedziałby, co zmienia.
 *
 * Wygląd trzymamy na `<html data-skin>`, tak jak tryb na `data-theme`:
 * dzięki temu jest to zmiana CSS, a nie przepisywanie każdego ekranu gry.
 */

beforeEach(() => {
  document.documentElement.removeAttribute('data-skin');
  localStorage.clear();
});

describe('przełączanie wyglądu gry', () => {
  it('domyślnie gra wygląda klasycznie', () => {
    // Bez tego wszyscy dotychczasowi gracze dostaliby nowy wygląd bez pytania.
    expect(readSkin()).toBe('classic');
  });

  it('zapamiętuje wybór między wizytami', () => {
    applySkin('colorful');

    expect(readSkin()).toBe('colorful');
    // Znacznik na <html> — po nim CSS wie, co rysować.
    expect(document.documentElement.dataset.skin).toBe('colorful');
  });

  it('klasyczny nie zostawia znacznika — to stan domyślny', () => {
    applySkin('colorful');
    applySkin('classic');

    // Brak atrybutu zamiast `data-skin="classic"`: reguły kolorowego są
    // dopisywane pod `[data-skin='colorful']`, więc klasyczny to po prostu
    // brak tych reguł.
    expect(document.documentElement.hasAttribute('data-skin')).toBe(false);
  });

  it('nieznana wartość w pamięci przeglądarki spada do klasycznego', () => {
    // Ktoś mógł ręcznie wpisać cokolwiek albo zapis pochodzi ze starszej
    // wersji — gra ma wtedy wyglądać normalnie, a nie pusto.
    localStorage.setItem('eter11-skin', 'kwadraciki');

    expect(readSkin()).toBe('classic');
  });

  it('oba wyglądy mają nazwy dla gracza', () => {
    for (const skin of ['classic', 'colorful'] as GameSkin[]) {
      expect(SKIN_LABELS[skin].length).toBeGreaterThan(0);
    }
  });

  it('wygląd jest niezależny od trybu jasny/ciemny', () => {
    // Adam wymienił je jako dwa osobne przełączniki. Zmiana wyglądu nie może
    // przestawiać jasności ani odwrotnie.
    document.documentElement.dataset.theme = 'light';
    applySkin('colorful');

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.skin).toBe('colorful');
  });
});
