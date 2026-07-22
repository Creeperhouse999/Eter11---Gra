import { useEffect, useState } from 'react';
import { ALL_CHARACTERS } from '../../data/characters';
import { DEFAULT_UI_TEXT, type UiText } from '../../data/uiText';
import { roundsForPlayers } from '../../engine/reducer';
import { cardFitsSlot } from '../../engine/rules';
import type { Card, Character, FamilyId, Player, SlotKey } from '../../engine/types';
import { BlackSwanBanner } from '../components/BlackSwanBanner';
import { CardView } from '../components/CardView';
import { Coach } from '../components/Coach';
import { DragGhost } from '../components/DragGhost';
import { CardZoom } from '../components/CardZoom';
import { Icon, type IconName } from '../icons/Icon';
import { MissionProgress } from '../components/MissionProgress';
import { DeckStack } from '../components/DeckStack';
import { PlayerMat } from '../components/PlayerMat';
import { ProblemCard } from '../components/ProblemCard';
import { ScrollHint } from '../components/ScrollHint';
import { RoundFuel } from '../components/RoundFuel';
import { useCardDrag } from '../components/useCardDrag';
import { Button } from '../controls/Button';
import { TopBanner } from '../controls/TopBanner';
import type { TutorialContext } from '../tutorial/useTutorial';
import type { Game } from '../useGame';
import { useScreenTitle } from '../useScreenTitle';

interface MissionScreenProps {
  game: Game;
  text?: UiText;
  characters?: Character[];
  /** Samouczek obserwuje, co gracz widzi na ekranie. */
  onContext?: (context: TutorialContext) => void;
  /**
   * Samouczek blokuje ruchy spoza bieżącego kroku, żeby gracz nie wyprzedził
   * scenariusza. Brak funkcji = wszystko dozwolone.
   */
  allows?: (action: 'play' | 'swap' | 'pass') => boolean;
  /**
   * Wyjście do menu. Odkąd partia przeżywa odświeżenie strony, przeładowanie
   * przestało być ucieczką — bez tego przycisku gracz nie ma jak porzucić
   * rozpoczętej gry.
   */
  onQuit?: () => void;
  /**
   * Ręka odkryta od startu. Samouczek gra jedna osoba, więc chowanie kart
   * przed samym sobą nie ma sensu i tylko dokłada krok.
   */
  alwaysRevealed?: boolean;
}

/**
 * Ekran misji jako stół.
 *
 * Karta problemu leży na środku, karty postaci graczy rozstawione są wokół
 * niej — na szerokim ekranie po bokach, na wąskim jedna pod drugą. Ręka jest
 * widoczna tylko dla gracza, którego jest ruch, bo urządzenie wędruje między
 * siedzącymi przy stole.
 */
export function MissionScreen({
  game,
  text = DEFAULT_UI_TEXT,
  characters = ALL_CHARACTERS,
  onContext,
  allows,
  alwaysRevealed = false,
  onQuit,
}: MissionScreenProps) {
  const { state, dispatch, rejection, dismissRejection } = game;
  const [selected, setSelected] = useState<{ card: Card; fromMat: boolean } | null>(null);
  /** Karta oglądana na cały ekran. Otwiera ją przytrzymanie. */
  const [zoomed, setZoomed] = useState<Card | null>(null);
  const [handRevealed, setHandRevealed] = useState(alwaysRevealed);
  /** Karty zaznaczone do wymiany. Pusty zbiór = tryb wymiany wyłączony. */
  const [swapMode, setSwapMode] = useState(false);
  const [toSwap, setToSwap] = useState<string[]>([]);
  const { drag, dragHandlers, dropTargetProps, registerDrop, ghostRef, startPoint } = useCardDrag<{
    card: Card;
    fromMat: boolean;
  }>();

  const activePlayer = state.players[state.activePlayerIndex];
  const titleRef = useScreenTitle<HTMLParagraphElement>();

  // Ile razy potwierdzono wymianę w tej misji — dowód dla samouczka.
  //
  // Celowo NIE zerowany przy zmianie rundy ani gracza: wymiana sama kończy
  // rundę, więc reset skasowałby dowód w tej samej chwili, w której powstaje.
  // Nowa misja to nowy licznik.
  const [swapCount, setSwapCount] = useState(0);
  useEffect(() => setSwapCount(0), [state.missionNumber]);

  // Zmiana gracza zakrywa karty — bez tego następny gracz zobaczyłby cudzą rękę.
  useEffect(() => {
    setHandRevealed(alwaysRevealed);
    setSelected(null);
    setSwapMode(false);
    setToSwap([]);
  }, [state.activePlayerIndex, state.mission?.round, alwaysRevealed]);

  // Samouczek musi wiedzieć, czy karty są odkryte i czy któraś jest wybrana.
  useEffect(() => {
    // Pierwsza wolna ścianka pasująca do wybranej karty — samouczek ją
    // podświetla. Bez wybranej karty: pierwsza, którą da się zamknąć czymś
    // z ręki.
    const findTarget = (): string | null => {
      const mission = state.mission;
      if (!mission) return null;

      const candidates = selected ? [selected.card] : activePlayer?.hand ?? [];

      for (const problem of mission.problems) {
        for (const slot of problem.slots) {
          const filled =
            mission.played.filter(
              (p) => p.problemId === problem.id && p.slotKey === slot.key,
            ).length > 0;
          if (filled) continue;

          if (candidates.some((card) => cardFitsSlot(card, slot.key, slot.family))) {
            return `${problem.id}:${slot.key}`;
          }
        }
      }
      return null;
    };

    onContext?.({
      handRevealed,
      cardSelected: selected !== null,
      swapMode,
      swapSelected: toSwap.length,
      targetSlot: findTarget(),
      swapCount,
    });
  }, [
    onContext, handRevealed, selected, swapMode, toSwap.length,
    state.mission, activePlayer, swapCount,
  ]);

  const mission = state.mission;
  if (!mission || !activePlayer) return null;

  // Czy gracz ma czym zagrać — używane w podpowiedzi przy „Pasuję".
  const hasPlayableCard = activePlayer.hand.some((card) =>
    mission.problems.some((problem) =>
      problem.slots.some(
        (slot) =>
          !mission.played.some(
            (p) => p.problemId === problem.id && p.slotKey === slot.key,
          ) && cardFitsSlot(card, slot.key, slot.family),
      ),
    ),
  );

  // Czarne Łabędzie, które właśnie weszły do gry i czekają na przeczytanie.
  const swanEvents = mission.pendingSwanEvents;
  const dismissSwanEvents = () => dispatch({ type: 'DISMISS_SWAN_EVENTS' });


  const matUsed = mission.matUsedBy.filter((id) => id === activePlayer.id).length;
  const canUseMat = matUsed < state.config.maxMatCardsPerMission;

  const characterOf = (characterId: string) => characters.find((c) => c.id === characterId);
  const activeCharacter = characterOf(activePlayer.characterId);

  const play = (card: Card, fromMat: boolean, problemId: string, slotKey: SlotKey) => {
    dispatch({
      type: 'PLAY_CARD',
      playerId: activePlayer.id,
      cardId: card.id,
      slotKey,
      problemId,
      fromMat,
    });
    setSelected(null);

    // Zagrana karta znika z drzewa, więc fokus spadał na `body` i gracz na
    // klawiaturze wracał na początek dokumentu. Przenosimy go na pasek ręki —
    // stały punkt, od którego łatwo dojść do kolejnej karty. `requestAnimationFrame`,
    // bo cel musi istnieć po przerysowaniu planszy.
    requestAnimationFrame(() => {
      const hand = document.querySelector<HTMLElement>('[data-tour="hand"] button');
      hand?.focus();
    });
  };

  const playSelected = (problemId: string, slotKey: SlotKey) => {
    if (!selected) return;
    play(selected.card, selected.fromMat, problemId, slotKey);
  };

  // Upuszczenie karty na ściankę. Identyfikator strefy to „problemId:slotKey".
  registerDrop((targetId, payload) => {
    const [problemId, slotKey] = targetId.split(':');
    play(payload.card, payload.fromMat, problemId, slotKey as SlotKey);
  });

  const pass = () => {
    dispatch({ type: 'PASS', playerId: activePlayer.id });
    setSelected(null);
  };

  const confirmSwap = () => {
    dispatch({ type: 'SWAP_HAND', playerId: activePlayer.id, cardIds: toSwap });
    // Samouczek potrzebuje trwałego dowodu wymiany: `swappedThisRound` gaśnie
    // razem z rundą, którą ta wymiana właśnie kończy.
    setSwapCount((n) => n + 1);
    setSelected(null);
    setSwapMode(false);
    setToSwap([]);
  };

  const toggleSwap = (cardId: string) =>
    setToSwap((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );

  const allowed = (action: 'play' | 'swap' | 'pass') => allows?.(action) ?? true;

  const canPlay = (card: Card, slotKey: SlotKey, family: FamilyId) =>
    allowed('play') && cardFitsSlot(card, slotKey, family);

  /**
   * Podwójne kliknięcie zagrywa kartę na pierwszą pasującą, wolną ściankę.
   * Skrót dla graczy, którym przeciąganie i wybieranie ścianki zajmuje
   * za dużo ruchów — przy jednej pasującej ściance wybór i tak jest oczywisty.
   */
  const quickPlay = (card: Card, fromMat: boolean) => {
    if (!allowed('play')) return;

    for (const problem of mission.problems) {
      for (const slot of problem.slots) {
        const filled =
          mission.played.filter(
            (p) => p.problemId === problem.id && p.slotKey === slot.key,
          ).length > 0;
        if (filled) continue;

        if (cardFitsSlot(card, slot.key, slot.family)) {
          play(card, fromMat, problem.id, slot.key);
          return;
        }
      }
    }
  };

  // Miejsca przy stole: aktywny gracz na dole, pozostali wokół karty problemu.
  const others = state.players.filter((p) => p.id !== activePlayer.id);
  const [left, top, right] = others;

  const renderMat = (player: Player | undefined) =>
    player ? (
      <PlayerMat
        key={player.id}
        player={player}
        character={characterOf(player.characterId)}
        compact
      />
    ) : null;

  return (
    <main className="eter-fade-in relative mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-6">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      {/* Na wąskim ekranie cztery bloki zawijały się w cztery rzędy, a ostatni
          wyrównany do prawej wyglądał jak błąd układu. Siatka 2×2 na telefonie,
          rząd od `sm` wzwyż. */}
      <header className="relative mb-5 grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <span className="eter-label">Misja {state.missionNumber}</span>
          <p
            ref={titleRef}
            className="truncate font-display text-base font-bold outline-none sm:text-lg"
          >
            Rozwiązane: {state.solvedProblems.length}
          </p>
        </div>
        <div className="text-right sm:order-last">
          {onQuit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onQuit}
              className="mb-0.5 text-[11px] text-ink-dim hover:text-danger"
            >
              Zakończ grę
            </Button>
          )}
          <span className="eter-label block">Teraz gra</span>
          {/* Samo imię ginęło, gdy nad jednym telefonem stoi czworo dzieci
              i każde sprawdza, czy to już jego kolej. Ikona postaci czyta się
              szybciej niż tekst i jest tym samym znakiem, który dziecko
              wybrało dla siebie na starcie. */}
          <div className="flex items-center gap-2">
            {activeCharacter && (
              <span
                className="eter-pulse flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-bg"
                style={{ background: 'var(--eter-accent)' }}
              >
                <Icon name={activeCharacter.icon as IconName} size={20} />
              </span>
            )}
            <p className="min-w-0 truncate font-display text-xl font-bold text-accent sm:text-2xl">
              {activePlayer.name}
            </p>
          </div>
        </div>
        {/* Oba paski zajmują pełną szerokość na telefonie: w kolumnie 162 px
            kropki postępu i rund zawijały się do trzech rzędów, przez co
            nagłówek rósł o kilkadziesiąt pikseli. */}
        <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 sm:contents">
          <MissionProgress mission={mission} />
          {/* Samouczek nie ma limitu rund — licznik tylko myliłby. */}
          {!alwaysRevealed && (
            <RoundFuel
              round={mission.round}
              total={roundsForPlayers(
                state.players.length,
                state.config.roundsPerMission,
              )}
            />
          )}
        </div>
      </header>

      {/*
        Podpowiedź prowadząca przez turę.
        W samouczku milczy: ETER11 mówi już swoje, a dwa źródła podpowiedzi
        potrafiły przeczyć sobie nawzajem.
      */}
      {!alwaysRevealed && (
      <div className="relative mb-4">
        <Coach
          state={state}
          player={activePlayer}
          selectedCard={selected?.card ?? null}
          handRevealed={handRevealed}
          swapMode={swapMode}
        />
      </div>
      )}

      {rejection && (
        <TopBanner message={rejection} tone="danger" onDismiss={dismissRejection} />
      )}

      {/* Plansza ma się mieścić w całości, ale przy dużej czcionce albo
          zamkniętych ściankach potrafi urosnąć — wtedy mówimy o tym wprost. */}
      <ScrollHint />

      {/* Czarny Łabędź nie jest ruchem gracza — wchodzi sam przy dobraniu,
          a okno wyjaśnia, co właśnie zmienił na planszy. */}
      {swanEvents.length > 0 && (
        <BlackSwanBanner events={swanEvents} onDismiss={dismissSwanEvents} />
      )}

      {/* Talie na widoku: karta wylatuje ze stosu, gdy się dobiera —
          zamiast statycznej liczby w nagłówku. Samouczek ma ustaloną talię,
          więc licznik tylko myliłby; pokazujemy je w normalnej grze. */}
      {!alwaysRevealed && (
        <div className="mt-4 flex items-start justify-center gap-6">
          <DeckStack count={state.drawPile.length} label="Talia" icon="spark" />
          <DeckStack count={state.problemPile.length} label="Problemy" icon="clash" />
        </div>
      )}

      {/* ── Stół ──────────────────────────────────────────────────────── */}
      <div className="relative mt-4">
        {top && <div className="mx-auto mb-3 max-w-md">{renderMat(top)}</div>}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,15rem)_1fr_minmax(0,15rem)]">
          <div className="order-2 xl:order-1 xl:self-center">{renderMat(left)}</div>

          <div className="order-1 space-y-4 xl:order-2" data-tour="problem">
            {mission.problems.map((problem) => (
              <ProblemCard
                key={problem.id}
                mission={mission}
                problem={problem}
                selectedCard={selected?.card ?? null}
                onSlotClick={playSelected}
                canPlayInSlot={canPlay}
                dropTargetProps={dropTargetProps}
                draggedCard={drag?.payload.data.card ?? null}
              />
            ))}
          </div>

          <div className="order-3 xl:self-center">{renderMat(right)}</div>
        </div>
      </div>

      {/* ── Miejsce aktywnego gracza ──────────────────────────────────── */}
      <section
        aria-label={`Ręka gracza ${activePlayer.name}`}
        className="relative mt-5 rounded-xl border-2 border-accent bg-surface p-4"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
          <PlayerMat
            player={activePlayer}
            character={characterOf(activePlayer.characterId)}
            active
            revealed={handRevealed}
            cardsDisabled={!canUseMat}
            selectedCardId={selected?.fromMat ? selected.card.id : null}
            onCardClick={
              canUseMat && handRevealed
                ? (cardId) => {
                    const card = activePlayer.mat.find((c) => c.id === cardId);
                    if (card) setSelected({ card, fromMat: true });
                  }
                : undefined
            }
            onCardDoubleClick={
              canUseMat && handRevealed
                ? (cardId) => {
                    const card = activePlayer.mat.find((c) => c.id === cardId);
                    if (card) quickPlay(card, true);
                  }
                : undefined
            }
          />

          {/* `min-w-0`: element siatki domyślnie nie kurczy się poniżej swojej
              zawartości, więc pasek kart rozpychał kolumnę do sumy szerokości
              wszystkich kart i wypychał całą planszę poza ekran telefonu. */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="eter-label">Karty na ręce</span>
              {!alwaysRevealed && (
                <Button
                  size="sm"
                  data-tour="reveal"
                  icon={handRevealed ? 'eyeOff' : 'eyeOn'}
                  onClick={() => setHandRevealed((v) => !v)}
                >
                  {handRevealed ? 'Zakryj karty' : 'Pokaż moje karty'}
                </Button>
              )}
            </div>

            {handRevealed ? (
              <>
                {/* Na telefonie ręka to pasek przewijany w bok, nie zawijana
                    siatka: pięć kart po dwie w rzędzie zajmowało 450 px, czyli
                    dwie trzecie ekranu. Od `sm` wraca zawijanie, bo tam karty
                    mieszczą się w jednym rzędzie. */}
                <div
                  className="-mx-1 mt-2 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:mt-3 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0"
                  data-tour="hand"
                >
                  {activePlayer.hand.map((card, index) => (
                    <CardView
                      key={card.id}
                      card={card}
                      dealIndex={index}
                      onZoom={() => setZoomed(card)}
                      // Samouczek podświetla dokładnie tę kartę, którą trzeba
                      // złapać — nie całą rękę.
                      data-tour={
                        // W trybie wymiany świecą karty do zaznaczenia — bez
                        // tego gracz widział tylko ramkę wokół całej ręki.
                        swapMode
                          ? toSwap.includes(card.id)
                            ? 'swap-picked'
                            : 'swap-card'
                          : // Wybrana karta to źródło ruchu — samouczek rysuje od
                            // niej strzałkę do ścianki, więc musi wiedzieć, która to.
                            !swapMode && selected?.card.id === card.id && !selected.fromMat
                          ? 'selected-card'
                          : !swapMode &&
                              !selected &&
                              mission.problems.some((problem) =>
                                problem.slots.some(
                                  (slot) =>
                                    cardFitsSlot(card, slot.key, slot.family) &&
                                    mission.played.filter(
                                      (p) => p.problemId === problem.id && p.slotKey === slot.key,
                                    ).length === 0,
                                ),
                              )
                            ? 'playable-card'
                            : undefined
                      }
                      selected={
                        swapMode
                          ? toSwap.includes(card.id)
                          : selected?.card.id === card.id && !selected.fromMat
                      }
                      onClick={
                        swapMode
                          ? () => toggleSwap(card.id)
                          : () => setSelected({ card, fromMat: false })
                      }
                      onDoubleClick={
                        swapMode ? undefined : () => quickPlay(card, false)
                      }
                      // W trybie wymiany klik zaznacza kartę — przeciąganie
                      // myliłoby się z zagrywaniem.
                      dragHandlers={
                        swapMode
                          ? undefined
                          : dragHandlers({
                              data: { card, fromMat: false },
                              label: card.name,
                            })
                      }
                      beingDragged={drag?.payload.data.card.id === card.id}
                    />
                  ))}
                </div>

                {swapMode && toSwap.length > 0 && (
                  <p className="eter-rise mt-3 text-sm text-accent-2">
                    Wybrano {toSwap.length} do wymiany.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-dim">
                {text.missionHandHidden} {activePlayer.name}.
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap gap-2 border-t border-edge pt-2.5 sm:mt-4 sm:gap-3 sm:pt-4">
              {swapMode ? (
                <>
                  <Button
                    variant="primary"
                    icon="undo"
                    data-tour="swap-confirm"
                    disabled={toSwap.length === 0}
                    onClick={confirmSwap}
                  >
                    {toSwap.length === 0
                      ? 'Zaznacz karty'
                      : `Wymień ${toSwap.length}`}
                  </Button>
                  <Button
                    onClick={() =>
                      // Zaznaczamy tylko karty nieprzydatne — zaznaczenie
                      // wszystkich potrafiło oddać jedyną kartę pasującą
                      // do wolnej ścianki i zablokować misję.
                      setToSwap(
                        activePlayer.hand
                          .filter(
                            (card) =>
                              !mission.problems.some((problem) =>
                                problem.slots.some(
                                  (slot) =>
                                    cardFitsSlot(card, slot.key, slot.family) &&
                                    mission.played.filter(
                                      (p) =>
                                        p.problemId === problem.id &&
                                        p.slotKey === slot.key,
                                    ).length === 0,
                                ),
                              ),
                          )
                          .map((c) => c.id),
                      )
                    }
                  >
                    Zaznacz nieprzydatne
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSwapMode(false);
                      setToSwap([]);
                    }}
                  >
                    Anuluj
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={pass}
                    disabled={!allowed('pass')}
                    // Spasowanie oddaje ruch bezpowrotnie, a przycisk sąsiaduje
                    // z wymianą — dziecko klikające na próbę traci turę i nie
                    // wie dlaczego. Tytuł mówi to, zanim kliknie.
                    title={
                      hasPlayableCard
                        ? 'Oddasz ruch następnemu graczowi. Masz jeszcze kartę, którą da się zagrać.'
                        : 'Oddasz ruch następnemu graczowi.'
                    }
                  >
                    Pasuję
                  </Button>
                  <Button
                    icon="undo"
                    data-tour="swap"
                    disabled={!handRevealed || !allowed('swap')}
                    title={handRevealed ? undefined : 'Najpierw odkryj karty'}
                    onClick={() => {
                      setSwapMode(true);
                      setSelected(null);
                    }}
                  >
                    Wymieniam karty
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <CardZoom card={zoomed} onClose={() => setZoomed(null)} />

      {drag && (
        <DragGhost
          card={drag.payload.data.card}
          ghostRef={ghostRef}
          start={startPoint.current}
          overValidTarget={Boolean(
            drag.overId &&
              (() => {
                const [problemId, slotKey] = drag.overId.split(':');
                const problem = mission.problems.find((p) => p.id === problemId);
                const slot = problem?.slots.find((s) => s.key === slotKey);
                return slot && canPlay(drag.payload.data.card, slot.key, slot.family);
              })(),
          )}
        />
      )}

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
