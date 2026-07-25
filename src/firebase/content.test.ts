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

vi.mock('./client', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  getDoc: async () => ({
    exists: () => docData !== undefined,
    data: () => docData,
  }),
  runTransaction: async () => ({ conflict: false, updatedAt: 'x' }),
}));

const { loadContent } = await import('./content');

beforeEach(() => {
  docData = undefined;
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
