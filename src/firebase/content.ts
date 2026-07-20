import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ALL_CARDS } from '../data/cards';
import { ALL_CHARACTERS } from '../data/characters';
import { ALL_PROBLEMS } from '../data/problems';
import { DEFAULT_CONFIG } from '../engine/reducer';
import { db } from './client';
import { validateContent, type GameContent } from './validate';

/** Dane wbudowane — zapas, gdy Firestore jest niedostępny. */
export const BUILTIN_CONTENT: GameContent = {
  cards: ALL_CARDS,
  problems: ALL_PROBLEMS,
  characters: ALL_CHARACTERS,
  rules: DEFAULT_CONFIG,
};

export interface LoadResult {
  content: GameContent;
  /** Skąd pochodzą dane — UI informuje gracza o trybie offline. */
  source: 'firestore' | 'builtin';
  warning?: string;
}

const COLLECTION = 'content';
const DOCUMENT = 'game';

/**
 * Ładuje zawartość z Firestore.
 *
 * Awaria sieci, brak dokumentu i uszkodzone dane prowadzą do tego samego
 * skutku: gra działa na danych wbudowanych. Rozgrywka przy stole nie może
 * zależeć od połączenia.
 */
export async function loadContent(): Promise<LoadResult> {
  try {
    const snapshot = await getDoc(doc(db, COLLECTION, DOCUMENT));

    if (!snapshot.exists()) {
      return { content: BUILTIN_CONTENT, source: 'builtin' };
    }

    const data = snapshot.data();
    const validation = validateContent(data);

    if (!validation.ok) {
      return {
        content: BUILTIN_CONTENT,
        source: 'builtin',
        warning:
          'Dane w bazie są uszkodzone — gra działa na wersji wbudowanej. ' +
          validation.errors.join('; '),
      };
    }

    return { content: data as GameContent, source: 'firestore' };
  } catch {
    return {
      content: BUILTIN_CONTENT,
      source: 'builtin',
      warning: 'Tryb offline — gra korzysta z kart zapisanych w aplikacji.',
    };
  }
}

export interface SaveResult {
  ok: boolean;
  errors: string[];
}

/**
 * Zapisuje zawartość.
 * Walidacja poprzedza zapis — uszkodzone dane nie trafią do bazy i nie
 * zablokują gry innym.
 */
export async function saveContent(content: GameContent): Promise<SaveResult> {
  const validation = validateContent(content);
  if (!validation.ok) return { ok: false, errors: validation.errors };

  try {
    await setDoc(doc(db, COLLECTION, DOCUMENT), {
      ...content,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true, errors: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errors: [
        `Zapis nie powiódł się: ${message}. ` +
          'Sprawdź, czy jesteś zalogowany i czy reguły Firestore zawierają UID Twojego konta.',
      ],
    };
  }
}
