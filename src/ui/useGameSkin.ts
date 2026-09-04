import { useEffect, useState } from 'react';

/**
 * Wygląd gry — drugi wymiar obok jasny/ciemny.
 *
 * Adam poprosił o dwa niezależne przełączniki: „1. Ciemny vs jasny,
 * 2. Klasyczny vs Kolorowy". Jasność mówi o tle, wygląd o całym języku
 * wizualnym — świecące kafle zamiast spokojnych paneli, wprost z grafik,
 * które przysłał. Wrzucone w jedno pokrętło dałyby cztery kombinacje i gracz
 * nie wiedziałby, co właściwie zmienia.
 *
 * Wygląd żyje na `<html data-skin>`, tak samo jak tryb na `data-theme`.
 * Dzięki temu zmiana jest w CSS, a nie w każdym ekranie gry z osobna —
 * inaczej trzeba by utrzymywać dwie wersje wszystkich komponentów.
 */
export type GameSkin = 'classic' | 'colorful';

export const SKIN_LABELS: Record<GameSkin, string> = {
  classic: 'Klasyczny',
  colorful: 'Kolorowy',
};

const KEY = 'eter11-skin';

/** Który wygląd jest wybrany. Nieznana wartość spada do klasycznego. */
export function readSkin(): GameSkin {
  try {
    return localStorage.getItem(KEY) === 'colorful' ? 'colorful' : 'classic';
  } catch {
    // Prywatne okno albo zablokowana pamięć — gra ma działać normalnie.
    return 'classic';
  }
}

/** Ustawia wygląd: znacznik na `<html>` plus zapamiętanie wyboru. */
export function applySkin(skin: GameSkin): void {
  if (skin === 'colorful') {
    document.documentElement.dataset.skin = 'colorful';
  } else {
    // Brak atrybutu zamiast `data-skin="classic"`: reguły kolorowego są
    // dopisane pod `[data-skin='colorful']`, więc klasyczny to po prostu
    // ich brak — jedno miejsce prawdy zamiast dwóch zestawów reguł.
    document.documentElement.removeAttribute('data-skin');
  }

  try {
    localStorage.setItem(KEY, skin);
  } catch {
    // Wybór nie przetrwa odświeżenia, ale sama gra działa dalej.
  }
}

/**
 * Wygląd jako stan Reacta — dla przełącznika w interfejsie.
 *
 * Przy pierwszym renderze stosuje zapamiętany wybór, żeby gra nie mrugała
 * klasycznym wyglądem przed przełączeniem na kolorowy.
 */
export function useGameSkin(): [GameSkin, (skin: GameSkin) => void] {
  const [skin, setSkin] = useState<GameSkin>(readSkin);

  useEffect(() => {
    applySkin(skin);
  }, [skin]);

  return [skin, setSkin];
}
