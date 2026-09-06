/**
 * Karty rund — do druku, dla gry przy stole.
 *
 * Adam: „karty rund — czyli prosta karta z cyframi, 11 kart, na każdej jedna
 * cyfra 1–11. Gracze ustalają, ile rund chcą mieć na rozwiązanie problemu.
 * Rekomendacja to 5 rund, łatwiejszy poziom 8, najwięcej 11. Po każdej rundzie
 * odwracają kolejną kartę z cyfrą, aby wiedzieć, ile im rund zostało".
 *
 * W grze na ekranie liczbę rund pilnuje silnik (`roundsPerMission`); przy
 * stole nikt jej nie pilnuje, dopóki nie leży na stole jako karta. Stąd
 * osobny, prosty licznik do wydruku — nie zasada gry, tylko fizyczny pomocnik.
 */
export const DEFAULT_ROUND_CARDS = 11;

/** Górna granica — więcej niż dwadzieścia rund to już nie jest jedna misja. */
export const MAX_ROUND_CARDS = 20;

/**
 * Ile kart rund wydrukować: z treści gry, a przy braku albo złej wartości —
 * domyślne 11, tyle, ile podał Adam.
 */
export function liczbaKartRund(n?: number): number {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) return DEFAULT_ROUND_CARDS;
  return Math.min(n, MAX_ROUND_CARDS);
}

/** Numery na kartach: 1, 2, …, n. */
export function numeryRund(n?: number): number[] {
  return Array.from({ length: liczbaKartRund(n) }, (_, i) => i + 1);
}
