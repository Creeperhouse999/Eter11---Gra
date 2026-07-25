import { describe, it, expect } from 'vitest';
import { createGame, reduce, DEFAULT_CONFIG } from './reducer';
import { cardFitsSlot } from './rules';
import { ALL_CARDS, buildDeck } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';
import type { GameState } from './types';

/**
 * Karty nie giną i nie mnożą się przez całą partię.
 *
 * To najgroźniejsza klasa błędów w tej grze i już się zdarzała: wymiana przy
 * krótkiej talii kasowała oddane karty, Czarny Łabędź schodził z ręki bez
 * zastąpienia, a karta przekazana innemu graczowi potrafiła leżeć na dwóch
 * matach naraz. Pojedyncze testy łapały to dopiero po fakcie — ten liczy
 * wszystkie karty po każdym ruchu przez pełne siedem misji.
 */

/** Wszystkie karty w grze, gdziekolwiek leżą. */
function census(state: GameState): { total: number; unique: number } {
  const ids = [
    ...state.drawPile.map((c) => c.id),
    ...state.discardPile.map((c) => c.id),
    ...state.players.flatMap((p) => [
      ...p.hand.map((c) => c.id),
      ...p.mat.map((c) => c.id),
    ]),
    ...(state.mission?.played.map((p) => p.card.id) ?? []),
  ];
  return { total: ids.length, unique: new Set(ids).size };
}

/** Jeden ruch rozsądnego gracza: zagraj, wymień bezużyteczne albo spasuj. */
function takeTurn(state: GameState): GameState {
  const player = state.players[state.activePlayerIndex];
  const mission = state.mission!;

  for (const problem of mission.problems) {
    for (const slot of problem.slots) {
      const filled = mission.played.some(
        (p) => p.problemId === problem.id && p.slotKey === slot.key,
      );
      if (filled) continue;

      const card = player.hand.find((c) => cardFitsSlot(c, slot.key, slot.family));
      if (!card) continue;

      const result = reduce(state, {
        type: 'PLAY_CARD',
        playerId: player.id,
        cardId: card.id,
        slotKey: slot.key,
        problemId: problem.id,
        fromMat: false,
      });
      if (!result.rejected) return result.state;
    }
  }

  const useless = player.hand.filter(
    (card) =>
      !mission.problems.some((problem) =>
        problem.slots.some((slot) => cardFitsSlot(card, slot.key, slot.family)),
      ),
  );

  return useless.length > 0
    ? reduce(state, {
        type: 'SWAP_HAND',
        playerId: player.id,
        cardIds: useless.map((c) => c.id),
      }).state
    : reduce(state, { type: 'PASS', playerId: player.id }).state;
}

describe('bilans kart przez pełną partię', () => {
  it('liczba kart nie zmienia się po żadnym ruchu', () => {
    let state = createGame({
      players: [
        { id: 'a', name: 'A', characterId: 'ch-odkrywca' },
        { id: 'b', name: 'B', characterId: 'ch-odkrywca' },
        { id: 'c', name: 'C', characterId: 'ch-odkrywca' },
      ],
      deck: buildDeck(ALL_CARDS),
      problems: ALL_PROBLEMS,
      seed: 77,
      config: DEFAULT_CONFIG,
    });

    const start = census(state);
    expect(start.total, 'talia startowa bez duplikatów').toBe(start.unique);

    for (let mission = 0; mission < DEFAULT_CONFIG.missionsPerGame; mission += 1) {
      if (state.phase === 'finale') break;

      const started = reduce(state, { type: 'START_MISSION' });
      if (started.rejected) break;
      state = started.state;

      let guard = 0;
      while (state.phase === 'mission' && guard < 200) {
        state = takeTurn(state);
        guard += 1;

        const now = census(state);
        expect(now.total, 'suma kart w trakcie misji').toBe(start.total);
        expect(now.unique, 'karta w dwóch miejscach naraz').toBe(start.unique);
      }

      if (state.phase !== 'missionSummary') continue;

      // Każdy zabiera kartę — to tu karty najczęściej gubiły się wcześniej.
      for (const player of state.players) {
        const own = state.mission!.played.find(
          (p) =>
            p.playerId === player.id &&
            !state.mission!.sharedCardIds.includes(p.card.id) &&
            p.card.category !== 'eter11' &&
            p.card.category !== 'blackswan',
        );
        if (!own) continue;

        const result = reduce(state, {
          type: 'TAKE_CARD_TO_MAT',
          playerId: player.id,
          cardId: own.card.id,
        });
        if (!result.rejected) {
          state = result.state;
          // Karta zabrana na matę schodzi z listy zagranych — inaczej leży
          // naraz w `mat` i w `mission.played` i spis liczy ją dwa razy przez
          // całe podsumowanie. Sprawdzamy tu, a nie dopiero po zamknięciu
          // podsumowania, bo tam played jest kasowane i duplikat znika sam.
          const mid = census(state);
          expect(mid.total, 'suma kart zaraz po zabraniu na matę').toBe(start.total);
          expect(mid.unique, 'karta na macie i w played naraz').toBe(start.unique);
        }
      }

      state = reduce(state, { type: 'END_MISSION_SUMMARY' }).state;

      const afterSummary = census(state);
      expect(afterSummary.total, 'suma kart po podsumowaniu').toBe(start.total);
      expect(afterSummary.unique, 'duplikat po podsumowaniu').toBe(start.unique);
    }

    const end = census(state);
    expect(end.total).toBe(start.total);
    expect(end.unique).toBe(start.unique);
  });
});
