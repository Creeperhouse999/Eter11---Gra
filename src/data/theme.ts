/**
 * Motyw kolorystyczny gry.
 *
 * Wartości trafiają do zmiennych CSS przy starcie aplikacji, więc panel może
 * je zmieniać bez wdrożenia. Klucze odpowiadają zmiennym `--eter-*`
 * z src/styles/theme.css.
 */
export interface ThemeColors {
  bg: string;
  surface: string;
  raised: string;
  edge: string;
  ink: string;
  inkDim: string;
  accent: string;
  accent2: string;
  danger: string;
  success: string;
  typeAction: string;
  typeThinking: string;
  typeCooperation: string;
  typeSelfchange: string;
  catPsychological: string;
  catEter11: string;
  catBlackswan: string;
  catDigital: string;
  catSocial: string;
  catTalent: string;
  catMentor: string;
  familyRed: string;
  familyBlue: string;
  familyYellow: string;
  familyGreen: string;
}

export const DEFAULT_THEME: ThemeColors = {
  bg: '#0a1020',
  surface: '#141d33',
  raised: '#1b2740',
  edge: '#2a3a5c',
  ink: '#e9f0ff',
  inkDim: '#94a6c8',
  accent: '#3ddbd0',
  accent2: '#a97cff',
  danger: '#ff6b8a',
  success: '#5ce08f',
  typeAction: '#ff6b6b',
  typeThinking: '#5b9dff',
  typeCooperation: '#ffc94d',
  typeSelfchange: '#5ce08f',
  catPsychological: '#ff8fb3',
  catEter11: '#ffffff',
  catBlackswan: '#7c8db0',
  catDigital: '#5bc8ff',
  catSocial: '#ffc94d',
  catTalent: '#a97cff',
  catMentor: '#3ddbd0',
  familyRed: '#ff6b6b',
  familyBlue: '#5b9dff',
  familyYellow: '#ffc94d',
  familyGreen: '#5ce08f',
};

/**
 * Motyw jasny.
 *
 * Odwraca tła i tekst względem ciemnego, zachowując akcenty i kolory kart
 * (rodziny, kategorie, typy) — te niosą znaczenie w grze, więc muszą zostać
 * rozpoznawalne. Akcenty lekko przyciemnione, żeby były czytelne na jasnym tle.
 */
export const LIGHT_THEME: ThemeColors = {
  bg: '#f4f7fc',
  surface: '#ffffff',
  raised: '#eef2f9',
  edge: '#d3dceb',
  ink: '#12203a',
  inkDim: '#5a6b8c',
  // Akcent niebiesko-purpurowy — ten sam charakter co w ciemnym motywie
  // (tam accent2 = #a97cff), przyciemniony, żeby był czytelny na jasnym tle.
  accent: '#6d3fe0',
  accent2: '#3d7fd6',
  danger: '#d6336c',
  success: '#1f9d57',
  typeAction: '#e03131',
  typeThinking: '#1c7ed6',
  // Żółć/złoto jako TEKST na jasnym tle. Karta maluje nazwę, etykietę i ikonę
  // kolorem rodziny/kategorii — a `#e8a800` na `--eter-raised` (#eef2f9) dawał
  // ~1.86:1, więc żółte karty i podpisy „Współpraca"/„Społeczna" były w trybie
  // jasnym praktycznie nieczytelne (reszta rodzin trzyma ~3:1+). Ciemniejsze
  // złoto `#9a6b00` daje ~4.2:1 na wyniesionym tle i ~4.7:1 na białym, a wciąż
  // jest wyraźnie „żółte/złote" — ten sam wariant niesie pasek karty i obrys
  // ścianki, więc dopasowanie koloru do koloru zostaje zachowane.
  typeCooperation: '#9a6b00',
  typeSelfchange: '#1f9d57',
  catPsychological: '#d6336c',
  catEter11: '#334155',
  catBlackswan: '#64748b',
  catDigital: '#1c7ed6',
  catSocial: '#9a6b00',
  catTalent: '#7c3aed',
  catMentor: '#0d9488',
  familyRed: '#e03131',
  familyBlue: '#1c7ed6',
  familyYellow: '#9a6b00',
  familyGreen: '#1f9d57',
};

/**
 * Styl „Kolorowy" — wariant dla dzieci.
 *
 * Adam przysłał grafiki: świecące tęczowe klocki na ciemnym tle, mocne
 * nasycone barwy, wesoło i zabawkowo — i poprosił, żeby obecny wygląd został
 * jako „Klasyczny", a ten stanął obok jako drugi do wyboru.
 *
 * Tło zostaje ciemne (na nim neon świeci; na białym te same kolory bledną),
 * ale wszystko inne idzie w górę nasycenia. Rodziny i kategorie dostają
 * czyste barwy tęczy zamiast przygaszonych — z zachowaniem tego, co niesie
 * znaczenie: czerwony dalej jest czerwony, niebieski niebieski, bo kolor
 * decyduje o dopasowaniu karty do ścianki.
 */
export const COLORFUL_THEME: ThemeColors = {
  // Granat zamiast czerni: pod neonem czysta czerń wygląda jak dziura,
  // a lekko niebieskie tło trzyma wszystko razem.
  bg: '#12083a',
  surface: '#1d1160',
  raised: '#2a1a80',
  edge: '#5b3fd9',
  ink: '#ffffff',
  // Jasny liliowy zamiast szarego: szary na fioletowym tle wygląda brudno.
  inkDim: '#c4b5fd',
  accent: '#22e0d6',
  accent2: '#ff5fd2',
  danger: '#ff4d6d',
  success: '#3ef08a',
  typeAction: '#ff5252',
  typeThinking: '#3d9bff',
  typeCooperation: '#ffd633',
  typeSelfchange: '#3ef08a',
  catPsychological: '#ff5fd2',
  catEter11: '#ffffff',
  catBlackswan: '#a78bfa',
  catDigital: '#22d3ff',
  catSocial: '#ffd633',
  catTalent: '#c084fc',
  catMentor: '#22e0d6',
  familyRed: '#ff5252',
  familyBlue: '#3d9bff',
  familyYellow: '#ffd633',
  familyGreen: '#3ef08a',
};

/**
 * Gotowe style do wyboru w panelu.
 *
 * Redaktor nie musi układać dwudziestu kolorów od zera — klika styl i ma
 * spójny zestaw. Własne poprawki nadal działają: preset tylko wypełnia pola.
 */
export const THEME_PRESETS: Array<{ name: string; opis: string; colors: ThemeColors }> = [
  {
    name: 'Klasyczny',
    opis: 'Ciemny, spokojny — ten, który znacie.',
    colors: DEFAULT_THEME,
  },
  {
    name: 'Kolorowy',
    opis: 'Tęczowy i dziecięcy, wg grafik Adama.',
    colors: COLORFUL_THEME,
  },
];

export type ThemeMode = 'dark' | 'light';

/**
 * Motywy z bazy (ustawione przez panel), osobno dla trybu ciemnego i jasnego.
 * Rejestr modułowy, bo `useThemeMode` (przełącznik) nie ma dostępu do stanu
 * zawartości, a musi po przełączeniu zastosować WŁASNY motyw redaktora, nie
 * tylko wbudowany.
 */
let overrides: { dark?: ThemeColors; light?: ThemeColors } = {};

export function setThemeOverrides(next: { dark?: ThemeColors; light?: ThemeColors }) {
  overrides = next;
}

/** Motyw dla trybu: własny z bazy, jeśli jest; inaczej wbudowany. */
export function baseTheme(mode: ThemeMode): ThemeColors {
  if (mode === 'light') return overrides.light ?? LIGHT_THEME;
  return overrides.dark ?? DEFAULT_THEME;
}

/** Mapowanie klucza motywu na nazwę zmiennej CSS. */
const CSS_VARIABLES: Record<keyof ThemeColors, string> = {
  bg: '--eter-bg',
  surface: '--eter-surface',
  raised: '--eter-raised',
  edge: '--eter-edge',
  ink: '--eter-ink',
  inkDim: '--eter-ink-dim',
  accent: '--eter-accent',
  accent2: '--eter-accent-2',
  danger: '--eter-danger',
  success: '--eter-success',
  typeAction: '--eter-type-action',
  typeThinking: '--eter-type-thinking',
  typeCooperation: '--eter-type-cooperation',
  typeSelfchange: '--eter-type-selfchange',
  catPsychological: '--eter-cat-psychological',
  catEter11: '--eter-cat-eter11',
  catBlackswan: '--eter-cat-blackswan',
  catDigital: '--eter-cat-digital',
  catSocial: '--eter-cat-social',
  catTalent: '--eter-cat-talent',
  catMentor: '--eter-cat-mentor',
  familyRed: '--eter-family-red',
  familyBlue: '--eter-family-blue',
  familyYellow: '--eter-family-yellow',
  familyGreen: '--eter-family-green',
};

/**
 * Kolory, które trafiają do konfiguracji Tailwinda jako `rgb(<kanały> / alfa)` —
 * dla nich obok wersji hex ustawiamy też wariant kanałowy `--eter-*-rgb`, żeby
 * modyfikator `/opacity` działał, a klasy pełne wychodziły identycznie.
 */
const RGB_VARIABLES: Partial<Record<keyof ThemeColors, string>> = {
  bg: '--eter-bg-rgb',
  surface: '--eter-surface-rgb',
  raised: '--eter-raised-rgb',
  edge: '--eter-edge-rgb',
  ink: '--eter-ink-rgb',
  inkDim: '--eter-ink-dim-rgb',
  accent: '--eter-accent-rgb',
  accent2: '--eter-accent-2-rgb',
  danger: '--eter-danger-rgb',
  success: '--eter-success-rgb',
};

/**
 * Zamienia `#RRGGBB` (lub `#RGB`) na kanały „R G B" dla `rgb(... / alfa)`.
 * Zwraca `null`, gdy wartość nie jest hexem — wtedy zostaje poprzedni kanał,
 * a nie łamiemy koloru (input `type=color` i tak zawsze daje `#RRGGBB`).
 */
export function hexToRgbChannels(hex: string): string | null {
  const value = hex.trim().replace(/^#/, '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const int = parseInt(full, 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

/** Wpisuje motyw do dokumentu. Wywoływane przy starcie i przy każdej zmianie w panelu. */
export function applyTheme(theme: ThemeColors, target: HTMLElement = document.documentElement) {
  for (const [key, variable] of Object.entries(CSS_VARIABLES)) {
    target.style.setProperty(variable, theme[key as keyof ThemeColors]);
  }
  // Wariant kanałowy dla kolorów z Tailwinda — bez niego `bg-surface` i spółka
  // (teraz `rgb(var(--eter-surface-rgb) / …)`) nie miałyby z czego się złożyć.
  for (const [key, variable] of Object.entries(RGB_VARIABLES)) {
    const channels = hexToRgbChannels(theme[key as keyof ThemeColors]);
    if (channels) target.style.setProperty(variable, channels);
  }
}

/**
 * Jak `applyTheme`, ale ustępuje trybowi jasnemu.
 *
 * Motyw z bazy (podgląd panelu, zawartość gry) jest ciemny. Gdy gracz albo
 * redaktor wybrał tryb jasny, nie chcemy, żeby dojeżdżający motyw z bazy
 * przywrócił ciemne tła. W trybie jasnym pomijamy — rządzi jasny zestaw.
 */
export function applyThemeUnlessLight(
  theme: ThemeColors,
  target: HTMLElement = document.documentElement,
) {
  if (target.dataset.theme === 'light') return;
  applyTheme(theme, target);
}

export const THEME_GROUPS: Array<{
  title: string;
  fields: Array<{ key: keyof ThemeColors; label: string }>;
}> = [
  {
    title: 'Tła i krawędzie',
    fields: [
      { key: 'bg', label: 'Tło strony' },
      { key: 'surface', label: 'Panel' },
      { key: 'raised', label: 'Panel wyniesiony' },
      { key: 'edge', label: 'Krawędź' },
    ],
  },
  {
    title: 'Tekst',
    fields: [
      { key: 'ink', label: 'Tekst główny' },
      { key: 'inkDim', label: 'Tekst wtórny' },
    ],
  },
  {
    title: 'Akcenty',
    fields: [
      { key: 'accent', label: 'Akcent główny' },
      { key: 'accent2', label: 'Akcent wtórny' },
      { key: 'danger', label: 'Ostrzeżenie' },
      { key: 'success', label: 'Sukces' },
    ],
  },
  {
    title: 'Typy problemów',
    fields: [
      { key: 'typeAction', label: 'Działanie' },
      { key: 'typeThinking', label: 'Myślenie' },
      { key: 'typeCooperation', label: 'Współpraca' },
      { key: 'typeSelfchange', label: 'Zmiana w sobie' },
    ],
  },
  {
    title: 'Rodziny kart',
    fields: [
      { key: 'familyRed', label: 'Czerwona' },
      { key: 'familyBlue', label: 'Niebieska' },
      { key: 'familyYellow', label: 'Żółta' },
      { key: 'familyGreen', label: 'Zielona' },
    ],
  },
  {
    title: 'Kategorie kart',
    fields: [
      { key: 'catPsychological', label: 'Psychologiczne' },
      { key: 'catDigital', label: 'Cyfrowe' },
      { key: 'catSocial', label: 'Społeczne' },
      { key: 'catTalent', label: 'Talenty' },
      { key: 'catMentor', label: 'Mentorzy' },
      // Karty specjalne miały swoje zmienne w CSS, ale nie miały ich
      // w motywie — kolor był ustawiony na sztywno i panel go nie pokazywał,
      // więc jako jedyny w grze nie dawał się zmienić.
      { key: 'catEter11', label: 'ETER11' },
      { key: 'catBlackswan', label: 'Czarny Łabędź' },
    ],
  },
];
