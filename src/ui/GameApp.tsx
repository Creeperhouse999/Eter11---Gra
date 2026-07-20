import { useState } from 'react';
import { ALL_CHARACTERS } from '../data/characters';
import { DEFAULT_UI_TEXT, type UiText } from '../data/uiText';
import type { Card, Character, Problem, RulesConfig } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/reducer';
import { FinaleScreen } from './screens/FinaleScreen';
import { MissionScreen } from './screens/MissionScreen';
import { SetupScreen } from './screens/SetupScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { TUTORIAL_PROBLEM } from '../data/tutorial';
import { TutorialLayer } from './tutorial/TutorialLayer';
import type { TutorialContext } from './tutorial/useTutorial';
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
  onTutorialFinish,
}: {
  players: PlayerSetup[];
  seed: number;
  content: GameAppContent;
  tutorial: boolean;
  onRestart: () => void;
  onTutorialFinish: () => void;
}) {
  const text = content.text ?? DEFAULT_UI_TEXT;
  const game = useGame(players, seed, content.rules ?? DEFAULT_CONFIG, {
    cards: content.cards,
    // Samouczek gra na własnym problemie: wszystkie ścianki w jednym kolorze,
    // więc początkujący nie utknie, zanim pozna zasadę dopasowania.
    problems: tutorial ? [TUTORIAL_PROBLEM] : content.problems,
  });
  const { state, dispatch } = game;
  const [tourContext, setTourContext] = useState<TutorialContext>({
    handRevealed: false,
    cardSelected: false,
    swapMode: false,
  });

  if (state.phase === 'finale') {
    return <FinaleScreen game={game} text={text} onRestart={onRestart} />;
  }
  if (state.phase === 'missionSummary') return <SummaryScreen game={game} text={text} />;
  if (state.phase === 'mission') {
    return (
      <>
        <MissionScreen
          game={game}
          text={text}
          characters={content.characters ?? ALL_CHARACTERS}
          onContext={setTourContext}
        />
        <TutorialLayer
          active={tutorial}
          state={state}
          context={tourContext}
          onFinish={onTutorialFinish}
        />
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

export function GameApp({ content = {}, notice }: GameAppProps) {
  const [session, setSession] = useState<{
    players: PlayerSetup[];
    seed: number;
    tutorial: boolean;
  } | null>(null);

  return (
    <>
      {notice && (
        <p className="bg-raised px-4 py-1.5 text-center font-mono text-xs text-ink-dim">
          {notice}
        </p>
      )}
      {session ? (
        <RunningGame
          key={session.seed}
          players={session.players}
          seed={session.seed}
          content={content}
          tutorial={session.tutorial}
          onRestart={() => setSession(null)}
          onTutorialFinish={() =>
            setSession((current) => (current ? { ...current, tutorial: false } : null))
          }
        />
      ) : (
        <SetupScreen
          text={content.text ?? DEFAULT_UI_TEXT}
          characters={content.characters ?? ALL_CHARACTERS}
          // Ziarno z zegara — każda rozgrywka tasuje talię inaczej.
          onStart={(players, tutorial) =>
            setSession({ players, seed: Date.now(), tutorial })
          }
        />
      )}
    </>
  );
}
