import { useState } from 'react';
import { ALL_CHARACTERS } from '../../data/characters';
import { DEFAULT_UI_TEXT, type UiText } from '../../data/uiText';
import type { Card, Character } from '../../engine/types';
import {
  categoryLabel,
  isCompetence,
  SLOT_ORDER,
} from '../components/categoryStyles';
import { CardView } from '../components/CardView';
import { PlayerMat } from '../components/PlayerMat';
import { Button } from '../controls/Button';
import { TopBanner } from '../controls/TopBanner';
import type { Game } from '../useGame';
import { useScreenTitle } from '../useScreenTitle';

interface SummaryScreenProps {
  game: Game;
  text?: UiText;
  characters?: Character[];
}

// Kategorie do spełnienia to te same ścianki co na karcie problemu —
// wcześniej ta lista miała tu własną, inną kolejność.
const MAT_CATEGORIES = SLOT_ORDER;

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
  const titleRef = useScreenTitle();

  const mission = state.mission;
  if (!mission) return null;

  const won = mission.phase === 'won';

  return (
    <main className="eter-fade-in relative mx-auto max-w-4xl px-4 py-8">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      <header className="relative">
        <span className="eter-label">Misja {state.missionNumber} — podsumowanie</span>
        <h1
          ref={titleRef}
          className="font-display text-4xl font-bold outline-none"
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

              {/* Do spełnienia trzeba karty z każdej kategorii, a gracz
                  wybierał na ślepo — bez tej listy nie wiedział, czego mu
                  brakuje, i cel był w praktyce nieosiągalny. */}
              {(() => {
                const missing = MAT_CATEGORIES.filter(
                  (category) => !player.mat.some((c) => c.category === category),
                );
                if (missing.length === 0) return null;

                return (
                  <p className="mt-1 text-xs text-ink-dim">
                    Do spełnienia brakuje Ci:{' '}
                    <span className="text-accent">
                      {missing.map((c) => categoryLabel(c).toLowerCase()).join(', ')}
                    </span>
                  </p>
                );
              })()}

              {/* Karta postaci obok wyboru: bez niej gracz decyduje, co
                  zabrać, nie widząc, co już na niej leży i czego mu brakuje. */}
              <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,17rem)_1fr]">
                <PlayerMat
                  player={player}
                  character={characters.find((c) => c.id === player.characterId)}
                  revealed
                  compact
                />

              {/* `min-w-0`: bez tego kolumna z kartami rozpycha siatkę
                  do sumy ich szerokości i wypycha ekran w bok. */}
              <div className="flex min-w-0 flex-wrap gap-3">
                {plays.map((play) => {
                  const shared = mission.sharedCardIds.includes(play.card.id);
                  // Odbiorcą może być tylko ktoś, kto nie zabrał jeszcze
                  // karty w tej misji — bez tego przycisk prowadził do listy,
                  // na której nie było nikogo.
                  const hasReceiver = state.players.some(
                    (other) =>
                      other.id !== player.id && !mission.takenToMat.includes(other.id),
                  );

                  const canShare =
                    !shared &&
                    !alreadyTook &&
                    isCompetence(play.card.category) &&
                    hasReceiver;

                  // Wyłączony przycisk musi powiedzieć, dlaczego — inaczej
                  // gracz widzi cztery przygaszone kafle i nie wie, czy to
                  // jego kolej się skończyła, czy coś zepsuł.
                  // ETER11 i Czarny Łabędź nie mają miejsca na karcie postaci —
                  // przycisk prowadziłby do odrzucenia i zabierał graczowi
                  // jedyny wybór w tej misji.
                  const keepable =
                    play.card.category !== 'eter11' &&
                    play.card.category !== 'blackswan';

                  const blockedReason = !keepable
                    ? 'Ta karta zostaje w grze — na postać zabierasz kompetencje, talenty i mentorów.'
                    : shared
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
                        disabled={alreadyTook || shared || !keepable}
                        title={blockedReason}
                        className="w-full"
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
                          className="w-full text-accent"
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
                  {state.players.some(
                    (other) =>
                      other.id !== player.id && !mission.takenToMat.includes(other.id),
                  ) ? (
                    <p className="text-sm">
                      Komu przekazujesz kartę <strong>{sharing.card.name}</strong>?
                    </p>
                  ) : (
                    <p className="text-sm text-ink-dim">
                      Wszyscy zabrali już kartę w tej misji — nie ma komu jej przekazać.
                      Zabierz ją dla siebie albo zostaw na później.
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {state.players
                      // Kto zabrał już kartę w tej misji, nie może dostać
                      // kolejnej — limit dotyczy też kart otrzymanych.
                      .filter(
                        (other) =>
                          other.id !== player.id &&
                          !mission.takenToMat.includes(other.id),
                      )
                      .map((other) => (
                        <Button
                          key={other.id}
                          variant="primary"
                          size="sm"
                          
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
                    <Button variant="ghost" size="sm"  onClick={() => setSharing(null)}>
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
