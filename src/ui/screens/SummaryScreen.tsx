import { useState } from 'react';
import { ALL_CHARACTERS } from '../../data/characters';
import { DEFAULT_UI_TEXT, type UiText } from '../../data/uiText';
import type { Card, Character } from '../../engine/types';
import { CardView } from '../components/CardView';
import { PlayerMat } from '../components/PlayerMat';
import { Button } from '../controls/Button';
import { TopBanner } from '../controls/TopBanner';
import type { Game } from '../useGame';

interface SummaryScreenProps {
  game: Game;
  text?: UiText;
  characters?: Character[];
}

const COMPETENCE_CATEGORIES = ['psychological', 'digital', 'social'];

/**
 * Podsumowanie misji.
 *
 * Każdy gracz zabiera jedną ze swoich zagranych kart na kartę postaci —
 * także po porażce, zgodnie z zasadą „nawet przegrana uczy". Kompetencję
 * można zamiast tego przekazać innemu graczowi.
 */
export function SummaryScreen({
  game,
  text = DEFAULT_UI_TEXT,
  characters = ALL_CHARACTERS,
}: SummaryScreenProps) {
  const { state, dispatch, rejection, dismissRejection } = game;
  const [sharing, setSharing] = useState<{ card: Card; fromPlayerId: string } | null>(null);

  const mission = state.mission;
  if (!mission) return null;

  const won = mission.phase === 'won';

  return (
    <main className="eter-fade-in relative mx-auto max-w-4xl px-4 py-8">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      <header className="relative">
        <span className="eter-label">Misja {state.missionNumber} — podsumowanie</span>
        <h1
          className="font-display text-4xl font-bold"
          style={{ color: won ? 'var(--eter-success)' : 'var(--eter-danger)' }}
        >
          {won ? text.summaryWonHeading : text.summaryLostHeading}
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed">
          {won ? text.summaryWonBody : text.summaryLostBody}
        </p>
      </header>

      {rejection && (
        <TopBanner message={rejection} tone="danger" onDismiss={dismissRejection} />
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

              {/* Karta postaci obok wyboru: bez niej gracz decyduje, co
                  zabrać, nie widząc, co już na niej leży i czego mu brakuje. */}
              <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,17rem)_1fr]">
                <PlayerMat
                  player={player}
                  character={characters.find((c) => c.id === player.characterId)}
                  revealed
                  compact
                />

              <div className="flex flex-wrap gap-3">
                {plays.map((play) => {
                  const shared = mission.sharedCardIds.includes(play.card.id);
                  const canShare =
                    !shared &&
                    !alreadyTook &&
                    COMPETENCE_CATEGORIES.includes(play.card.category) &&
                    state.players.length > 1;

                  // Wyłączony przycisk musi powiedzieć, dlaczego — inaczej
                  // gracz widzi cztery przygaszone kafle i nie wie, czy to
                  // jego kolej się skończyła, czy coś zepsuł.
                  const blockedReason = shared
                    ? 'Ta karta poszła do innego gracza.'
                    : alreadyTook
                      ? 'W tej misji zabrałeś już kartę na postać.'
                      : undefined;

                  return (
                    <div
                      key={play.card.id}
                      // Sztywne w-36 przy 360px mieściło jedną kartę w rzędzie
                      // i robiło z listy długą kolumnę. Dwie na wąskim ekranie.
                      className="flex w-[calc(50%-0.375rem)] max-w-36 flex-col gap-1.5"
                    >
                      <CardView card={play.card} disabled={shared || alreadyTook} />
                      <Button
                        size="sm"
                        variant="secondary"
                        data-tour="take-card"
                        disabled={alreadyTook || shared}
                        title={blockedReason}
                        className="min-h-11 w-full"
                        onClick={() =>
                          dispatch({
                            type: 'TAKE_CARD_TO_MAT',
                            playerId: player.id,
                            cardId: play.card.id,
                          })
                        }
                      >
                        Zabieram na postać
                      </Button>
                      {canShare && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-11 w-full text-accent"
                          onClick={() => setSharing({ card: play.card, fromPlayerId: player.id })}
                        >
                          Uczę kogoś
                        </Button>
                      )}
                      {shared && (
                        <span className="text-center text-xs text-success">Przekazana</span>
                      )}
                    </div>
                  );
                })}
                </div>
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
                        <Button
                          key={other.id}
                          variant="primary"
                          size="sm"
                          className="min-h-11"
                          onClick={() => {
                            dispatch({
                              type: 'SHARE_CARD',
                              fromPlayerId: player.id,
                              toPlayerId: other.id,
                              cardId: sharing.card.id,
                            });
                            setSharing(null);
                          }}
                        >
                          {other.name}
                        </Button>
                      ))}
                    <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setSharing(null)}>
                      Anuluj
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="relative mt-8">
        <Button variant="primary" size="lg" onClick={() => dispatch({ type: 'END_MISSION_SUMMARY' })}>
          Dalej
        </Button>
      </div>
    </main>
  );
}
