import { useEffect, useState } from 'react';
import { DEFAULT_UI_TEXT, type UiText } from '../../data/uiText';
import { cardFitsSlot } from '../../engine/rules';
import type { Card, SlotKey } from '../../engine/types';
import { CardView } from '../components/CardView';
import { ProblemBoard } from '../components/ProblemBoard';
import { RoundFuel } from '../components/RoundFuel';
import type { Game } from '../useGame';

interface MissionScreenProps {
  game: Game;
  text?: UiText;
}

/**
 * Ekran rozgrywki hot-seat.
 *
 * Widoczna jest ręka wyłącznie aktywnego gracza — urządzenie wędruje między
 * graczami przy stole, więc karty muszą domyślnie pozostać zakryte i chować
 * się automatycznie przy zmianie tury.
 */
export function MissionScreen({ game, text = DEFAULT_UI_TEXT }: MissionScreenProps) {
  const { state, dispatch, rejection, dismissRejection } = game;
  const [selected, setSelected] = useState<{ card: Card; fromMat: boolean } | null>(null);
  const [handRevealed, setHandRevealed] = useState(false);

  const activePlayer = state.players[state.activePlayerIndex];

  // Zmiana gracza zakrywa karty — bez tego następny gracz zobaczyłby cudzą rękę.
  useEffect(() => {
    setHandRevealed(false);
    setSelected(null);
  }, [state.activePlayerIndex, state.mission?.round]);

  const mission = state.mission;
  if (!mission || !activePlayer) return null;

  const matUsed = mission.matUsedBy.filter((id) => id === activePlayer.id).length;
  const canUseMat = matUsed < state.config.maxMatCardsPerMission;

  const playSelected = (problemId: string, slotKey: SlotKey) => {
    if (!selected) return;
    dispatch({
      type: 'PLAY_CARD',
      playerId: activePlayer.id,
      cardId: selected.card.id,
      slotKey,
      problemId,
      fromMat: selected.fromMat,
    });
    setSelected(null);
  };

  const endTurnAction = (type: 'PASS' | 'SWAP_HAND') => {
    dispatch({ type, playerId: activePlayer.id });
    setSelected(null);
  };

  return (
    <main className="relative mx-auto max-w-6xl px-4 py-6">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      <header className="relative mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eter-label">Misja {state.missionNumber}</span>
          <p className="font-display text-lg font-bold">
            Rozwiązane problemy: {state.solvedProblems.length}
          </p>
        </div>
        <RoundFuel round={mission.round} total={state.config.roundsPerMission} />
        <div className="text-right">
          <span className="eter-label">Teraz gra</span>
          <p className="font-display text-2xl font-bold text-accent">{activePlayer.name}</p>
        </div>
      </header>

      {rejection && (
        <div
          role="alert"
          className="relative mb-4 flex items-center justify-between gap-4 rounded-lg border border-danger bg-surface px-4 py-2 text-sm"
        >
          <span>{rejection}</span>
          <button type="button" onClick={dismissRejection} className="underline underline-offset-2">
            Rozumiem
          </button>
        </div>
      )}

      <div className="relative space-y-4">
        {mission.problems.map((problem) => (
          <ProblemBoard
            key={problem.id}
            mission={mission}
            problem={problem}
            selectedCard={selected?.card ?? null}
            onSlotClick={playSelected}
            canPlayInSlot={cardFitsSlot}
          />
        ))}
      </div>

      <section
        aria-label={`Ręka gracza ${activePlayer.name}`}
        className="relative mt-5 rounded-xl border border-edge bg-surface p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="eter-label">Ręka gracza</span>
            <p className="font-display font-bold">{activePlayer.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setHandRevealed((v) => !v)}
            className="rounded-lg border border-edge px-4 py-2 text-sm transition hover:border-ink-dim"
          >
            {handRevealed ? 'Zakryj karty' : 'Pokaż moje karty'}
          </button>
        </div>

        {handRevealed ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {activePlayer.hand.map((card, index) => (
                <CardView
                  key={card.id}
                  card={card}
                  dealIndex={index}
                  selected={selected?.card.id === card.id && !selected.fromMat}
                  onClick={() => setSelected({ card, fromMat: false })}
                />
              ))}
            </div>

            {selected && (
              <p className="eter-rise mt-3 text-sm text-accent">
                Wybrano: {selected.card.name}. {text.missionSelectedHint}
              </p>
            )}

            {activePlayer.mat.length > 0 && (
              <div className="mt-5 border-t border-edge pt-4">
                <span className="eter-label">
                  Twoja postać{' '}
                  {canUseMat ? '— możesz użyć jednej karty' : '— karta już użyta w tej misji'}
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activePlayer.mat.map((card) => (
                    <CardView
                      key={card.id}
                      card={card}
                      compact
                      disabled={!canUseMat}
                      selected={selected?.card.id === card.id && selected.fromMat}
                      onClick={canUseMat ? () => setSelected({ card, fromMat: true }) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-dim">
            {text.missionHandHidden} {activePlayer.name}.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3 border-t border-edge pt-4">
          <button
            type="button"
            onClick={() => endTurnAction('PASS')}
            className="rounded-lg border border-edge px-4 py-2 text-sm transition hover:border-ink-dim"
          >
            Pasuję
          </button>
          <button
            type="button"
            onClick={() => endTurnAction('SWAP_HAND')}
            className="rounded-lg border border-edge px-4 py-2 text-sm transition hover:border-ink-dim"
          >
            Wymieniam wszystkie karty
          </button>
        </div>
      </section>

      {state.log.length > 0 && (
        <section className="relative mt-5" aria-label="Przebieg misji">
          <span className="eter-label">Przebieg misji</span>
          <ul className="mt-2 space-y-1 font-mono text-xs text-ink-dim">
            {state.log.slice(-5).map((entry, index) => (
              <li key={index}>{entry}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
