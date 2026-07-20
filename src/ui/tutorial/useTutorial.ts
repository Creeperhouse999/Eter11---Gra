import { useEffect, useRef, useState } from 'react';
import { TUTORIAL_STEPS, type TutorialGoal } from '../../data/tutorial';
import type { GameState } from '../../engine/types';

/** Co dzieje się na ekranie — samouczek czyta to obok stanu gry. */
export interface TutorialContext {
  handRevealed: boolean;
  cardSelected: boolean;
  swapMode: boolean;
}

/** Element podświetlany na danym kroku. */
const ANCHORS: Record<TutorialGoal, string | null> = {
  revealHand: '[data-tour="reveal"]',
  selectCard: '[data-tour="hand"]',
  playAnyCard: '[data-tour="problem"]',
  playSecondCard: '[data-tour="problem"]',
  swapCards: '[data-tour="swap"]',
  finishMission: '[data-tour="problem"]',
};

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

  switch (goal) {
    case 'revealHand':
      return context.handRevealed;
    case 'selectCard':
      return context.cardSelected || played > 0;
    case 'playAnyCard':
      return played >= 1;
    case 'playSecondCard':
      return played >= 2;
    case 'swapCards':
      return (state.mission?.swappedThisRound.length ?? 0) > 0;
    case 'finishMission':
      return state.mission?.phase === 'won' || state.phase === 'missionSummary';
  }
}

const STORAGE_KEY = 'eter11:tutorial-done';

/** Czy gracz przeszedł już samouczek — pamiętane między wizytami. */
export function hasSeenTutorial(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Tryb prywatny blokuje zapis. Samouczek po prostu pokaże się znowu.
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

export function useTutorial(
  active: boolean,
  state: GameState,
  context: TutorialContext,
  onFinish: () => void,
) {
  const [index, setIndex] = useState(0);
  /** Krok wykonany — bąbel chwali i czeka na „Dalej". */
  const [done, setDone] = useState(false);
  /** Gracz utknął — po chwili bezruchu dochodzi podpowiedź. */
  const [stuck, setStuck] = useState(false);

  const step = TUTORIAL_STEPS[index];

  // Wykrycie wykonania kroku. Raz oznaczony jako zrobiony, zostaje zrobiony —
  // inaczej cofnięcie stanu (np. odznaczenie karty) odbierałoby pochwałę.
  const doneRef = useRef(false);
  useEffect(() => {
    if (!active || !step || doneRef.current) return;
    if (isGoalMet(step.goal, state, context)) {
      doneRef.current = true;
      setDone(true);
      setStuck(false);
    }
  }, [active, step, state, context]);

  // Podpowiedź po dziesięciu sekundach bez postępu.
  useEffect(() => {
    if (!active || done || !step?.nudge) return;
    const timer = window.setTimeout(() => setStuck(true), 10000);
    return () => window.clearTimeout(timer);
  }, [active, done, step]);

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

  if (!active || !step) {
    return { active: false as const };
  }

  return {
    active: true as const,
    step,
    stepNumber: index + 1,
    total: TUTORIAL_STEPS.length,
    done,
    // Po wykonaniu ETER11 chwali; przy zacięciu podrzuca wskazówkę.
    message: done ? step.praise : stuck && step.nudge ? step.nudge : step.say,
    anchor: done ? null : ANCHORS[step.goal],
    next,
    skip,
  };
}
