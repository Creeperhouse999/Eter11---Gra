import { useEffect, useRef, useState } from 'react';

/** Ile trwa wygaszenie nakładki. Ta sama wartość co w stylach przejścia. */
export const FADE_MS = 160;

/**
 * Nakładka gaśnie przy zamykaniu zamiast znikać skokiem.
 *
 * Okna w grze wjeżdżają animacją (`eter-pop`, `eter-fade-in`), ale znikały
 * natychmiast: `if (!open) return null` wycina je z drzewa w jednej klatce.
 * Przy oknie potwierdzenia, które dziecko zamyka kilkanaście razy w partii,
 * ta asymetria rzuca się w oczy — coś wpływa miękko, a odchodzi szarpnięciem.
 *
 * Hak trzyma nakładkę w drzewie jeszcze przez chwilę po zamknięciu i mówi,
 * czy właśnie odchodzi. Zwraca:
 * - `widoczna` — czy w ogóle renderować (obejmuje czas wygaszania),
 * - `odchodzi` — czy malować stan końcowy przejścia.
 *
 * Przy `prefers-reduced-motion` przeglądarka i tak skraca przejście do zera
 * (patrz reguła w `theme.css`), więc osobnej gałęzi tu nie potrzeba.
 */
export function useClosingFade(open: boolean): { widoczna: boolean; odchodzi: boolean } {
  const [widoczna, setWidoczna] = useState(open);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);

    if (open) {
      // Otwarcie natychmiast — czekanie psułoby wrażenie reakcji na klik.
      setWidoczna(true);
      return;
    }

    // Zamknięcie: zostawiamy element na czas wygaszania.
    timer.current = window.setTimeout(() => setWidoczna(false), FADE_MS);
    return () => window.clearTimeout(timer.current);
  }, [open]);

  return { widoczna, odchodzi: widoczna && !open };
}
