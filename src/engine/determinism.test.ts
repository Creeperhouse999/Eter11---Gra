import { describe, it, expect } from 'vitest';
import { createGame, reduce, DEFAULT_CONFIG } from './reducer';
import { ALL_CARDS } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';
import { ALL_CHARACTERS } from '../data/characters';
import type { Action, GameState } from './types';

/**
 * Reduktor jest czystą funkcją (ziarno, akcje) → stan.
 *
 * To fundament trybu online: nie ma serwera, więc każdy klient liczy ruch
 * u siebie tym samym reduktorem na współdzielonym ziarnie, a do sieci idzie
 * gotowy stan i akcja. Gdyby do silnika wkradł się `Math.random()` albo
 * `Date.now()` (np. przy tasowaniu talii zamiast ziarna ze stanu), dwaj
 * gracze rozjechaliby się stanem już po pierwszym dobraniu — a przy jednym
 * stole (gra lokalna) taki błąd byłby niewidoczny, bo liczy tylko jedna
 * maszyna.
 *
 * Test przepuszcza IDENTYCZNĄ sekwencję akcji dwa razy, od tego samego
 * ziarna, i żąda bajt-w-bajt tego samego stanu po każdym ruchu. Sekwencja
 * pochodzi z tego samego deterministycznego generatora co fuzz — obejmuje
 * dobieranie, wykładanie, pas, wymianę, zabranie na matę, przekazanie,
 * Czarne Łabędzie i przejścia między misjami.
 */

/** Deterministyczny generator — ten sam co w fuzz.test, żeby sekwencja była powtarzalna. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomAction(state: GameState, rand: () => number): Action {
  const pick = <T>(list: readonly T[]): T | undefined =>
    list.length ? list[Math.floor(rand() * list.length)] : undefined;

  const mission = state.mission;
  const player = pick(state.players);
  const card = player ? pick(player.hand) : undefined;
  const problem = mission ? pick(mission.problems) : undefined;
  const slot = problem ? pick(problem.slots) : undefined;

  const roll = rand();

  if (roll < 0.45 && player && card && problem && slot) {
    return {
      type: 'PLAY_CARD',
      playerId: player.id,
      cardId: card.id,
      problemId: problem.id,
      slotKey: slot.key,
      fromMat: rand() < 0.1,
    } as Action;
  }
  if (roll < 0.6 && player) {
    return { type: 'PASS', playerId: player.id } as Action;
  }
  if (roll < 0.7 && player) {
    const give = player.hand.filter(() => rand() < 0.4).map((c) => c.id);
    return { type: 'SWAP_HAND', playerId: player.id, cardIds: give } as Action;
  }
  if (roll < 0.8 && player && card) {
    return { type: 'TAKE_CARD_TO_MAT', playerId: player.id, cardId: card.id } as Action;
  }
  if (roll < 0.88 && player && mission) {
    const played = pick(mission.played);
    const other = pick(state.players.filter((p) => p.id !== player.id));
    return {
      type: 'SHARE_CARD',
      fromPlayerId: player.id,
      toPlayerId: other?.id ?? player.id,
      cardId: played?.card.id ?? 'brak',
    } as Action;
  }
  if (roll < 0.94) {
    return { type: 'END_MISSION_SUMMARY' } as Action;
  }
  if (roll < 0.97) {
    return { type: 'DISMISS_SWAN_EVENTS' } as Action;
  }
  return { type: 'START_MISSION' } as Action;
}

function newGame(seed: number, playerCount: number): GameState {
  return createGame({
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Gracz ${i + 1}`,
      characterId: ALL_CHARACTERS[i % ALL_CHARACTERS.length].id,
    })),
    deck: ALL_CARDS,
    problems: ALL_PROBLEMS,
    config: DEFAULT_CONFIG,
    seed,
  });
}

describe('determinizm reduktora', () => {
  it('ta sama sekwencja akcji od tego samego ziarna daje identyczny stan', () => {
    for (const seed of [3, 17, 42, 101]) {
      const playerCount = 2 + (seed % 3);

      let a = newGame(seed, playerCount);
      let b = newGame(seed, playerCount);

      // To samo ziarno startowe u obu przebiegów — rozdanie musi być identyczne.
      expect(b).toEqual(a);

      const randA = rng(seed * 7 + 1);
      const randB = rng(seed * 7 + 1);

      for (let step = 0; step < 300; step += 1) {
        const actionA = randomAction(a, randA);
        const actionB = randomAction(b, randB);

        // Ten sam stan + ten sam generator ⇒ ta sama akcja. Gdyby nie —
        // rozjazd zaczyna się już w wyborze ruchu, nie w reduktorze.
        expect(actionB, `ziarno ${seed}, krok ${step}: różne akcje`).toEqual(actionA);

        a = reduce(a, actionA).state;
        b = reduce(b, actionB).state;

        expect(b, `ziarno ${seed}, krok ${step} (${actionA.type}): rozjazd stanu`).toEqual(a);
      }
    }
  });

  it('dwa różne ziarna rozdają różnie — test nie przechodzi trywialnie', () => {
    const a = newGame(1, 3);
    const b = newGame(2, 3);
    // Gdyby ziarno nie wpływało na tasowanie, powyższy test byłby bez wartości.
    expect(b.players[0].hand.map((c) => c.id)).not.toEqual(
      a.players[0].hand.map((c) => c.id),
    );
  });
});
