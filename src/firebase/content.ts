import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { LIGHT_THEME } from '../data/theme';
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
    // Motyw jasny domykamy tak samo jak ciemny — inaczej dołożenie nowego
    // koloru do DEFAULT_THEME sprawiłoby, że zapisany wcześniej themeLight jest
    // o ten klucz krótszy, walidacja odrzuca CAŁĄ zawartość i gra po cichu
    // wraca do wbudowanej. Uzupełniamy z LIGHT_THEME (jasne wartości, nie
    // ciemne z BUILTIN_CONTENT.theme) i tylko gdy themeLight istnieje: brak
    // jest poprawnym stanem starszego dokumentu (gra podstawia wtedy LIGHT_THEME
    // przy renderze), a pusty obiekt walidacja uznałaby za komplet braków.
    ...(raw.themeLight
      ? { themeLight: { ...LIGHT_THEME, ...(raw.themeLight as object) } }
      : {}),
    // Wstęp i samouczek: zapisy sprzed dodania tych pól ich nie mają, a bez
    // podstawienia gra pokazałaby pusty ekran powitalny. Pusta lista jest
    // traktowana jak brak — redaktor mógł skasować wszystkie sceny.
    // Kategorie scalamy po kluczu: zapis sprzed dodania tego pola nie ma
    // żadnej, a brakująca nazwa zostawiłaby na ściance puste miejsce.
    categories: {
      ...BUILTIN_CONTENT.categories,
      ...(raw.categories as object),
    } as GameContent['categories'],
    // Rodziny scalamy po kluczu tak samo jak kategorie: zapis sprzed dodania
    // tego pola (albo z okrojonym po którejś kategorii) nie ma pełnej mapy, a
    // walidacja rodzin NIE sprawdza. Bez domknięcia `families[kategoria]` bywało
    // `undefined`, więc edytor rodzin (i inne miejsca iterujące mapę) wywracały
    // się na `.map` — pusty ekran zamiast panelu.
    families: {
      ...BUILTIN_CONTENT.families,
      ...(raw.families as object),
    } as GameContent['families'],
    customIcons: (raw.customIcons as GameContent['customIcons']) ?? [],
    cardImages: (raw.cardImages as GameContent['cardImages']) ?? [],
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
    //
    // Odczyt i zapis MUSZĄ być atomowe. Osobne getDoc + setDoc zostawiały
    // okno: dwaj redaktorzy zapisujący w tej samej chwili oba odczytywali tę
    // samą wersję jako „bez konfliktu", po czym drugi setDoc kasował pierwszy
    // — dokładnie ta strata, której funkcja ma zapobiegać. runTransaction
    // każe Firestore ponowić całość, gdy dokument zmieni się między odczytem
    // a zapisem, więc sprawdzenie zawsze dotyczy wersji, którą naprawdę
    // nadpisujemy.
    const ref = doc(db, COLLECTION, DOCUMENT);
    const result = await runTransaction(db, async (tx) => {
      const current = await tx.get(ref);
      const theirs = current.exists() ? current.data()!.updatedAt : undefined;
      const conflict =
        typeof theirs === 'string' &&
        (baseUpdatedAt === undefined || theirs !== baseUpdatedAt);
      if (conflict) return { conflict: true as const, updatedAt: undefined };

      const updatedAt = new Date().toISOString();
      tx.set(ref, { ...content, updatedAt });
      return { conflict: false as const, updatedAt };
    });

    if (result.conflict) {
      return {
        ok: false,
        errors: [
          'Ktoś inny zapisał zmiany, odkąd otworzyłeś panel. ' +
            'Odśwież stronę i nanieś swoje poprawki jeszcze raz — ' +
            'inaczej skasowałbyś jego pracę.',
        ],
      };
    }

    return { ok: true, errors: [], updatedAt: result.updatedAt };
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
