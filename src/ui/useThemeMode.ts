import { useCallback, useEffect, useState } from 'react';
import { applyTheme, baseTheme, type ThemeMode } from '../data/theme';

const STORAGE_KEY = 'eter11:theme-mode';

/**
 * Nazwa zdarzenia na `window`, wysyłanego przy każdej zmianie trybu strony.
 *
 * `useThemeMode` trzyma stan OSOBNO w każdym miejscu, gdzie jest wywołany —
 * dwa komponenty (np. przełącznik w nagłówku panelu i podgląd gdzie indziej)
 * nie dzielą tego samego Reactowego stanu. Kto tylko chce WIEDZIEĆ, w jakim
 * trybie jest teraz strona (bez własnego przełącznika i bez efektów
 * ubocznych useThemeMode — localStorage, applyTheme), niech nasłuchuje tego
 * zdarzenia zamiast duplikować cały hook.
 */
export const PAGE_THEME_EVENT = 'eter11:page-theme-change';

/**
 * Zapamiętany wybór z localStorage, a gdy go nie ma — ZAWSZE ciemny.
 *
 * Gra jest z założenia ciemna (to jej wygląd domyślny), więc bez świadomego
 * wyboru gracza nie sięgamy po preferencję systemu — inaczej ktoś z jasnym
 * systemem dostawał jasny tryb, którego nie wybierał.
 */
function initialMode(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Tryb prywatny blokuje odczyt — trudno, ciemny.
  }
  return 'dark';
}

/**
 * Tryb jasny/ciemny.
 *
 * Przełącza bazowy zestaw zmiennych CSS i pamięta wybór między wizytami.
 * Panel redakcyjny nakłada na to własny motyw z bazy (podgląd kolorów), więc
 * tam toggle działa do czasu wczytania motywu — w grze rządzi sam tryb.
 *
 * Startowy tryb ustawiamy synchronicznie w efekcie, żeby nie mrugnąć ciemnym
 * przy wejściu z jasną preferencją.
 */
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  useEffect(() => {
    applyTheme(baseTheme(mode));
    // Znacznik na <html> dla ewentualnych reguł CSS zależnych od trybu.
    document.documentElement.dataset.theme = mode;
    window.dispatchEvent(new CustomEvent<ThemeMode>(PAGE_THEME_EVENT, { detail: mode }));
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Bez zapisu też działa — po prostu nie zapamięta między wizytami.
    }
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), []);

  return { mode, setMode, toggle };
}

/**
 * Tryb strony do samego odczytu, reaktywny na zmiany z INNYCH miejsc (np.
 * przełącznika w nagłówku panelu) — bez własnego przełącznika i bez efektów
 * ubocznych `useThemeMode` (localStorage, applyTheme). Startowa wartość to
 * bieżący znacznik `<html data-theme>`; dalsze zmiany łapie nasłuchiwaniem
 * `PAGE_THEME_EVENT`.
 */
export function usePageThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  );

  useEffect(() => {
    const onChange = (event: Event) => {
      setMode((event as CustomEvent<ThemeMode>).detail);
    };
    window.addEventListener(PAGE_THEME_EVENT, onChange);
    return () => window.removeEventListener(PAGE_THEME_EVENT, onChange);
  }, []);

  return mode;
}
