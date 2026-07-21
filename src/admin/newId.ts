/**
 * Identyfikator nowego elementu.
 *
 * `Date.now()` przy dwóch kliknięciach w tej samej milisekundzie dawał ten
 * sam identyfikator: edycja jednego elementu zmieniała oba, a zapis leciał
 * z błędem o duplikacie.
 */
export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}
