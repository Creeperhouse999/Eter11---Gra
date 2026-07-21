import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ALL_CARDS } from '../data/cards';
import { ALL_CHARACTERS } from '../data/characters';
import { ALL_PROBLEMS } from '../data/problems';
import { DEFAULT_FAMILIES } from '../data/families';
import { DEFAULT_THEME } from '../data/theme';
import { DEFAULT_UI_TEXT } from '../data/uiText';
import { DEFAULT_CONFIG } from '../engine/reducer';
import { db } from './client';
import { validateContent, type GameContent } from './validate';

/** Dane wbudowane — zapas, gdy Firestore jest niedostępny. */
export const BUILTIN_CONTENT: GameContent = {
  cards: ALL_CARDS,
  problems: ALL_PROBLEMS,
  characters: ALL_CHARACTERS,
  rules: DEFAULT_CONFIG,
  text: DEFAULT_UI_TEXT,
  theme: DEFAULT_THEME,
  families: DEFAULT_FAMILIES,
};

/**
 * Uzupełnia brakujące sekcje wartościami domyślnymi.
 *
 * Dokumenty zapisane przed dodaniem tekstów i motywu nie mają tych pól —
 * bez migracji panel pokazałby puste formularze, a gra straciłaby teksty.
 */
function migrate(raw: Record<string, unknown>): GameContent {
  return {
    ...(raw as unknown as GameContent),
    rules: { ...DEFAULT_CONFIG, ...(raw.rules as object) },
    text: { ...DEFAULT_UI_TEXT, ...(raw.text as object) },
    theme: { ...DEFAULT_THEME, ...(raw.theme as object) },
    families: { ...DEFAULT_FAMILIES, ...(raw.families as object) },
  };
}

export interface LoadResult {
  content: GameContent;
  source: 'firestore' | 'builtin';
  /**
   * Dlaczego użyto danych wbudowanych.
   * - `empty`: baza działa, ale panel nic jeszcze nie zapisał — stan normalny
   * - `invalid`: w bazie są dane, ale nie przechodzą walidacji
   * - `unreachable`: brak połączenia albo brak uprawnień do odczytu
   */
  reason?: 'empty' | 'invalid' | 'unreachable';
  warning?: string;
  /**
   * Znacznik czasu ostatniego zapisu. Panel odsyła go przy zapisie, żeby
   * dało się wykryć, że ktoś w międzyczasie zapisał coś innego.
   */
  updatedAt?: string;
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

    // Brak dokumentu to stan normalny: panel jeszcze nic nie zapisał.
    // Gra ma komplet kart w kodzie, więc gracz nie musi o tym wiedzieć.
    if (!snapshot.exists()) {
      return { content: BUILTIN_CONTENT, source: 'builtin', reason: 'empty' };
    }

    const raw = snapshot.data();
    const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined;
    const data = migrate(raw);
    const validation = validateContent(data);

    if (!validation.ok) {
      return {
        content: BUILTIN_CONTENT,
        source: 'builtin',
        reason: 'invalid',
        warning:
          'Dane w bazie są uszkodzone — gra działa na wersji wbudowanej. ' +
          validation.errors.join('; '),
      };
    }

    return { content: data, source: 'firestore', updatedAt };
  } catch {
    return {
      content: BUILTIN_CONTENT,
      source: 'builtin',
      reason: 'unreachable',
      warning: 'Brak połączenia z bazą — gra korzysta z kart zapisanych w aplikacji.',
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
export async function saveContent(
  content: GameContent,
  /**
   * Znacznik wersji, na której pracował panel. Gdy w bazie leży nowszy,
   * ktoś zapisał w międzyczasie — nadpisanie skasowałoby jego pracę bez
   * śladu, więc zapis jest wtedy odrzucany.
   */
  baseUpdatedAt?: string,
): Promise<SaveResult> {
  const validation = validateContent(content);
  if (!validation.ok) return { ok: false, errors: validation.errors };

  try {
    if (baseUpdatedAt !== undefined) {
      const current = await getDoc(doc(db, COLLECTION, DOCUMENT));
      const theirs = current.exists() ? current.data().updatedAt : undefined;

      if (typeof theirs === 'string' && theirs !== baseUpdatedAt) {
        return {
          ok: false,
          errors: [
            'Ktoś inny zapisał zmiany, odkąd otworzyłeś panel. ' +
              'Odśwież stronę i nanieś swoje poprawki jeszcze raz — ' +
              'inaczej skasowałbyś jego pracę.',
          ],
        };
      }
    }

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
