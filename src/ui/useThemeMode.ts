import { useCallback, useEffect, useState } from 'react';
import { applyTheme, baseTheme, type ThemeMode } from '../data/theme';

const STORAGE_KEY = 'eter11:theme-mode';

/** Zapamiętany wybór, inaczej preferencja systemu, inaczej ciemny. */
function initialMode(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Tryb prywatny blokuje odczyt — spadamy na preferencję systemu.
  }
  const prefersLight =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
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
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Bez zapisu też działa — po prostu nie zapamięta między wizytami.
    }
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), []);

  return { mode, setMode, toggle };
}
