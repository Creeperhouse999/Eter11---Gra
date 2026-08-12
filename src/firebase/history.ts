import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db } from './client';
import type { GameContent } from './validate';

/**
 * Zapis treści w historii.
 *
 * Firestore trzyma jedną wersję dokumentu — nadpisanie kasuje poprzednią
 * bezpowrotnie. To jedyna nieodwracalna operacja w całym panelu, a wykonują
 * ją cztery osoby na wspólnej treści. Historia zamienia „skasowałem godzinę
 * cudzej pracy" w „przywróć wersję sprzed".
 */
export interface ContentVersion {
  id: string;
  /** Kiedy zapisano. */
  at: string;
  /** Kto zapisał — imię z konta. */
  author: string;
  /** Co się zmieniło względem poprzedniej wersji, po ludzku. */
  summary: string;
  content: GameContent;
}

const COLLECTION = 'contentHistory';

/**
 * Ile wersji trzymamy.
 *
 * Dziesięć starcza, żeby cofnąć się przed cudzy zapis i przed własną
 * pomyłkę sprzed kilku dni. Każda wersja to pełna kopia treści (~100 KB),
 * więc trzymanie ich bez ograniczenia rosłoby bez końca.
 */
export const HISTORY_LIMIT = 10;

/** Nazwy sekcji w treści — po polsku, bo trafiają wprost do opisu zmian. */
const SECTION_LABELS: Record<string, string> = {
  cards: 'karty',
  problems: 'problemy',
  characters: 'postacie',
  rules: 'zasady',
  text: 'teksty',
  theme: 'kolory',
  // `themeLight` to osobna, edytowalna sekcja (kolory trybu jasnego). Bez niej
  // opis zmian pomijał zapisy dotykające wyłącznie jasnego motywu i mówił
  // „bez zmian w treści", choć wersja zapisała pełną kopię.
  themeLight: 'kolory (jasny)',
  families: 'rodziny',
  categories: 'kategorie',
  customIcons: 'ikony',
  intro: 'wstęp',
  tutorial: 'samouczek',
  // Bez tej sekcji zapis dotykający wyłącznie biblioteki grafik kart
  // (CardImagesEditor — wgranie grafiki, która nie dopasowała się
  // automatycznie do żadnej karty po nazwie pliku) mówił „bez zmian
  // w treści", choć wersja zapisała pełną kopię z inną `cardImages`.
  cardImages: 'grafiki kart',
};

/**
 * Opis zmian względem poprzedniej wersji.
 *
 * „Zapisano 14:32" nie mówi, czy warto się cofać. „karty, teksty" mówi.
 * Liczymy elementy tam, gdzie to listy — redaktor rozpoznaje własną zmianę
 * po tym, że dodał dwie karty, nie po znaczniku czasu.
 */
export function describeChanges(next: GameContent, previous?: GameContent): string {
  if (!previous) return 'pierwszy zapis';

  const touched: string[] = [];

  for (const [key, label] of Object.entries(SECTION_LABELS)) {
    const a = JSON.stringify(previous[key as keyof GameContent] ?? null);
    const b = JSON.stringify(next[key as keyof GameContent] ?? null);
    if (a === b) continue;

    const before = previous[key as keyof GameContent];
    const after = next[key as keyof GameContent];

    if (Array.isArray(before) && Array.isArray(after) && before.length !== after.length) {
      const diff = after.length - before.length;
      touched.push(`${label} (${diff > 0 ? '+' : ''}${diff})`);
    } else {
      touched.push(label);
    }
  }

  if (touched.length === 0) return 'bez zmian w treści';
  return touched.join(', ');
}

/**
 * Dopisuje wersję do historii i przycina najstarsze.
 *
 * Wywoływane po udanym zapisie treści, nie zamiast niego: gdyby zapis
 * historii się nie powiódł, treść i tak ma trafić do gry.
 */
export async function recordVersion(input: {
  content: GameContent;
  previous?: GameContent;
  author: string;
  at: string;
}): Promise<void> {
  // Identyfikatorem jest znacznik czasu, więc sortowanie po nazwie
  // dokumentu daje kolejność chronologiczną bez dodatkowego indeksu.
  const id = input.at;

  await setDoc(doc(db, COLLECTION, id), {
    at: input.at,
    author: input.author,
    summary: describeChanges(input.content, input.previous),
    content: input.content,
  });

  // Przycinanie po zapisie, nie przed: gdyby padło, historia jest o jedną
  // wersję za długa, a nie o jedną za krótka.
  //
  // I bez wywracania zapisu, gdy się nie uda: kasować stare wersje może tylko
  // admin (historia ma chronić przed nieodwracalnym nadpisaniem, więc nie
  // każdy redaktor ma prawo jej ruszać). Redaktorowi bez tego prawa odmowa
  // wracała jako niewyłapane odrzucenie obietnicy, choć jego treść ZAPISAŁA
  // SIĘ poprawnie. Sprzątanie jest najlepszym staraniem — nadmiarowe wersje
  // usunie następny zapis admina.
  try {
    const all = await getDocs(query(collection(db, COLLECTION), orderBy('at', 'desc')));
    const stale = all.docs.slice(HISTORY_LIMIT);
    await Promise.all(stale.map((entry) => deleteDoc(entry.ref)));
  } catch (error) {
    console.warn('Nie udało się przyciąć historii — wersje zostają:', error);
  }
}

export function watchHistory(
  onChange: (versions: ContentVersion[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, COLLECTION), orderBy('at', 'desc'), limit(HISTORY_LIMIT)),
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            at: data.at as string,
            author: (data.author as string) ?? '',
            summary: (data.summary as string) ?? '',
            content: data.content as GameContent,
          };
        }),
      );
    },
    // Historia jest wygodą, nie warunkiem pracy — gdy odczyt padnie,
    // panel ma działać dalej, tylko bez listy wersji.
    () => onChange([]),
  );
}
