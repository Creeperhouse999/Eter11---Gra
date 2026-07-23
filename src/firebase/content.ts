import { doc, getDoc, setDoc } from 'firebase/firestore';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { db } from './client';
import { validateContent, type GameContent } from './validate';

/**
 * Uzupełnia brakujące sekcje wartościami domyślnymi.
 *
 * Dokumenty zapisane przed dodaniem tekstów i motywu nie mają tych pól —
 * bez migracji panel pokazałby puste formularze, a gra straciłaby teksty.
 */
function migrate(raw: Record<string, unknown>): GameContent {
  return {
    ...(raw as unknown as GameContent),
    // Wartości domyślne bierzemy z danych wbudowanych — jedno źródło prawdy
    // zamiast siedmiu osobnych importów, które i tak dawały to samo.
    rules: { ...BUILTIN_CONTENT.rules, ...(raw.rules as object) },
    text: { ...BUILTIN_CONTENT.text, ...(raw.text as object) },
    theme: { ...BUILTIN_CONTENT.theme, ...(raw.theme as object) },
    families: { ...BUILTIN_CONTENT.families, ...(raw.families as object) },
    // Wstęp i samouczek: zapisy sprzed dodania tych pól ich nie mają, a bez
    // podstawienia gra pokazałaby pusty ekran powitalny. Pusta lista jest
    // traktowana jak brak — redaktor mógł skasować wszystkie sceny.
    // Kategorie scalamy po kluczu: zapis sprzed dodania tego pola nie ma
    // żadnej, a brakująca nazwa zostawiłaby na ściance puste miejsce.
    categories: {
      ...BUILTIN_CONTENT.categories,
      ...(raw.categories as object),
    } as GameContent['categories'],
    customIcons: (raw.customIcons as GameContent['customIcons']) ?? [],
    intro: (raw.intro as GameContent['intro']) ?? BUILTIN_CONTENT.intro,
    tutorial: (raw.tutorial as GameContent['tutorial'])?.length
      ? (raw.tutorial as GameContent['tutorial'])
      : BUILTIN_CONTENT.tutorial,
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
  /**
   * Znacznik faktycznie zapisany w dokumencie.
   *
   * Panel musi dostać dokładnie tę wartość, a nie własne `new Date()` —
   * różnica choćby milisekundy sprawiłaby, że przy następnym zapisie
   * wykrywanie konfliktu uznałoby własną wersję za cudzą i odmówiło zapisu.
   */
  updatedAt?: string;
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
    // Wykrywanie konfliktu zawsze, także przy pierwszym zapisie.
    //
    // Wcześniej sprawdzenie biegło tylko, gdy panel znał już wersję bazową.
    // Ale gdy jej NIE znał (świeży dokument albo zapis, zanim `loadContent`
    // zdążył ustawić wersję), a w bazie ktoś inny właśnie coś zapisał, zapis
    // przechodził i kasował cudzą pracę bez śladu. Teraz: jeśli nie mamy
    // wersji bazowej, a w bazie leży już dokument z wersją, traktujemy to jak
    // konflikt — bo skoro coś tam jest, ktoś to zapisał przed nami.
    const current = await getDoc(doc(db, COLLECTION, DOCUMENT));
    const theirs = current.exists() ? current.data().updatedAt : undefined;
    const conflict =
      typeof theirs === 'string' &&
      (baseUpdatedAt === undefined || theirs !== baseUpdatedAt);

    if (conflict) {
      return {
        ok: false,
        errors: [
          'Ktoś inny zapisał zmiany, odkąd otworzyłeś panel. ' +
            'Odśwież stronę i nanieś swoje poprawki jeszcze raz — ' +
            'inaczej skasowałbyś jego pracę.',
        ],
      };
    }

    const updatedAt = new Date().toISOString();
    await setDoc(doc(db, COLLECTION, DOCUMENT), { ...content, updatedAt });
    return { ok: true, errors: [], updatedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errors: [
        `Zapis nie powiódł się: ${message}. ` +
          'Sprawdź, czy nadal jesteś zalogowany — sesja mogła wygasnąć.',
      ],
    };
  }
}
