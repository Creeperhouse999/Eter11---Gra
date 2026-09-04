import type { Card, CardCategory, FamilyId } from '../engine/types';

/**
 * Sito listy kart w edytorze: kategoria, rodzina i szukana fraza.
 *
 * Wydzielone z `CardEditor`, żeby dało się je sprawdzić wprost. Test tego
 * filtrowania montował dotąd CAŁY edytor z sześćdziesięcioma kilkoma kartami
 * i klikał w listę rozwijaną — kilka sekund na sprawdzenie jednego `if`-a.
 * Przy rosnącej suicie taki test zaczął wysypywać się na timeout, a wtedy
 * czerwone światło mówiło o wolnym renderze, nie o usterce w filtrowaniu.
 */
export interface CardFilter {
  category: CardCategory | 'all';
  /**
   * Rodzina albo 'all'. Typ jest luźny (`string`), bo rodziny są danymi
   * z panelu, nie stałą listą w kodzie — redaktor może je dodawać.
   */
  family: FamilyId | 'all' | string;
  /** Fraza; każde słowo musi wystąpić, kolejność bez znaczenia. */
  szukaj: string;
}

export type CardSort = 'order' | 'name' | 'category';

export function filtrujKarty(cards: Card[], filtr: CardFilter, sort: CardSort): Card[] {
  const terms = filtr.szukaj.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return cards
    .filter((card) => {
      if (filtr.category !== 'all' && card.category !== filtr.category) return false;
      if (filtr.family !== 'all' && card.family !== filtr.family) return false;
      if (terms.length === 0) return true;

      // Szukamy też po kategorii, bo „mentor" jest naturalnym słowem
      // szukanym, choć nie stoi w nazwie ani w opisie karty.
      const haystack = `${card.name} ${card.description} ${card.category}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'pl');
      if (sort === 'category') {
        return a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'pl');
      }
      // `order` zostawia kolejność z pliku — tak, jak karty leżą w talii.
      return 0;
    });
}
