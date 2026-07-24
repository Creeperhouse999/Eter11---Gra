import { useEffect, useRef, useState } from 'react';
import { TUTORIAL_STEPS, type TutorialGoal, type TutorialStep } from '../../data/tutorial';
import type { GameState } from '../../engine/types';

/** Co widać na ekranie — samouczek czyta to obok stanu gry. */
export interface TutorialContext {
  handRevealed: boolean;
  cardSelected: boolean;
  swapMode: boolean;
  /** Ile kart zaznaczono do wymiany — samouczek prowadzi przez ten wybór. */
  swapSelected: number;
  /**
   * Ścianka, do której pasuje wybrana karta — `problemId:slotKey`.
   * Podświetlamy ją zamiast całej planszy, żeby gracz wiedział, gdzie ciągnąć.
   */
  targetSlot: string | null;
  /**
   * Ile razy gracz potwierdził wymianę w tej misji.
   *
   * Zliczane przez MissionScreen, bo `swappedThisRound` gaśnie razem z rundą,
   * a wymiana kończy turę. Wcześniej dowodem była zmiana zawartości ręki, ale
   * przy jednym graczu każdy ruch kończy rundę i dobiera kartę — więc krok
   * „wymień karty" zaliczał się sam, bez wymiany.
   */
  swapCount: number;
}

/**
 * Cele, na których gracz kładzie kartę.
 *
 * Lista sterowała trzema rzeczami naraz — podświetleniem celu, źródłem
 * przeciągania i komunikatem o niepasującej karcie — i była przepisana
 * w każdym z tych miejsc osobno. Rozjazd byłby niewidoczny do pierwszego
 * zgłoszenia od gracza.
 */
const PLAY_GOALS: TutorialGoal[] = [
  'selectCard',
  'playFirst',
  'playSecond',
  'playThird',
  'playAfterSwap',
  'finish',
];

/**
 * Element podświetlany na danym kroku.
 *
 * Krok wymiany zmienia cel w trakcie: najpierw przycisk otwierający wymianę,
 * potem karty do zaznaczenia, na końcu przycisk potwierdzenia. Bez tego
 * podświetlenie zostawałoby na przycisku, który znika po włączeniu trybu.
 */
export function anchorFor(goal: TutorialGoal, context: TutorialContext): string | null {
  // Po wybraniu karty celujemy w konkretną ściankę, nie w całą planszę:
  // przy pięciu ściankach wokół karty „gdzieś tam" nie wystarcza.
  //
  // Dopóki gracz karty NIE wybrał, podświetlamy rękę — nawet jeśli
  // `targetSlot` jest już policzony. MissionScreen wylicza go skanując całą
  // rękę, więc bywa niepusty od pierwszej chwili; bez tego warunku samouczek
  // mówił „kliknij kartę", a świeciła ścianka na planszy.
  if (
    context.cardSelected &&
    context.targetSlot &&
    PLAY_GOALS.includes(goal)
  ) {
    return `[data-slot="${context.targetSlot}"]`;
  }

  // Kroki „połóż kartę" bez wyboru: wskazujemy rękę, z której ma ją wziąć.
  if (
    !context.cardSelected &&
    (goal === 'playFirst' || goal === 'playSecond' || goal === 'playThird')
  ) {
    return '[data-tour="playable-card"]';
  }

  if (goal === 'swapCards') {
    if (!context.swapMode) return '[data-tour="swap"]';
    // Zanim gracz cokolwiek zaznaczy, świecą karty do wyboru — sama ramka
    // wokół całej ręki nie pokazywała, w co kliknąć.
    return context.swapSelected > 0
      ? '[data-tour="swap-confirm"]'
      : '[data-tour="swap-card"]';
  }

  // Krok podsumowujący mówi o grze z innymi — nie ma czego pokazać na
  // ekranie, a po zakończonej misji plansza już nie istnieje. Bez tego
  // Spotlight szukał znikniętego elementu i nic się nie podświetlało.
  if (goal === 'outro') return null;

  const anchors: Record<Exclude<TutorialGoal, 'swapCards' | 'outro'>, string> = {
    intro: '[data-tour="problem"]',
    selectCard: '[data-tour="playable-card"]',
    playFirst: '[data-tour="problem"]',
    playSecond: '[data-tour="problem"]',
    playThird: '[data-tour="problem"]',
    playAfterSwap: '[data-tour="playable-card"]',
    finish: '[data-tour="problem"]',
    takeCard: '[data-tour="take-card"]',
  };
  return anchors[goal];
}

/**
 * Element, SKĄD gracz ma przeciągnąć kartę.
 *
 * Przy przeciąganiu podświetlenie samego celu nie wystarcza: gracz widzi,
 * dokąd, ale nie widzi czym. Zwracamy rękę tylko wtedy, gdy karta jest już
 * wybrana — wcześniej to ona jest celem, a druga ramka byłaby szumem.
 */
export function sourceFor(goal: TutorialGoal, context: TutorialContext): string | null {
  if (!context.cardSelected || !context.targetSlot) return null;

  // `selectCard` odpada: na tym kroku przeciąganie jest zablokowane
  // (`allow: []`), więc wskazywanie źródła ruchu byłoby szumem.
  const dragging = PLAY_GOALS.includes(goal) && goal !== 'selectCard';

  return dragging ? '[data-tour="selected-card"]' : null;
}

/**
 * Czy krok został wykonany.
 *
 * Warunki czytane są ze stanu gry, nie z kliknięć — samouczek nie da się
 * oszukać ani zablokować, gdy gracz zrobi coś we własnej kolejności.
 */
export function isGoalMet(
  goal: TutorialGoal,
  state: GameState,
  context: TutorialContext,
): boolean {
  const played = state.mission?.played.length ?? 0;
  const swapped = state.mission?.swappedThisRound.length ?? 0;

  switch (goal) {
    // Krok czytany, bez zadania — zaliczony od razu.
    case 'intro':
      return true;
    case 'selectCard':
      // Sama karta nie wystarcza: pochwała mówi „ścianka zaświeciła", więc
      // musi istnieć ścianka, która ją przyjmie. Bez tego ETER11 chwalił
      // wybór karty pasującej donikąd.
      return (context.cardSelected && context.targetSlot !== null) || played > 0;
    case 'playFirst':
      return played >= 1;
    case 'playSecond':
      return played >= 2;
    case 'playThird':
      return played >= 3;
    case 'swapCards':
      // Wyłącznie faktyczna wymiana. `swappedThisRound` gaśnie z nową rundą,
      // dlatego obok niej liczymy potwierdzone wymiany. Zagranie karty tego
      // kroku NIE zalicza — krok ma nauczyć wymiany, a nie dać się ominąć.
      return swapped > 0 || context.swapCount > 0;
    case 'playAfterSwap':
      // Czwarta karta: trzy czerwone plus jedna zagrana po wymianie.
      return played >= 4;
    case 'finish':
      // Tylko wygrana: `phase === 'missionSummary'` obejmuje też porażkę,
      // a pochwała mówi „problem rozwiązany".
      return state.mission?.phase === 'won';
    case 'takeCard':
      return (state.mission?.takenToMat.length ?? 0) > 0;
    // Krok czytany — bez zadania, jak `intro`.
    case 'outro':
      return true;
  }
}

/**
 * Gracz wybrał kartę, która nie pasuje do żadnej wolnej ścianki.
 * Bez tego komunikatu samouczek stałby w miejscu bez wyjaśnienia dlaczego.
 */
function wrongCardMessage(goal: TutorialGoal, context: TutorialContext): string | null {
  const picking = PLAY_GOALS.includes(goal);

  if (!picking || !context.cardSelected || context.targetSlot !== null) return null;

  return 'Ta karta nie pasuje do żadnej wolnej ścianki — jej kolor nie zgadza się z żadnym. Wybierz inną.';
}

/**
 * Wymiana ma trzy etapy i na każdym trzeba powiedzieć co innego.
 * Zwraca null, gdy krok nie dotyczy wymiany — wtedy używamy tekstu z kroku.
 */
function swapStageMessage(goal: TutorialGoal, context: TutorialContext): string | null {
  if (goal !== 'swapCards' || !context.swapMode) return null;

  if (context.swapSelected === 0) {
    return 'Teraz kliknij karty, których nie chcesz. Możesz zaznaczyć jedną albo wszystkie.';
  }

  return `Zaznaczone: ${context.swapSelected}. Naciśnij „Wymień ${context.swapSelected}", żeby dostać tyle samo nowych kart.`;
}

const STORAGE_KEY = 'eter11:tutorial-done';

/** Czy gracz przeszedł już samouczek — pamiętane między wizytami. */
export function hasSeenTutorial(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Tryb prywatny blokuje odczyt. Samouczek po prostu pokaże się znowu.
    return false;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Bez zapisu też da się grać.
  }
}

export interface TutorialControl {
  active: true;
  step: TutorialStep;
  stepNumber: number;
  total: number;
  done: boolean;
  message: string;
  anchor: string | null;
  /** Drugi podświetlony element — źródło ruchu. */
  source: string | null;
  /** Czy dany ruch jest teraz dozwolony. Poza scenariuszem wszystko blokujemy. */
  allows: (action: 'play' | 'swap' | 'pass') => boolean;
  next: () => void;
  /** Powrót do poprzedniego wyjaśnienia. Null na pierwszym kroku. */
  back: (() => void) | null;
  skip: () => void;
}

export function useTutorial(
  active: boolean,
  state: GameState,
  context: TutorialContext,
  onFinish: () => void,
  /**
   * Kroki z panelu redakcyjnego. Brak albo pusta lista = wersja wbudowana.
   *
   * Pusta lista jest równie ważna co brak pola: redaktor mógł skasować
   * wszystkie kroki, a samouczek bez kroków wysypałby się na pierwszym
   * odczycie `step.say`.
   */
  steps?: TutorialStep[],
): TutorialControl | { active: false } {
  const script = steps?.length ? steps : TUTORIAL_STEPS;
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [stuck, setStuck] = useState(false);

  const step = script[index];

  // Raz oznaczony jako zrobiony, zostaje zrobiony — inaczej cofnięcie stanu
  // (np. odznaczenie karty) odbierałoby pochwałę.
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active || !step || doneRef.current) return;
    if (isGoalMet(step.goal, state, context)) {
      doneRef.current = true;
      setDone(true);
      setStuck(false);
    }
  }, [active, step, state, context]);

  useEffect(() => {
    if (!active || done || !step?.nudge) return;
    const timer = window.setTimeout(() => setStuck(true), 9000);
    return () => window.clearTimeout(timer);
  }, [active, done, step]);

  if (!active || !step) return { active: false };

  const next = () => {
    if (index + 1 >= script.length) {
      markSeen();
      onFinish();
      return;
    }
    doneRef.current = false;
    setDone(false);
    setStuck(false);
    setIndex((current) => current + 1);
  };

  // Cofnięcie działa tylko na krokach czytanych — przy zadaniach karta jest
  // już zagrana i nie da się jej wziąć z powrotem.
  const canGoBack = index > 0 && script[index - 1].readOnly === true;

  const back = () => {
    doneRef.current = false;
    setDone(false);
    setStuck(false);
    setIndex((current) => Math.max(0, current - 1));
  };

  const skip = () => {
    markSeen();
    onFinish();
  };

  return {
    active: true,
    step,
    stepNumber: index + 1,
    total: script.length,
    done,
    // Krok czytany nie ma czego chwalić — gracz jeszcze nic nie zrobił,
    // więc pokazujemy treść wyjaśnienia aż do naciśnięcia „Dalej".
    message:
      done && !step.readOnly
        ? step.praise
        : wrongCardMessage(step.goal, context) ??
          swapStageMessage(step.goal, context) ??
          (stuck && step.nudge ? step.nudge : step.say),
    // Podświetlenie zostaje także przy pochwale: ETER11 mówi „ścianka
    // zaświeciła", więc musi być co pokazać, gdy to mówi.
    anchor: anchorFor(step.goal, context),
    source: sourceFor(step.goal, context),
    // Po wykonaniu ZADANIA nie blokujemy niczego — gracz czeka na „Dalej".
    // Ale krok czytany (readOnly) jest „zaliczony" od startu, więc `done`
    // nie może tu znosić blokady: inaczej `allow: []` na wstępie nic nie
    // daje i dziecko mogłoby w trakcie samej narracji zagrać/spasować,
    // dobierając kartę i psując ułożoną talię samouczka.
    allows: (action) => (done && !step.readOnly) || step.allow.includes(action),
    next,
    back: canGoBack ? back : null,
    skip,
  };
}
