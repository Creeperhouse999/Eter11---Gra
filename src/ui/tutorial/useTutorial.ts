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
}

/**
 * Element podświetlany na danym kroku.
 *
 * Krok wymiany zmienia cel w trakcie: najpierw przycisk otwierający wymianę,
 * potem karty do zaznaczenia, na końcu przycisk potwierdzenia. Bez tego
 * podświetlenie zostawałoby na przycisku, który znika po włączeniu trybu.
 */
function anchorFor(goal: TutorialGoal, context: TutorialContext): string | null {
  // Po wybraniu karty uwaga przenosi się na ścianki — to o nich mówi
  // pochwała i to tam gracz ma za chwilę kliknąć.
  if (goal === 'selectCard' && context.cardSelected) return '[data-tour="problem"]';

  if (goal === 'swapCards') {
    if (!context.swapMode) return '[data-tour="swap"]';
    return context.swapSelected > 0 ? '[data-tour="swap-confirm"]' : '[data-tour="hand"]';
  }

  const anchors: Record<Exclude<TutorialGoal, 'swapCards'>, string> = {
    selectCard: '[data-tour="hand"]',
    playFirst: '[data-tour="problem"]',
    playSecond: '[data-tour="problem"]',
    playAfterSwap: '[data-tour="hand"]',
    finish: '[data-tour="problem"]',
    takeCard: '[data-tour="take-card"]',
  };
  return anchors[goal];
}

/**
 * Czy krok został wykonany.
 *
 * Warunki czytane są ze stanu gry, nie z kliknięć — samouczek nie da się
 * oszukać ani zablokować, gdy gracz zrobi coś we własnej kolejności.
 */
function isGoalMet(
  goal: TutorialGoal,
  state: GameState,
  context: TutorialContext,
): boolean {
  const played = state.mission?.played.length ?? 0;
  const swapped = state.mission?.swappedThisRound.length ?? 0;

  switch (goal) {
    case 'selectCard':
      return context.cardSelected || played > 0;
    case 'playFirst':
      return played >= 1;
    case 'playSecond':
      return played >= 2;
    case 'swapCards':
      // Wymiana czyści się na nowej rundzie, więc liczy się też to,
      // że gracz zdążył już zagrać kartę po wymianie.
      return swapped > 0 || played >= 3;
    case 'playAfterSwap':
      return played >= 3;
    case 'finish':
      return state.mission?.phase === 'won' || state.phase === 'missionSummary';
    case 'takeCard':
      return (state.mission?.takenToMat.length ?? 0) > 0;
  }
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
  /** Czy dany ruch jest teraz dozwolony. Poza scenariuszem wszystko blokujemy. */
  allows: (action: 'play' | 'swap' | 'pass') => boolean;
  next: () => void;
  skip: () => void;
}

export function useTutorial(
  active: boolean,
  state: GameState,
  context: TutorialContext,
  onFinish: () => void,
): TutorialControl | { active: false } {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [stuck, setStuck] = useState(false);

  const step = TUTORIAL_STEPS[index];

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
    if (index + 1 >= TUTORIAL_STEPS.length) {
      markSeen();
      onFinish();
      return;
    }
    doneRef.current = false;
    setDone(false);
    setStuck(false);
    setIndex((current) => current + 1);
  };

  const skip = () => {
    markSeen();
    onFinish();
  };

  return {
    active: true,
    step,
    stepNumber: index + 1,
    total: TUTORIAL_STEPS.length,
    done,
    message: done
      ? step.praise
      : swapStageMessage(step.goal, context) ??
        (stuck && step.nudge ? step.nudge : step.say),
    // Podświetlenie zostaje także przy pochwale: ETER11 mówi „ścianka
    // zaświeciła", więc musi być co pokazać, gdy to mówi.
    anchor: anchorFor(step.goal, context),
    // Po wykonaniu kroku nie blokujemy niczego — gracz czeka na „Dalej".
    allows: (action) => done || step.allow.includes(action),
    next,
    skip,
  };
}
