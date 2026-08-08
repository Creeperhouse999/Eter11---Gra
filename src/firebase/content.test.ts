import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { LIGHT_THEME } from '../data/theme';

/**
 * Migracja zawartości z bazy.
 *
 * Regresja: `migrate` uzupełniał brakujące klucze motywu CIEMNEGO
 * (`theme`) wartościami domyślnymi, ale motywu JASNEGO (`themeLight`) już
 * nie. Gdy do `DEFAULT_THEME` dochodził nowy kolor, zapisany wcześniej
 * `themeLight` był o ten klucz krótszy → walidacja odrzucała całą zawartość →
 * gra po cichu wracała do danych WBUDOWANYCH (znikały wszystkie karty,
 * problemy i zasady z panelu), mimo że w bazie były poprawne. Test pilnuje,
 * że niekompletny `themeLight` jest domykany, a nie wywraca całości.
 */

// Sterowany „dokument w bazie".
let docData: Record<string, unknown> | undefined;
// Gdy true, odczyt symuluje awarię sieci (getDoc rzuca).
let getThrows = false;

vi.mock('./client', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  getDoc: async () => {
    if (getThrows) throw new Error('offline');
    return {
      exists: () => docData !== undefined,
      data: () => docData,
    };
  },
  runTransaction: async () => ({ conflict: false, updatedAt: 'x' }),
}));

const { loadContent } = await import('./content');

beforeEach(() => {
  docData = undefined;
  getThrows = false;
});

describe('loadContent — migracja themeLight', () => {
  it('domyka niekompletny themeLight zamiast wywracać całość do wbudowanej', async () => {
    // Symuluje realną sytuację: dokument zapisany, zanim do DEFAULT_THEME
    // doszedł klucz `accent` w motywie jasnym — zapisany themeLight go nie ma.
    const { accent: _dropped, ...partialLight } = LIGHT_THEME;
    docData = {
      ...structuredClone(BUILTIN_CONTENT),
      updatedAt: '2026-01-01T00:00:00.000Z',
      themeLight: partialLight,
    };

    const result = await loadContent();
    // Bez domknięcia themeLight walidacja odrzuca dokument i source==='builtin'.
    expect(result.source, result.warning).toBe('firestore');
    // Brakujący kolor uzupełniony z wbudowanego motywu JASNEGO (nie ciemnego).
    expect(result.content.themeLight?.accent).toBe(LIGHT_THEME.accent);
  });

  it('kompletny themeLight przechodzi bez zmian', async () => {
    docData = {
      ...structuredClone(BUILTIN_CONTENT),
      updatedAt: '2026-01-01T00:00:00.000Z',
      themeLight: { ...LIGHT_THEME },
    };
    const result = await loadContent();
    expect(result.source, result.warning).toBe('firestore');
  });

  it('brak themeLight (starszy dokument) nadal ładuje się z bazy', async () => {
    docData = {
      ...structuredClone(BUILTIN_CONTENT),
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const result = await loadContent();
    expect(result.source, result.warning).toBe('firestore');
  });
});

/**
 * Pozostałe gałęzie sieci bezpieczeństwa: cokolwiek jest (albo nie ma) w bazie,
 * gra rusza, a panel dostaje powód. Bez tego pusta baza wyglądałaby jak awaria,
 * uszkodzona treść — jak brak sieci, a błąd sieci mógłby wywalić ładowanie.
 */
describe('loadContent — gałęzie sieci bezpieczeństwa', () => {
  it('brak dokumentu → wbudowane, powód „empty"', async () => {
    docData = undefined;
    const result = await loadContent();
    expect(result.source).toBe('builtin');
    expect(result.reason).toBe('empty');
  });

  it('poprawna treść z bazy przenosi znacznik updatedAt do panelu', async () => {
    docData = {
      ...structuredClone(BUILTIN_CONTENT),
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const result = await loadContent();
    expect(result.source, result.warning).toBe('firestore');
    // Panel odsyła TEN znacznik przy zapisie, żeby wykryć cudzą zmianę.
    expect(result.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('częściowa treść (bez tekstów i wstępu) → migracja dopełnia, wciąż firestore', async () => {
    // Dokument sprzed dodania tekstów/motywu/wstępu: same sekcje wymagane.
    const full = structuredClone(BUILTIN_CONTENT);
    docData = {
      cards: full.cards,
      problems: full.problems,
      characters: full.characters,
      rules: full.rules,
      families: full.families,
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const result = await loadContent();
    expect(result.source, result.warning).toBe('firestore');
    // Migracja dołożyła teksty i wstęp z wersji wbudowanej.
    expect(result.content.text.gameTitle).toBe(BUILTIN_CONTENT.text.gameTitle);
    expect(result.content.intro?.story.length ?? 0).toBeGreaterThan(0);
  });

  it('brak `families` (starszy dokument) → migracja domyka mapę', async () => {
    // Dokument sprzed dodania pola `families`: wszystkie sekcje wymagane oprócz
    // rodzin. Bez domknięcia families[kategoria] było undefined i FamilyEditor
    // wywracał się na `.map` — pusty ekran zamiast panelu.
    const full = structuredClone(BUILTIN_CONTENT);
    docData = {
      cards: full.cards,
      problems: full.problems,
      characters: full.characters,
      rules: full.rules,
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const result = await loadContent();
    expect(result.source, result.warning).toBe('firestore');
    expect(result.content.families).toBeDefined();
    expect(Array.isArray(result.content.families.psychological)).toBe(true);
    expect(result.content.families.psychological.length).toBeGreaterThan(0);
  });

  it('uszkodzona treść → wbudowane, powód „invalid" z opisem błędu', async () => {
    const broken = structuredClone(BUILTIN_CONTENT);
    broken.cards[0] = { ...broken.cards[0], name: '' };
    docData = { ...broken, updatedAt: '2026-01-01T00:00:00.000Z' };

    const result = await loadContent();
    expect(result.source).toBe('builtin');
    expect(result.reason).toBe('invalid');
    expect(result.warning).toContain('nazwy');
  });

  it('błąd sieci → wbudowane, powód „unreachable" (nie wywala ładowania)', async () => {
    getThrows = true;
    const result = await loadContent();
    expect(result.source).toBe('builtin');
    expect(result.reason).toBe('unreachable');
  });

  it('uszkodzone cardImages/customIcons (nie-lista) → migracja domyka do pustej listy', async () => {
    // Ręczna edycja dokumentu w konsoli Firestore (albo stary błąd zapisu) może
    // zostawić `cardImages`/`customIcons` jako obiekt zamiast tablicy. `migrate`
    // domyka je tylko przy `null`/`undefined` (`?? []`) — inny nie-array typ
    // przechodził bez zmian i wywracał CardImagesEditor na `images.filter(...)`
    // (nie chronione żadnym `Array.isArray`), czyli crash całej zakładki „Grafiki
    // kart" w panelu admina.
    docData = {
      ...structuredClone(BUILTIN_CONTENT),
      updatedAt: '2026-01-01T00:00:00.000Z',
      cardImages: { notAnArray: true },
      customIcons: { notAnArray: true },
    };

    const result = await loadContent();
    expect(result.source, result.warning).toBe('firestore');
    expect(Array.isArray(result.content.cardImages)).toBe(true);
    expect(Array.isArray(result.content.customIcons)).toBe(true);
  });
});
