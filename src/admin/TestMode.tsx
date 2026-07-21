import { useState } from 'react';
import { applyBlackSwan } from '../engine/reducer';
import type { BlackSwanKind } from '../engine/types';
import type { GameContent } from '../firebase/validate';
import { FinaleScreen } from '../ui/screens/FinaleScreen';
import { MissionScreen } from '../ui/screens/MissionScreen';
import { SummaryScreen } from '../ui/screens/SummaryScreen';
import { useGame } from '../ui/useGame';
import { Icon } from '../ui/icons/Icon';

interface TestModeProps {
  content: GameContent;
}

const SWAN_LABELS: Array<[BlackSwanKind, string]> = [
  ['extraProblem', 'Dodatkowy problem'],
  ['doubleRequirements', 'Podwojone wymagania'],
  ['swapHands', 'Wymiana rąk'],
];

/**
 * Tryb testowy do balansowania gry.
 *
 * Pozwala rozegrać partię na aktualnie edytowanych kartach, z podglądem stanu,
 * cofaniem ruchów i ręcznym wywołaniem Czarnego Łabędzia — bez czekania,
 * aż karta wypadnie z talii.
 *
 * Ziarno trzymane jest tutaj, a partia niżej: `useGame` czyta ziarno wyłącznie
 * przy montowaniu, więc samo zwiększenie licznika nie rozdawało kart od nowa
 * i „Nowa partia" w kółko powtarzała to samo rozdanie. `key` przemontowuje
 * partię, zostawiając ustawienia na miejscu.
 */
export function TestMode({ content }: TestModeProps) {
  const [seed, setSeed] = useState(1);

  return <TestGame key={seed} content={content} seed={seed} onReseed={setSeed} />;
}

function TestGame({
  content,
  seed,
  onReseed,
}: TestModeProps & { seed: number; onReseed: (update: (n: number) => number) => void }) {
  const [showState, setShowState] = useState(false);

  const players = content.characters.slice(0, 3).map((character, index) => ({
    id: `test-${index + 1}`,
    name: `Tester ${index + 1}`,
    characterId: character.id,
  }));

  const game = useGame(players, seed, content.rules, {
    cards: content.cards,
    problems: content.problems,
  });
  const { state, dispatch, undo, history, overrideState } = game;

  const triggerSwan = (kind: BlackSwanKind) => {
    // Czarny Łabędź omija reducer — to narzędzie testowe, nie ruch gracza.
    overrideState(applyBlackSwan(state, kind));
  };

  return (
    <div>
      <section className="rounded-xl border border-accent-2 bg-surface p-4">
        <h2 className="font-display font-bold text-accent-2">Tryb testowy</h2>
        <p className="mt-1 text-xs text-ink-dim">
          Rozgrywka na trzech testerów, na kartach z tego panelu. Niezapisane zmiany
          też tu działają — nowa partia startuje po kliknięciu „Nowa partia”.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm">
            <span className="text-ink-dim">Ziarno</span>
            <input
              type="number"
              min={1}
              value={seed}
              // Puste pole dawało NaN, a ono po cichu przestawiało partię
              // w trakcie wpisywania nowej liczby.
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value) && value >= 1) onReseed(() => value);
              }}
              className="ml-2 w-24 rounded border border-edge bg-bg px-2 py-1 font-mono text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => onReseed((s) => s + 1)}
            className="rounded border border-edge px-3 py-1 text-sm"
          >
            Nowa partia
          </button>
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 rounded border border-edge px-3 py-1 text-sm disabled:opacity-40"
          >
            <Icon name="undo" size={14} />
            Cofnij ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setShowState((v) => !v)}
            className="rounded border border-edge px-3 py-1 text-sm"
          >
            {showState ? 'Ukryj stan' : 'Pokaż stan'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="eter-label">Czarny Łabędź</span>
          {SWAN_LABELS.map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() => triggerSwan(kind)}
              disabled={state.phase !== 'mission'}
              className="rounded border border-accent-2 px-2 py-1 text-xs text-accent-2 disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>

        {showState && (
          <pre className="mt-3 max-h-64 overflow-auto rounded bg-bg p-3 font-mono text-[10px] leading-relaxed text-ink-dim">
            {JSON.stringify(
              {
                faza: state.phase,
                misja: state.mission && {
                  runda: state.mission.round,
                  problemy: state.mission.problems.map((p) => p.name),
                  wylozone: state.mission.played.length,
                  labedzie: state.mission.activeBlackSwans,
                },
                talia: state.drawPile.length,
                odrzucone: state.discardPile.length,
                gracze: state.players.map((p) => ({
                  imie: p.name,
                  reka: p.hand.length,
                  postac: p.mat.map((c) => c.name),
                  doswiadczenie: p.experience.length,
                })),
              },
              null,
              2,
            )}
          </pre>
        )}
      </section>

      <div className="mt-4">
        {state.phase === 'setup' && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'START_MISSION' })}
            disabled={state.problemPile.length === 0}
            className="rounded-lg bg-accent px-6 py-3 font-display font-bold text-bg disabled:opacity-40"
          >
            Odkryj problem
          </button>
        )}
        {state.phase === 'mission' && <MissionScreen game={game} />}
        {state.phase === 'missionSummary' && <SummaryScreen game={game} />}
        {state.phase === 'finale' && (
          <FinaleScreen game={game} onRestart={() => onReseed((s) => s + 1)} />
        )}
      </div>
    </div>
  );
}
