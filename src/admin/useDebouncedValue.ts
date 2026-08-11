import { useEffect, useRef, useState } from 'react';

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
 *
 * `resetKey`: gdy `value` skacze hurtowo (świeże wczytanie z bazy, nie
 * wpisywanie znak po znaku), dogonienie ma być NATYCHMIASTOWE, nie po
 * `delayMs`. Bez tego panel admina pokazywał na moment fałszywe
 * „niezapisane zmiany" przy wejściu: `content`/`savedContent` (bez debounce)
 * skakały na nową treść z bazy w tym samym renderze, ale debounced wersja
 * `content` doganiała je dopiero po 250 ms, więc przez tę chwilę wyglądało,
 * jakby ktoś już coś zmienił, choć baza dopiero się wczytała. Przekazanie
 * czegoś, co zmienia się RAZEM z `value` przy takim hurtowym skoku (np.
 * bazowa wersja zapisu), jako `resetKey`, każe dogonić `value` od razu.
 */
export function useDebouncedValue<T>(value: T, delayMs: number, resetKey?: unknown): T {
  const [debounced, setDebounced] = useState(value);
  const prevResetKey = useRef(resetKey);

  useEffect(() => {
    if (resetKey !== prevResetKey.current) {
      prevResetKey.current = resetKey;
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs, resetKey]);

  return debounced;
}
