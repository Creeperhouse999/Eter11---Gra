import type { Problem } from '../engine/types';

/**
 * Samouczek prowadzony przez ETER11.
 *
 * Kroki opisują, co gracz ma zrobić, i jak ETER11 to skomentuje. Warunek
 * przejścia dalej sprawdzany jest na stanie gry, nie na kliknięciach — dzięki
 * temu samouczek nie da się oszukać ani zablokować, gdy gracz zrobi coś
 * w innej kolejności.
 */
export type TutorialGoal =
  | 'revealHand'
  | 'selectCard'
  | 'playAnyCard'
  | 'playSecondCard'
  | 'swapCards'
  | 'finishMission';

export interface TutorialStep {
  id: string;
  goal: TutorialGoal;
  /** Co ETER11 mówi, zanim gracz wykona krok. */
  say: string;
  /** Pochwała po wykonaniu. */
  praise: string;
  /** Podpowiedź, gdy gracz utknie — pokazywana po chwili bezruchu. */
  nudge?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'reveal',
    goal: 'revealHand',
    say: 'Cześć! Jestem ETER11. Nauczę Cię grać w kilka minut. Zacznijmy od Twoich kart — naciśnij „Pokaż moje karty".',
    praise: 'Świetnie. To Twoja ręka: pięć kart, którymi możesz zagrać.',
    nudge: 'Przycisk jest po prawej stronie, nad kartami.',
  },
  {
    id: 'problem',
    goal: 'selectCard',
    say: 'Na środku stołu leży problem. Wokół niego jest pięć ścianek — każda czeka na kartę w konkretnym kolorze. Kliknij dowolną swoją kartę, a pokażę Ci, gdzie pasuje.',
    praise: 'Widzisz? Ścianki, do których ta karta pasuje, świecą.',
    nudge: 'Kliknij którąkolwiek kartę na dole ekranu.',
  },
  {
    id: 'play',
    goal: 'playAnyCard',
    say: 'Teraz najważniejsze: przeciągnij tę kartę na podświetloną ściankę. Możesz też po prostu kliknąć ściankę.',
    praise: 'Brawo! Ścianka zamknięta. Tak właśnie rozwiązuje się problemy — po kawałku.',
    nudge: 'Chwyć kartę i przeciągnij ją na świecącą ściankę.',
  },
  {
    id: 'colors',
    goal: 'playSecondCard',
    say: 'Kolor karty musi zgadzać się z kolorem ścianki. Kolejna tura — połóż następną kartę tam, gdzie pasuje.',
    praise: 'Dokładnie tak. Kolor do koloru.',
    nudge: 'Szukaj karty w tym samym kolorze co któraś z pustych ścianek.',
  },
  {
    id: 'swap',
    goal: 'swapCards',
    say: 'A co, jeśli nic Ci nie pasuje? Możesz wymienić karty. Naciśnij „Wymieniam karty", zaznacz te, których nie chcesz, i potwierdź.',
    praise: 'Właśnie tak. Wymiana kosztuje Twój ruch w tej rundzie, ale czasem warto.',
    nudge: 'Przycisk „Wymieniam karty" jest obok „Pasuję".',
  },
  {
    id: 'finish',
    goal: 'finishMission',
    say: 'Zostało zamknąć resztę ścianek. Gracie razem — każdy dokłada, co ma. Dokończcie ten problem.',
    praise: 'Problem rozwiązany! Umiesz już wszystko, czego trzeba. Powodzenia w prawdziwej misji.',
  },
];

/**
 * Problem na samouczek.
 *
 * Wszystkie ścianki wymagają rodziny czerwonej, więc gracz nie natrafi
 * na sytuację bez wyjścia, zanim pozna zasadę dopasowania kolorów.
 */
export const TUTORIAL_PROBLEM: Problem = {
  id: 'tutorial-1',
  name: 'Pierwsza misja',
  icon: 'spark',
  type: 'cooperation',
  story:
    'To ćwiczenie. Nikomu nic nie grozi — możesz spokojnie sprawdzić, jak działa gra.',
  antagonist: 'Nikt. To tylko trening.',
  consequence: 'Nic. Spróbujesz jeszcze raz.',
  goal: 'Poznać zasady gry.',
  slots: [
    { key: 'mentor', family: 'red', hint: 'Ktoś, kto weźmie odpowiedzialność', bonusCardIds: [] },
    { key: 'talent', family: 'red', hint: 'Odwaga albo wytrwałość', bonusCardIds: [] },
    { key: 'psychological', family: 'red', hint: 'Siła, żeby się nie poddać', bonusCardIds: [] },
    { key: 'social', family: 'red', hint: 'Ktoś, kto stanie w obronie', bonusCardIds: [] },
    { key: 'digital', family: 'red', hint: 'Ktoś, kto zadba o bezpieczeństwo', bonusCardIds: [] },
  ],
};
