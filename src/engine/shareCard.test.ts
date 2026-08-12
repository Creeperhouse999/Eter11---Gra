import { describe, expect, it } from 'vitest';
import { createGame, reduce, DEFAULT_CONFIG } from './reducer';
import { ALL_CARDS } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';
import type { GameState } from './types';

/**
 * Przekazanie karty innemu graczowi po misji.
 *
 * Karta zagrana przy problemie może po wygranej trafić na kartę postaci —
 * własną albo cudzą. To jedyny moment, w którym karta zmienia właściciela,
 * i jedyne miejsce, gdzie łatwo ją zgubić albo policzyć dwa razy.
 */

/** Rozdanie dwóch graczy na prawdziwej talii. */
function newGame(seed = 1): GameState {
  return createGame({
    players: [
      { id: 'p1', name: 'Ala', characterId: 'strateg' },
      { id: 'p2', name: 'Bartek', characterId: 'medyk' },
    ],
    deck: ALL_CARDS,
    problems: ALL_PROBLEMS,
    config: DEFAULT_CONFIG,
    seed,
  });
}

/** Wszystkie identyfikatory kart w grze, w każdym miejscu, gdzie mogą leżeć. */
function allCardIds(state: GameState): string[] {
  const ids: string[] = [];
  for (const player of state.players) {
    player.hand.forEach((c) => ids.push(c.id));
    player.mat.forEach((c) => ids.push(c.id));
  }
  state.drawPile.forEach((c) => ids.push(c.id));
  state.discardPile.forEach((c) => ids.push(c.id));
  state.mission?.played.forEach((p) => ids.push(p.card.id));
  return ids;
}

/**
 * Doprowadza grę do podsumowania z co najmniej jedną kartą zagraną przez p1.
 * Zwraca null, gdy przy tym ziarnie nie da się nic zagrać.
 */
function playUntilSummary(seed: number): GameState | null {
  let state = reduce(newGame(seed), { type: 'START_MISSION' }).state;

  for (let guard = 0; guard < 200; guard += 1) {
    const mission = state.mission;
    if (!mission) return null;
    if (state.phase === 'missionSummary') {
      return mission.played.some((p) => p.playerId === 'p1') ? state : null;
    }

    const active = state.players[state.activePlayerIndex];
    let moved = false;

    for (const card of active.hand) {
      for (const problem of mission.problems) {
        for (const slot of problem.slots) {
          const next = reduce(state, {
            type: 'PLAY_CARD',
            playerId: active.id,
            cardId: card.id,
            problemId: problem.id,
            slotKey: slot.key,
            fromMat: false,
          });
          if (!next.rejected) {
            state = next.state;
            moved = true;
            break;
          }
        }
        if (moved) break;
      }
      if (moved) break;
    }

    if (!moved) state = reduce(state, { type: 'PASS', playerId: active.id }).state;
  }

  return null;
}

describe('przekazanie karty', () => {
  it('nie zostawia karty w dwóch miejscach naraz', () => {
    // Kilka ziaren: przy jednym misja może skończyć się bez zagranych kart.
    for (let seed = 1; seed <= 12; seed += 1) {
      const state = playUntilSummary(seed);
      if (!state?.mission) continue;

      const play = state.mission.played.find((p) => p.playerId === 'p1');
      if (!play) continue;

      const result = reduce(state, {
        type: 'SHARE_CARD',
        fromPlayerId: 'p1',
        toPlayerId: 'p2',
        cardId: play.card.id,
      });
      if (result.rejected) continue;

      const ids = allCardIds(result.state);
      const duplicates = ids.filter((id) => id === play.card.id);

      expect(duplicates).toHaveLength(1);
      return;
    }

    throw new Error('Żadne ziarno nie doprowadziło do przekazania karty.');
  });

  it('nie gubi ani nie mnoży kart w całej talii', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const state = playUntilSummary(seed);
      if (!state?.mission) continue;

      const play = state.mission.played.find((p) => p.playerId === 'p1');
      if (!play) continue;

      const before = allCardIds(state).length;
      const result = reduce(state, {
        type: 'SHARE_CARD',
        fromPlayerId: 'p1',
        toPlayerId: 'p2',
        cardId: play.card.id,
      });
      if (result.rejected) continue;

      expect(allCardIds(result.state)).toHaveLength(before);
      return;
    }

    throw new Error('Żadne ziarno nie doprowadziło do przekazania karty.');
  });

  it('kładzie kartę na karcie postaci odbiorcy', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const state = playUntilSummary(seed);
      if (!state?.mission) continue;

      const play = state.mission.played.find((p) => p.playerId === 'p1');
      if (!play) continue;

      const result = reduce(state, {
        type: 'SHARE_CARD',
        fromPlayerId: 'p1',
        toPlayerId: 'p2',
        cardId: play.card.id,
      });
      if (result.rejected) continue;

      const receiver = result.state.players.find((p) => p.id === 'p2')!;
      expect(receiver.mat.map((c) => c.id)).toContain(play.card.id);
      return;
    }

    throw new Error('Żadne ziarno nie doprowadziło do przekazania karty.');
  });

  /**
   * Karta pożyczona z własnej karty postaci wraca do właściciela, nie idzie
   * dalej. Zabezpieczenie „karta leży już na czyjejś macie" jej nie łapało:
   * zagranie z maty najpierw z tej maty ją ZDEJMUJE, więc w chwili
   * przekazywania nie leżała nigdzie i warunek przechodził. Gracz oddawał
   * wtedy trwale kompetencję uzbieraną w poprzednich misjach, a odbiorca
   * dostawał kartę, której w tej misji wcale nie zdobył.
   */
  it('nie przekazuje karty zagranej z własnej karty postaci', () => {
    const base = newGame(1);
    const mission = reduce(base, { type: 'START_MISSION' }).state;
    // Musi być kompetencja: mentor/talent odpada wcześniej z innego powodu,
    // a wtedy test przechodziłby, nie sprawdzając tego, o co w nim chodzi.
    const card = ALL_CARDS.find((c) =>
      ['psychological', 'digital', 'social'].includes(c.category),
    )!;

    // Stan jak po zagraniu karty Z MATY: nie ma jej już na macie, leży
    // w `played` ze znacznikiem `fromMat`.
    const state: GameState = {
      ...mission,
      phase: 'missionSummary',
      mission: {
        ...mission.mission!,
        phase: 'won',
        played: [
          {
            card,
            playerId: 'p1',
            slotKey: mission.mission!.problems[0].slots[0].key,
            problemId: mission.mission!.problems[0].id,
            fromMat: true,
          },
        ],
      },
    };

    const result = reduce(state, {
      type: 'SHARE_CARD',
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      cardId: card.id,
    });

    expect(result.rejected).toBeTruthy();
    const receiver = result.state.players.find((p) => p.id === 'p2')!;
    expect(receiver.mat.map((c) => c.id)).not.toContain(card.id);
  });
});
