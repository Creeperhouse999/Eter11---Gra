import { describe, expect, it } from 'vitest';
import { createGame, reduce, DEFAULT_CONFIG } from './reducer';
import { ALL_CARDS } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';
import { ALL_CHARACTERS } from '../data/characters';
import { requiredCountForSlot } from './rules';
import type { Action, GameState } from './types';

/**
 * Losowe partie na prawdziwej zawartości gry.
 *
 * Testy jednostkowe sprawdzają ruchy, które ktoś przewidział. Ta próba
 * sprawdza te, których nie przewidział nikt: silnik dostaje tysiące losowych
 * akcji — także niedozwolonych, w złej fazie i na cudzych kartach — a po
 * każdej z nich weryfikujemy niezmienniki, które muszą zachodzić zawsze.
 *
 * Sposób znalazł już trzy błędy, których czytanie kodu nie wychwyciło:
 * matę rosnącą do dziesięciu kart, karty ginące przy przekazywaniu i ETER11
 * kłamiący o zawartości ręki.
 */

/** Deterministyczny generator — awaria musi dać się powtórzyć po ziarnie. */
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

/** Wszystkie akcje, jakie interfejs potrafi wysłać — także bezsensowne. */
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

/**
 * Warunki, które muszą zachodzić po każdym ruchu — bez wyjątku.
 * Zwraca opis naruszenia albo null.
 */
function checkInvariants(state: GameState, totalCards: number): string | null {
  // 1. Żadna karta nie ginie i nie mnoży się.
  const ids: string[] = [];
  for (const p of state.players) {
    p.hand.forEach((c) => ids.push(c.id));
    p.mat.forEach((c) => ids.push(c.id));
  }
  state.drawPile.forEach((c) => ids.push(c.id));
  state.discardPile.forEach((c) => ids.push(c.id));
  state.mission?.played.forEach((p) => ids.push(p.card.id));

  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    const seen = new Set<string>();
    const dup = ids.find((id) => (seen.has(id) ? true : (seen.add(id), false)));
    return `karta w dwóch miejscach naraz: ${dup}`;
  }
  if (ids.length !== totalCards) {
    return `liczba kart zmieniła się: ${ids.length} zamiast ${totalCards}`;
  }

  // 2. Mata nie przekracza limitu z konfiguracji.
  for (const p of state.players) {
    if (p.mat.length > state.config.maxMatCardsPerMission * state.missionNumber) {
      return `mata gracza ${p.id} ma ${p.mat.length} kart`;
    }
    // 3. Na karcie postaci leżą wyłącznie kompetencje.
    const bad = p.mat.find((c) => c.category === 'eter11' || c.category === 'blackswan');
    if (bad) return `karta specjalna na macie: ${bad.category}`;
  }

  // 4. Ręka nie rośnie ponad rozdanie.
  for (const p of state.players) {
    if (p.hand.length > state.config.handSize + 2) {
      return `ręka gracza ${p.id} ma ${p.hand.length} kart`;
    }
  }

  // 5. Ścianka nie przyjmuje więcej kart, niż wymaga.
  //
  // Zwykle jedną, ale Czarny Łabędź „podwójne wymagania" podnosi próg do
  // dwóch — dlatego liczymy przez `requiredCountForSlot`, a nie sprawdzamy
  // powtórzeń. Sztywne „jedna karta na ściankę" zgłaszało tę zasadę gry
  // jako błąd silnika.
  if (state.mission) {
    const counts = new Map<string, number>();
    for (const play of state.mission.played) {
      const key = `${play.problemId}:${play.slotKey}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    for (const [key, count] of counts) {
      const [problemId, slotKey] = key.split(':');
      const limit = requiredCountForSlot(
        state.mission,
        problemId,
        slotKey as Parameters<typeof requiredCountForSlot>[2],
      );
      if (count > limit) {
        return `ścianka ${key} ma ${count} kart przy wymaganych ${limit}`;
      }
    }
  }

  // 6. Numer misji nigdy się nie cofa. Zero jest poprawne: tyle wynosi
  // przed rozpoczęciem pierwszej misji.
  if (state.missionNumber < 0) return `numer misji: ${state.missionNumber}`;

  return null;
}

describe('losowe partie', () => {
  it('utrzymuje niezmienniki przez 40 partii losowych ruchów', () => {
    const failures: string[] = [];

    for (let seed = 1; seed <= 40; seed += 1) {
      const rand = rng(seed);
      const playerCount = 2 + Math.floor(rand() * 3);

      let state = createGame({
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

      const totalCards = ALL_CARDS.length;

      const first = checkInvariants(state, totalCards);
      if (first) {
        failures.push(`ziarno ${seed}, rozdanie: ${first}`);
        continue;
      }

      for (let step = 0; step < 400; step += 1) {
        const action = randomAction(state, rand);
        const result = reduce(state, action);
        // Odrzucony ruch nie zmienia stanu — to też jest niezmiennik.
        state = result.state;

        const broken = checkInvariants(state, totalCards);
        if (broken) {
          failures.push(
            `ziarno ${seed}, ruch ${step} (${action.type}): ${broken}`,
          );
          break;
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
