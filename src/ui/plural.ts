/**
 * Polska odmiana rzeczownika po liczbie.
 *
 * Trzy formy, nie dwie jak w angielskim: 1 karta, 2 karty, 5 kart. Wyjątkiem
 * są liczby 12–14, które mimo końcówki 2–4 biorą formę mnogą („12 kart",
 * nie „12 karty").
 *
 * Bez tego gra mówiła do dziecka „Masz 2 pasujących kart" — a odbiorcą jest
 * ośmiolatek, który dopiero uczy się czytać ze zrozumieniem.
 */
export function plural(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const lastDigit = count % 10;
  const lastTwo = count % 100;

  if (count === 1) return one;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}

/** Liczba wraz z odmienionym rzeczownikiem, np. „3 karty". */
export function counted(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  return `${count} ${plural(count, one, few, many)}`;
}
