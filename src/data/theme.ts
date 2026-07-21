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

/** Wpisuje motyw do dokumentu. Wywoływane przy starcie i przy każdej zmianie w panelu. */
export function applyTheme(theme: ThemeColors, target: HTMLElement = document.documentElement) {
  for (const [key, variable] of Object.entries(CSS_VARIABLES)) {
    target.style.setProperty(variable, theme[key as keyof ThemeColors]);
  }
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
