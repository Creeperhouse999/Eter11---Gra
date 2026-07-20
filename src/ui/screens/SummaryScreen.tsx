import { useState } from 'react';
import type { Card } from '../../engine/types';
import { CardView } from '../components/CardView';
import type { Game } from '../useGame';

interface SummaryScreenProps {
  game: Game;
}

const COMPETENCE_CATEGORIES = ['psychological', 'digital', 'social'];

/**
 * Podsumowanie misji.
 *
 * Każdy gracz zabiera jedną ze swoich zagranych kart na kartę postaci —
 * także po porażce, zgodnie z zasadą „nawet przegrana uczy". Kompetencję
 * można zamiast tego przekazać innemu graczowi.
 */
export function SummaryScreen({ game }: SummaryScreenProps) {
  const { state, dispatch, rejection, dismissRejection } = game;
  const [sharing, setSharing] = useState<{ card: Card; fromPlayerId: string } | null>(null);

  const mission = state.mission;
  if (!mission) return null;

  const won = mission.phase === 'won';

  return (
    <main className="relative mx-auto max-w-4xl px-4 py-8">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      <header className="relative">
        <span className="eter-label">Misja {state.missionNumber} — podsumowanie</span>
        <h1
          className="font-display text-4xl font-bold"
          style={{ color: won ? 'var(--eter-success)' : 'var(--eter-danger)' }}
        >
          {won ? 'Problem rozwiązany' : 'Tym razem problem wygrał'}
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed">
          {won
            ? 'Udało się. Każdy z Was zabiera jedną ze swoich kart na kartę postaci. Kompetencję możecie zamiast tego przekazać innemu graczowi — wtedy dostajecie dodatkową kartę doświadczenia za uczenie innych.'
            : 'Problem trafia na stos nierozwiązanych, ale to nie koniec. Porozmawiajcie, jakich kompetencji zabrakło. Każdy, kto wyłożył kartę, i tak zabiera jedną na swoją postać — Wasze postacie właśnie się uczą. Do tego problemu wrócicie po dwóch kolejnych misjach.'}
        </p>
      </header>

      {rejection && (
        <div
          role="alert"
          className="relative mt-4 flex items-center justify-between gap-4 rounded-lg border border-danger bg-surface px-4 py-2 text-sm"
        >
          <span>{rejection}</span>
          <button type="button" onClick={dismissRejection} className="underline underline-offset-2">
            Rozumiem
          </button>
        </div>
      )}

      <section className="relative mt-6 space-y-4">
        {state.players.map((player) => {
          const plays = mission.played.filter((p) => p.playerId === player.id);
          const alreadyTook = mission.takenToMat.includes(player.id);

          if (plays.length === 0) {
            return (
              <div key={player.id} className="rounded-xl border border-edge bg-surface p-4">
                <h2 className="font-display font-bold">{player.name}</h2>
                <p className="mt-1 text-sm text-ink-dim">
                  W tej misji nie wyłożył żadnej karty.
                </p>
              </div>
            );
          }

          return (
            <div key={player.id} className="rounded-xl border border-edge bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold">{player.name}</h2>
                <span className="eter-label">
                  {alreadyTook ? 'Karta zabrana' : 'Wybierz jedną kartę'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {plays.map((play) => {
                  const shared = mission.sharedCardIds.includes(play.card.id);
                  const canShare =
                    !shared &&
                    !alreadyTook &&
                    COMPETENCE_CATEGORIES.includes(play.card.category) &&
                    state.players.length > 1;

                  return (
                    <div key={play.card.id} className="flex w-36 flex-col gap-1">
                      <CardView card={play.card} disabled={shared || alreadyTook} />
                      <button
                        type="button"
                        disabled={alreadyTook || shared}
                        onClick={() =>
                          dispatch({
                            type: 'TAKE_CARD_TO_MAT',
                            playerId: player.id,
                            cardId: play.card.id,
                          })
                        }
                        className="rounded border border-edge px-2 py-1 text-xs transition hover:border-ink-dim disabled:opacity-40"
                      >
                        Zabieram na postać
                      </button>
                      {canShare && (
                        <button
                          type="button"
                          onClick={() => setSharing({ card: play.card, fromPlayerId: player.id })}
                          className="rounded border border-accent px-2 py-1 text-xs text-accent transition hover:bg-accent hover:text-bg"
                        >
                          Uczę kogoś
                        </button>
                      )}
                      {shared && (
                        <span className="text-center text-xs text-success">Przekazana</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {sharing?.fromPlayerId === player.id && (
                <div className="mt-4 rounded-lg border border-accent bg-raised p-3">
                  <p className="text-sm">
                    Komu przekazujesz kartę <strong>{sharing.card.name}</strong>?
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {state.players
                      .filter((other) => other.id !== player.id)
                      .map((other) => (
                        <button
                          key={other.id}
                          type="button"
                          onClick={() => {
                            dispatch({
                              type: 'SHARE_CARD',
                              fromPlayerId: player.id,
                              toPlayerId: other.id,
                              cardId: sharing.card.id,
                            });
                            setSharing(null);
                          }}
                          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-bg"
                        >
                          {other.name}
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => setSharing(null)}
                      className="rounded-lg border border-edge px-3 py-1.5 text-sm"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <button
        type="button"
        onClick={() => dispatch({ type: 'END_MISSION_SUMMARY' })}
        className="relative mt-8 rounded-lg bg-accent px-6 py-3 font-display font-bold text-bg"
      >
        Dalej
      </button>
    </main>
  );
}
