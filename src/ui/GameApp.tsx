import { useEffect, useState } from 'react';
import { ALL_CHARACTERS } from '../data/characters';
import { DEFAULT_UI_TEXT, type UiText } from '../data/uiText';
import type { Card, Character, Problem, RulesConfig } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/reducer';
import { FinaleScreen } from './screens/FinaleScreen';
import { MissionScreen } from './screens/MissionScreen';
import { IntroScreen } from './screens/IntroScreen';
import { SetupScreen } from './screens/SetupScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import {
  TUTORIAL_DECK,
  TUTORIAL_HAND,
  TUTORIAL_PLAYER,
  TUTORIAL_PROBLEM,
} from '../data/tutorial';
import { TutorialDone } from './tutorial/TutorialDone';
import { TutorialLayer } from './tutorial/TutorialLayer';
import { useTutorial, type TutorialContext } from './tutorial/useTutorial';
import { useGame, type PlayerSetup } from './useGame';

export interface GameAppContent {
  cards?: Card[];
  problems?: Problem[];
  characters?: Character[];
  rules?: RulesConfig;
  text?: UiText;
}

interface GameAppProps {
  content?: GameAppContent;
  /** Komunikat o trybie offline — wyświetlany nad grą. */
  notice?: string | null;
}

/** Rozgrywka w toku. Wydzielona, bo useGame potrzebuje graczy przy montowaniu. */
function RunningGame({
  players,
  seed,
  content,
  tutorial,
  onRestart,
}: {
  players: PlayerSetup[];
  seed: number;
  content: GameAppContent;
  tutorial: boolean;
  onRestart: () => void;
}) {
  const text = content.text ?? DEFAULT_UI_TEXT;
  // Samouczek gra na własnym scenariuszu: jeden gracz, ustawiona ręka
  // i talia, więc przebieg jest identyczny za każdym razem.
  const game = useGame(
    tutorial ? [TUTORIAL_PLAYER] : players,
    seed,
    content.rules ?? DEFAULT_CONFIG,
    tutorial
      ? {
          problems: [TUTORIAL_PROBLEM],
          fixedHand: TUTORIAL_HAND,
          orderedDeck: TUTORIAL_DECK,
        }
      : { cards: content.cards, problems: content.problems },
  );
  const { state, dispatch } = game;

  // Samouczek nie ma po co pytać „czy zaczynamy" — startuje od razu.
  useEffect(() => {
    if (tutorial && state.phase === 'setup' && state.missionNumber === 0) {
      dispatch({ type: 'START_MISSION' });
    }
  }, [tutorial, state.phase, state.missionNumber, dispatch]);

  /**
   * Samouczek dobiegł końca. Osobny stan, bo flaga `tutorial` gaśnie
   * w momencie kliknięcia „Zaczynamy grę" — warunek oparty na niej nigdy
   * by nie zadziałał.
   */
  const [tutorialDone, setTutorialDone] = useState(false);

  const [tourContext, setTourContext] = useState<TutorialContext>({
    handRevealed: false,
    cardSelected: false,
    swapMode: false,
    swapSelected: 0,
    targetSlot: null,
    swapCount: 0,
  });

  const tour = useTutorial(tutorial, state, tourContext, () => setTutorialDone(true));

  if (state.phase === 'finale') {
    return (
      <FinaleScreen
        game={game}
        text={text}
        characters={content.characters ?? ALL_CHARACTERS}
        onRestart={onRestart}
      />
    );
  }

  if (tutorialDone) {
    return <TutorialDone onBack={onRestart} />;
  }

  if (state.phase === 'missionSummary') {
    return (
      <>
        <SummaryScreen game={game} text={text} />
        <TutorialLayer tutorial={tour} />
      </>
    );
  }
  if (state.phase === 'mission') {
    return (
      <>
        <MissionScreen
          game={game}
          text={text}
          characters={content.characters ?? ALL_CHARACTERS}
          onContext={setTourContext}
          allows={tour.active ? tour.allows : undefined}
          alwaysRevealed={tutorial}
        />
        <TutorialLayer tutorial={tour} />
      </>
    );
  }

  const first = state.missionNumber === 0;

  return (
    <main className="relative mx-auto max-w-2xl px-4 py-16 text-center">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />
      <div className="relative">
        <span className="eter-label">
          {first ? 'Start' : `Misja ${state.missionNumber + 1}`}
        </span>
        <h1 className="font-display text-3xl font-bold text-accent">
          {first ? text.missionFirstHeading : text.missionNextHeading}
        </h1>
        <p className="mt-3 font-mono text-sm text-ink-dim">
          Rozwiązane: {state.solvedProblems.length} · W talii: {state.problemPile.length}
          {state.unsolvedProblems.length > 0 &&
            ` · Odłożone: ${state.unsolvedProblems.length}`}
        </p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'START_MISSION' })}
          disabled={state.problemPile.length === 0}
          className="mt-8 rounded-lg bg-accent px-8 py-4 font-display text-lg font-bold text-bg disabled:opacity-40"
        >
          {text.missionRevealButton}
        </button>
        {state.problemPile.length === 0 && (
          <p className="mt-3 text-sm text-ink-dim">
            Talia problemów jest pusta. Odłożone problemy wracają po dwóch misjach.
          </p>
        )}
      </div>
    </main>
  );
}

/** Klucz w localStorage: wstęp pokazujemy raz, nie przy każdym wejściu. */
const INTRO_SEEN_KEY = 'eter11:intro-seen';

export function GameApp({ content = {}, notice }: GameAppProps) {
  const [session, setSession] = useState<{
    players: PlayerSetup[];
    seed: number;
    tutorial: boolean;
  } | null>(null);

  /**
   * Wstęp widzi tylko ten, kto go jeszcze nie oglądał.
   *
   * Czytane raz przy starcie: gracz wracający do gry chce grać, a nie
   * przeklikiwać historię, którą już zna. Z menu można go otworzyć
   * ponownie.
   */
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return localStorage.getItem(INTRO_SEEN_KEY) === null;
    } catch {
      // Tryb prywatny bez localStorage — wstęp po prostu się pokaże.
      return true;
    }
  });

  const closeIntro = () => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // Brak zapisu nic nie psuje: wstęp pojawi się następnym razem.
    }
    setShowIntro(false);
  };

  return (
    <>
      {notice && (
        <p className="bg-raised px-4 py-1.5 text-center font-mono text-xs text-ink-dim">
          {notice}
        </p>
      )}
      {showIntro ? (
        <IntroScreen onDone={closeIntro} onSkip={closeIntro} />
      ) : session ? (
        <RunningGame
          key={session.seed}
          players={session.players}
          seed={session.seed}
          content={content}
          tutorial={session.tutorial}
          onRestart={() => setSession(null)}
        />
      ) : (
        <SetupScreen
          text={content.text ?? DEFAULT_UI_TEXT}
          characters={content.characters ?? ALL_CHARACTERS}
          // Ziarno z zegara — każda rozgrywka tasuje talię inaczej.
          onStart={(players, tutorial) =>
            setSession({ players, seed: Date.now(), tutorial })
          }
          onShowIntro={() => setShowIntro(true)}
        />
      )}
    </>
  );
}
