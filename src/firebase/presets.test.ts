import { describe, it, expect, vi } from 'vitest';
import { ALL_CARDS } from '../data/cards';
import { ALL_CHARACTERS } from '../data/characters';
import { ALL_PROBLEMS } from '../data/problems';
import { DEFAULT_FAMILIES } from '../data/families';
import { DEFAULT_THEME, LIGHT_THEME } from '../data/theme';
import { DEFAULT_UI_TEXT } from '../data/uiText';
import { DEFAULT_CONFIG } from '../engine/reducer';
import type { GameContent } from './validate';
import type { PresetBundle, Preset } from './presets';

/**
 * Presety — zapisane warianty sekcji treści.
 *
 * Dwie rzeczy muszą trzymać, bo obie po cichu psują pracę zespołu:
 *
 * 1. Preset kolorów bierze OBA warianty naraz. Jasny i ciemny to jeden wygląd,
 *    nie dwa niezależne — preset „tylko ciemny" dałby po wczytaniu zestaw
 *    rozjechany w połowie, a rozjazdu nie widać, dopóki ktoś nie przełączy
 *    trybu.
 * 2. Zestaw (preset całej apki) WSKAZUJE presety sekcji, nie kopiuje ich
 *    treści — tak prosił Alan („podłączone presety każdej kategorii"). Dzięki
 *    temu poprawka w presecie kolorów przechodzi na wszystkie zestawy, które
 *    go używają. Gdyby kopiował, każdy zestaw trzeba by składać od nowa.
 */

vi.mock('./client', () => ({ db: {}, auth: {} }));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: () => ({}),
  deleteDoc: vi.fn(),
  doc: () => ({}),
  onSnapshot: () => () => {},
  orderBy: () => ({}),
  query: () => ({}),
  setDoc: vi.fn(),
}));

const { sectionData, applySection, applyBundle } = await import('./presets');

const content = (): GameContent => ({
  cards: structuredClone(ALL_CARDS),
  problems: structuredClone(ALL_PROBLEMS),
  characters: structuredClone(ALL_CHARACTERS),
  rules: { ...DEFAULT_CONFIG },
  text: { ...DEFAULT_UI_TEXT },
  theme: { ...DEFAULT_THEME },
  themeLight: { ...LIGHT_THEME },
  families: structuredClone(DEFAULT_FAMILIES),
});

describe('sectionData / applySection', () => {
  it('preset kolorów bierze oba warianty: jasny i ciemny', () => {
    const dane = sectionData(content(), 'theme') as {
      theme: unknown;
      themeLight: unknown;
    };

    // Sedno: zapisanie samego ciemnego dałoby po wczytaniu zestaw, w którym
    // tryb jasny został po poprzedniej wersji.
    expect(dane.theme).toBeDefined();
    expect(dane.themeLight).toBeDefined();
  });

  it('wczytanie kolorów podmienia oba warianty', () => {
    const preset = sectionData(
      { ...content(), theme: { ...DEFAULT_THEME, accent: '#111111' }, themeLight: { ...LIGHT_THEME, accent: '#222222' } },
      'theme',
    );

    const wynik = applySection(content(), 'theme', preset);

    expect(wynik.theme.accent).toBe('#111111');
    expect(wynik.themeLight?.accent).toBe('#222222');
  });

  it('preset karty podmienia całą listę, nie dokleja', () => {
    const jedna = [ALL_CARDS[0]];

    const wynik = applySection(content(), 'cards', jedna);

    expect(wynik.cards).toHaveLength(1);
    // Reszta treści zostaje nietknięta — preset dotyczy jednej sekcji.
    expect(wynik.problems.length).toBe(ALL_PROBLEMS.length);
  });
});

describe('applyBundle — zestaw wskazuje presety, nie kopiuje ich', () => {
  const presety: Preset[] = [
    {
      id: 'p-kolory',
      section: 'theme',
      name: 'Świąteczne',
      author: 'Alan',
      createdAt: '2026-08-01T10:00:00.000Z',
      data: { theme: { ...DEFAULT_THEME, accent: '#ff0000' }, themeLight: { ...LIGHT_THEME } },
    },
    {
      id: 'p-karty',
      section: 'cards',
      name: 'Skrócona talia',
      author: 'Adam',
      createdAt: '2026-08-01T10:00:00.000Z',
      data: [ALL_CARDS[0], ALL_CARDS[1]],
    },
  ];

  const zestaw: PresetBundle = {
    id: 'z1',
    name: 'Wersja świąteczna',
    author: 'Alan',
    createdAt: '2026-08-01T10:00:00.000Z',
    parts: { theme: 'p-kolory', cards: 'p-karty' },
  };

  it('składa treść z aktualnej zawartości wskazanych presetów', () => {
    const { content: wynik, missing } = applyBundle(content(), zestaw, presety);

    expect(wynik.theme.accent).toBe('#ff0000');
    expect(wynik.cards).toHaveLength(2);
    expect(missing).toHaveLength(0);
  });

  it('poprawka w presecie przechodzi na zestaw bez ruszania zestawu', () => {
    // Sedno całej decyzji: zmieniamy TYLKO preset, zestaw zostaje ten sam.
    const poprawione = presety.map((p) =>
      p.id === 'p-kolory'
        ? { ...p, data: { theme: { ...DEFAULT_THEME, accent: '#00ff00' }, themeLight: { ...LIGHT_THEME } } }
        : p,
    );

    const { content: wynik } = applyBundle(content(), zestaw, poprawione);

    expect(wynik.theme.accent).toBe('#00ff00');
  });

  it('skasowany preset pomija sekcję, zamiast wywracać wczytanie', () => {
    const bezKolorow = presety.filter((p) => p.id !== 'p-kolory');

    const { content: wynik, missing } = applyBundle(content(), zestaw, bezKolorow);

    // Karty się wczytały, kolory zostały jak były — i mówimy o tym wprost.
    expect(wynik.cards).toHaveLength(2);
    expect(wynik.theme.accent).toBe(DEFAULT_THEME.accent);
    expect(missing).toEqual(['theme']);
  });
});
