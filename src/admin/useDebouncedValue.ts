import { useEffect, useState } from 'react';

/**
 * Zwraca wartość, która dogania `value` dopiero po `delayMs` bez zmian.
 *
 * Panel admina wiąże pola edycji wprost z `content` — to musi zostać, żeby
 * pisanie było natychmiastowe. Ale kilka miejsc liczy z `content` coś
 * kosztownego na całej ~100 KB treści (walidacja, diff do zapisu, porównanie
 * JSON-em) w tym samym renderze co aktualizacja pola — każdy znak czekał na
 * te obliczenia, zanim przeglądarka zdążyła pokazać go w polu. Debounce
 * odrywa te kosztowne pochodne od pola: input dostaje `content` na żywo,
 * a wolne obliczenia dostają wersję, która nadgania dopiero, gdy redaktor
 * przestanie pisać.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
