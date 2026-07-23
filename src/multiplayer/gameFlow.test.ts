import { describe, it, expect } from 'vitest';
import { createGame, reduce, DEFAULT_CONFIG } from '../engine/reducer';
import { cardFitsSlot } from '../engine/rules';
import { ALL_CARDS, buildDeck } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';
import { hydrateState } from './hydrate';
import type { Action, GameState } from '../engine/types';

/**
 * Integracja MP od startu do podsumowania, z okrajaniem RTDB w KAŻDYM kroku.
 *
 * Gra online przechodzi przez bazę po każdym ruchu, a RTDB gubi puste tablice
 * i null-e. Testy jednostkowe silnika grają na stanie lokalnym, więc nie
 * łapały tego, co psuło grę we dwoje: świeży stan wracał z bazy okrojony i
 * pierwsza operacja go czytająca się wywracała. Ten test symuluje pełną pętlę
 * sieciową: reduce → strip (jak RTDB) → hydrate → reduce, przez całą misję aż
 * do podsumowania, gdzie OBAJ gracze muszą móc zabrać kartę.
 */

/** Usuwa puste tablice, puste obiekty i null-e — dokładnie jak RTDB. */
function stripLikeRtdb<T>(value: T): T {
  if (value === null) return undefined as unknown as T;
  if (Array.isArray(value)) {
    const mapped = value.map(stripLikeRtdb);
    return (mapped.length === 0 ? undefined : mapped) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const s = stripLikeRtdb(v);
      if (s !== undefined) out[k] = s;
    }
    return out as unknown as T;
  }
  return value;
}

/** Jeden przelot przez sieć: policz ruch, przepuść stan przez RTDB, odtwórz. */
function throughNetwork(state: GameState, action: Action): GameState {
  const next = reduce(state, action);
  if (next.rejected) throw new Error(`ruch odrzucony: ${next.rejected}`);
  // Zapis do bazy + odczyt = utrata pustych pól, potem dopełnienie.
  return hydrateState(stripLikeRtdb(next.state));
}

describe('MP: pełna misja przez pętlę sieciową', () => {
  it('start, gra do podsumowania, obaj gracze zabierają kartę', () => {
    const players = [
      { id: 'a', name: 'Ala', characterId: 'ch-odkrywca' },
      { id: 'b', name: 'Bartek', characterId: 'ch-odkrywca' },
    ];

    // Start jak w Multiplayer.start(): createGame + START_MISSION, potem przez sieć.
    let state = hydrateState(
      stripLikeRtdb(
        reduce(
          createGame({
            players,
            deck: buildDeck(ALL_CARDS),
            problems: ALL_PROBLEMS,
            seed: 123,
            config: DEFAULT_CONFIG,
          }),
          { type: 'START_MISSION' },
        ).state,
      ),
    );

    expect(state.phase, 'gra rusza z odkrytą misją').toBe('mission');
    expect(state.mission).not.toBeNull();

    // Graj rozsądnie aż do podsumowania: aktywny gracz zagrywa pasującą kartę
    // albo pasuje. Każdy ruch przechodzi przez sieć.
    let guard = 0;
    while (state.phase === 'mission' && guard < 300) {
      guard += 1;
      const active = state.players[state.activePlayerIndex];
      const mission = state.mission!;

      let move: Action | null = null;
      for (const problem of mission.problems) {
        for (const slot of problem.slots) {
          const filled = mission.played.some(
            (p) => p.problemId === problem.id && p.slotKey === slot.key,
          );
          if (filled) continue;
          const card = active.hand.find((c) => cardFitsSlot(c, slot.key, slot.family));
          if (card) {
            move = {
              type: 'PLAY_CARD',
              playerId: active.id,
              cardId: card.id,
              slotKey: slot.key,
              problemId: problem.id,
              fromMat: false,
            };
            break;
          }
        }
        if (move) break;
      }

      state = throughNetwork(state, move ?? { type: 'PASS', playerId: active.id });
    }

    expect(state.phase, 'misja dobiega podsumowania').toBe('missionSummary');

    // Podsumowanie: KAŻDY gracz zabiera własną kartę — to była ścieżka, na
    // której gracze utykali online. Tu sprawdzamy, że przechodzi dla obu.
    for (const player of state.players) {
      const own = state.mission!.played.find(
        (p) =>
          p.playerId === player.id &&
          p.card.category !== 'eter11' &&
          p.card.category !== 'blackswan' &&
          !state.mission!.sharedCardIds.includes(p.card.id),
      );
      if (!own) continue;
      const before = state.players.find((p) => p.id === player.id)!.mat.length;
      state = throughNetwork(state, {
        type: 'TAKE_CARD_TO_MAT',
        playerId: player.id,
        cardId: own.card.id,
      });
      const after = state.players.find((p) => p.id === player.id)!.mat.length;
      expect(after, `${player.name} zabrał kartę na matę`).toBe(before + 1);
    }

    // Zamknięcie podsumowania też przez sieć — stan zostaje spójny.
    state = throughNetwork(state, { type: 'END_MISSION_SUMMARY' });
    expect(['setup', 'finale']).toContain(state.phase);
  });
});
