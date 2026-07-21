import { ALL_CARDS } from './cards';
import { DEFAULT_INTRO } from './intro';
import { TUTORIAL_STEPS } from './tutorial';
import { ALL_CHARACTERS } from './characters';
import { DEFAULT_FAMILIES } from './families';
import { ALL_PROBLEMS } from './problems';
import { DEFAULT_THEME } from './theme';
import { DEFAULT_UI_TEXT } from './uiText';
import { DEFAULT_CONFIG } from '../engine/reducer';
import type { GameContent } from '../firebase/validate';

/**
 * Komplet zawartości gry zaszyty w kodzie.
 *
 * Mieszka tutaj, a nie obok kodu Firestore, celowo: to czyste dane, a plik
 * `firebase/content.ts` ciągnie za sobą cały pakiet Firestore (464 KB —
 * więcej niż React i cała reszta gry razem). Trzymanie tych danych tam
 * oznaczało, że przeglądarka musiała pobrać i wykonać Firestore, zanim
 * pokazała pierwszą kartę — mimo że gra przy stole działa bez sieci.
 */
export const BUILTIN_CONTENT: GameContent = {
  cards: ALL_CARDS,
  problems: ALL_PROBLEMS,
  characters: ALL_CHARACTERS,
  rules: DEFAULT_CONFIG,
  text: DEFAULT_UI_TEXT,
  theme: DEFAULT_THEME,
  families: DEFAULT_FAMILIES,
  intro: DEFAULT_INTRO,
  tutorial: TUTORIAL_STEPS,
};
