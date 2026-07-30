/**
 * Grafika karty wgrana do biblioteki.
 *
 * Osobna od `Card.image` — biblioteka trzyma WSZYSTKIE wgrane pliki, także
 * te jeszcze nieprzypisane do żadnej karty. `cardId` wskazuje, do której
 * karty grafika aktualnie trafiła (ustawia jej `image`); brak oznacza,
 * że czeka na ręczne dopasowanie w panelu.
 */
export interface CardImage {
  id: string;
  /** Publiczny adres pliku w Storage. */
  url: string;
  /** Nazwa wgranego pliku (bez rozszerzenia) — do wyświetlenia i auto-dopasowania. */
  fileName: string;
  /** Id karty, do której grafika jest przypisana. Brak = nieprzypisana. */
  cardId?: string;
}
