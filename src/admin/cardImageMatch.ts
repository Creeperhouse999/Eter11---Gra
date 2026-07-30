import type { Card } from '../engine/types';

/**
 * Sprowadza tekst do formy porównywalnej: bez polskich znaków, bez
 * wielkości liter, myślniki zamiast spacji/interpunkcji.
 *
 * Dzięki temu plik nazwany zarówno `psy-r-odpornosc.png` (id karty), jak
 * i `Odporność psychiczna.png` (nazwa karty) trafia do tej samej karty —
 * grafik nie musi znać wewnętrznych identyfikatorów.
 */
export function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Dopasowuje wgrywany plik do karty po nazwie pliku — porównuje z id oraz
 * z nazwą każdej karty. Zwraca pierwsze trafienie albo `undefined`, gdy
 * żadna karta nie pasuje (grafika czeka wtedy na ręczne przypisanie).
 */
export function matchCardByFileName(fileName: string, cards: Card[]): Card | undefined {
  const base = fileName.replace(/\.[^.]+$/, '');
  const normalized = normalizeForMatch(base);
  if (!normalized) return undefined;
  return cards.find(
    (card) =>
      normalizeForMatch(card.id) === normalized || normalizeForMatch(card.name) === normalized,
  );
}
