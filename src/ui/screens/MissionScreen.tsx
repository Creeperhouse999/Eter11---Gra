import { useEffect, useState } from 'react';
import { ALL_CHARACTERS } from '../../data/characters';
import { DEFAULT_UI_TEXT, type UiText } from '../../data/uiText';
import { cardFitsSlot } from '../../engine/rules';
import type { Card, Character, FamilyId, Player, SlotKey } from '../../engine/types';
import { CardView } from '../components/CardView';
import { DragGhost } from '../components/DragGhost';
import { PlayerMat } from '../components/PlayerMat';
import { ProblemCard } from '../components/ProblemCard';
import { RoundFuel } from '../components/RoundFuel';
import { useCardDrag } from '../components/useCardDrag';
import { Alert } from '../controls/Alert';
import { Button } from '../controls/Button';
import type { Game } from '../useGame';

interface MissionScreenProps {
  game: Game;
  text?: UiText;
  characters?: Character[];
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
}: MissionScreenProps) {
  const { state, dispatch, rejection, dismissRejection } = game;
  const [selected, setSelected] = useState<{ card: Card; fromMat: boolean } | null>(null);
  const [handRevealed, setHandRevealed] = useState(false);
  const { drag, dragHandlers, dropTargetProps, registerDrop } = useCardDrag<{
    card: Card;
    fromMat: boolean;
  }>();

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

  const characterOf = (characterId: string) => characters.find((c) => c.id === characterId);

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

  const endTurnAction = (type: 'PASS' | 'SWAP_HAND') => {
    dispatch({ type, playerId: activePlayer.id });
    setSelected(null);
  };

  const canPlay = (card: Card, slotKey: SlotKey, family: FamilyId) =>
    cardFitsSlot(card, slotKey, family);

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
    <main className="eter-fade-in relative mx-auto max-w-7xl px-4 py-6">
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
        <div className="relative mb-4">
          <Alert tone="danger" onDismiss={dismissRejection}>
            {rejection}
          </Alert>
        </div>
      )}

      {/* ── Stół ──────────────────────────────────────────────────────── */}
      <div className="relative">
        {top && <div className="mx-auto mb-3 max-w-md">{renderMat(top)}</div>}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,15rem)_1fr_minmax(0,15rem)]">
          <div className="order-2 xl:order-1 xl:self-center">{renderMat(left)}</div>

          <div className="order-1 space-y-4 xl:order-2">
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
          />

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="eter-label">Karty na ręce</span>
              <Button
                size="sm"
                icon={handRevealed ? 'eyeOff' : 'eyeOn'}
                onClick={() => setHandRevealed((v) => !v)}
              >
                {handRevealed ? 'Zakryj karty' : 'Pokaż moje karty'}
              </Button>
            </div>

            {handRevealed ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activePlayer.hand.map((card, index) => (
                    <CardView
                      key={card.id}
                      card={card}
                      dealIndex={index}
                      selected={selected?.card.id === card.id && !selected.fromMat}
                      onClick={() => setSelected({ card, fromMat: false })}
                      dragHandlers={dragHandlers({
                        data: { card, fromMat: false },
                        label: card.name,
                      })}
                      beingDragged={drag?.payload.data.card.id === card.id}
                    />
                  ))}
                </div>

                {selected ? (
                  <p className="eter-rise mt-3 text-sm text-accent">
                    Wybrano: {selected.card.name}. {text.missionSelectedHint}
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-ink-dim">
                    Przeciągnij kartę na pasującą ściankę albo kliknij ją i wybierz ściankę.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-dim">
                {text.missionHandHidden} {activePlayer.name}.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3 border-t border-edge pt-4">
              <Button onClick={() => endTurnAction('PASS')}>Pasuję</Button>
              <Button icon="undo" onClick={() => endTurnAction('SWAP_HAND')}>
                Wymieniam wszystkie karty
              </Button>
            </div>
          </div>
        </div>
      </section>

      {drag && (
        <DragGhost
          card={drag.payload.data.card}
          x={drag.x}
          y={drag.y}
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
