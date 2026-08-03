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
import { Tooltip } from '../controls/Tooltip';
import { TopBanner } from '../controls/TopBanner';
import type { Game } from '../useGame';
import { useScreenTitle } from '../useScreenTitle';

interface SummaryScreenProps {
  game: Game;
  text?: UiText;
  characters?: Character[];
  /**
   * Ukryj własny przycisk „Dalej".
   *
   * W samouczku dalej prowadzi ETER11 przez swój dymek — po zabraniu karty
   * mówi, co dalej, i kończy ćwiczenie ekranem podsumowania. Gdyby obok stał
   * zwykły „Dalej", dziecko klikało go zamiast słuchać i lądowało na pustej
   * „Misji 2" bez talii i bez wyjścia — poza scenariuszem, w ślepym zaułku.
   */
  hideAdvance?: boolean;
  /**
   * UID gracza patrzącego na ekran (tylko online — patrz `OnlineGame`).
   *
   * Podsumowanie nie ma tury: każdy gracz działa niezależnie, więc — inaczej
   * niż `MissionScreen`, gdzie tylko aktywny gracz ma interaktywną rękę —
   * ten ekran pokazuje naraz przyciski WSZYSTKICH graczy. Bez `viewerId`
   * (pass-and-play przy jednym urządzeniu) to poprawne: każdy po kolei bierze
   * telefon. Online każdy siedzi na swoim urządzeniu i widzi ten sam ekran —
   * bez tego pola dziecko mogło kliknąć przycisk pod cudzym imieniem i
   * dopiero wtedy dostać odmowę z reduktora, mimo że przycisk wyglądał
   * identycznie jak przy własnym wierszu.
   */
  viewerId?: string;
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
  hideAdvance = false,
  viewerId,
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
          const isOwn = viewerId === undefined || viewerId === player.id;

          // Zabrana ORAZ przekazana karta schodzi z `mission.played` (leży już
          // na macie — swojej albo odbiorcy — i nie liczy się dwa razy). Gdy
          // była jedyną wyłożoną kartą gracza, jego `plays` robi się puste — ale
          // on ją WYŁOŻYŁ, więc nie wolno twierdzić, że nic nie zagrał.
          if (plays.length === 0) {
            // Przekazał: karta doświadczenia „share" z tej misji (id koduje
            // misję i gracza, patrz reducer `shareCard`).
            const sharedAway = player.experience.some(
              (e) =>
                e.kind === 'share' &&
                e.id.startsWith(`exp-share-${state.missionNumber}-${player.id}-`),
            );
            // Zabrał SWOJĄ kartę na matę. `takenToMat` obejmuje też odbiorcę
            // przekazania (dostanie karty wyczerpuje jego limit) — a odbiorca
            // sam nic nie wyłożył. Odróżniamy zabierającego od obdarowanego po
            // tym, że obdarowany ma tę kartę w `receivedCardIds`, spójną z
            // `sharedCardIds` bieżącej misji.
            const receivedThisMission = player.receivedCardIds.some((id) =>
              mission.sharedCardIds.includes(id),
            );
            const tookOwnCard = alreadyTook && !receivedThisMission;
            return (
              <div key={player.id} className="rounded-xl border border-edge bg-surface p-4">
                <h2 className="truncate font-display font-bold">{player.name}</h2>
                <p className="mt-1 text-sm text-ink-dim">
                  {sharedAway
                    ? 'Przekazał swoją wyłożoną kartę innemu graczowi w tej misji.'
                    : tookOwnCard
                      ? 'Zabrał swoją wyłożoną kartę na swoją postać.'
                      : 'W tej misji nie wyłożył żadnej karty.'}
                </p>
              </div>
            );
          }

          return (
            <div key={player.id} className="rounded-xl border border-edge bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="min-w-0 truncate font-display text-lg font-bold">{player.name}</h2>
                <span className="eter-label">
                  {alreadyTook
                    ? 'Karta zabrana'
                    : plays.every(
                          (p) =>
                            p.card.category === 'eter11' ||
                            p.card.category === 'blackswan',
                        )
                      // Gracz, który zagrał wyłącznie karty specjalne, nie ma
                      // czego zabrać — bez tego widziałby same wyłączone
                      // przyciski i nie wiedział dlaczego.
                      ? 'Nic do zabrania w tej misji'
                      : 'Wybierz jedną kartę'}
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
                    hasReceiver &&
                    isOwn;

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
                        // Ekran pokazuje karty wszystkich naraz, więc „zabrałeś"
                        // trafiało do osoby czytającej, nie do właściciela karty.
                        ? `${player.name} zabrał już kartę w tej misji.`
                        : !isOwn
                          // Online każdy widzi ten sam ekran ze wszystkimi
                          // wierszami naraz — bez tego przycisk pod cudzym
                          // imieniem wyglądał identycznie jak własny, a klik
                          // kończył się dopiero ciche odmową reduktora.
                          ? `Tylko ${player.name} może zabrać tę kartę.`
                          : undefined;

                  return (
                    <div
                      key={play.card.id}
                      // Sztywne w-36 przy 360px mieściło jedną kartę w rzędzie
                      // i robiło z listy długą kolumnę. Dwie na wąskim ekranie.
                      className="flex w-[calc(50%-0.375rem)] max-w-36 flex-col gap-1.5"
                    >
                      <CardView card={play.card} disabled={shared || alreadyTook} />
                      {/* Custom podpowiedź zamiast natywnego `title` (szary,
                          obcy systemowy dymek). Owija Button — span łapie
                          najechanie także nad wyłączonym przyciskiem. */}
                      <Tooltip label={blockedReason ?? ''} className="w-full">
                        <Button
                          size="sm"
                          variant="secondary"
                          data-tour="take-card"
                          disabled={alreadyTook || shared || !keepable || !isOwn}
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
                      </Tooltip>
                      {canShare && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-accent"
                          onClick={() => setSharing({ card: play.card, fromPlayerId: player.id })}
                        >
                          Przekaż graczowi
                        </Button>
                      )}
                      {/* Brak przycisku „przekaż" przy talencie i mentorze
                          wyglądał jak usterka: gracz widział kartę z jedną
                          opcją zamiast dwóch i nie miał skąd wiedzieć, że tak
                          ma być. Cisza jest gorsza niż odmowa z powodem. */}
                      {!shared && !canShare && keepable && !isCompetence(play.card.category) && (
                        <span className="text-center text-[11px] leading-snug text-ink-dim">
                          {play.card.category === 'mentor'
                            ? 'Mentor zostaje przy Tobie — nie da się go przekazać.'
                            : 'Talent jest Twój — nie da się go przekazać.'}
                        </span>
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

      {!hideAdvance && (
        <div className="relative mt-8">
          <Button variant="primary" size="lg" onClick={() => dispatch({ type: 'END_MISSION_SUMMARY' })}>
            Dalej
          </Button>
        </div>
      )}
    </main>
  );
}
