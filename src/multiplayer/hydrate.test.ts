import { describe, it, expect } from 'vitest';
import { createGame, reduce, DEFAULT_CONFIG } from '../engine/reducer';
import { ALL_CARDS } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';
import { hydrateState, hydrateRoom } from './hydrate';
import { playersInOrder } from './room';
import type { GameState } from '../engine/types';
import type { Room } from './types';

/**
 * RTDB gubi puste tablice i obiekty. `hydrateState`/`hydrateRoom` dokładają je
 * z powrotem, żeby widok i silnik mogły zakładać ich obecność.
 *
 * Regresja: start partii we dwóch wysypywał grę „Cannot read properties of
 * undefined (reading 'some')", bo świeża misja ma osiem pustych tablic, a
 * RTDB je wycinała.
 */

/**
 * Symuluje przejście stanu przez RTDB: usuwa puste tablice, puste obiekty
 * ORAZ pola o wartości null — tak jak robi to Realtime Database.
 */
function stripEmpty<T>(value: T): T {
  if (value === null) return undefined as unknown as T;
  if (Array.isArray(value)) {
    const mapped = value.map(stripEmpty);
    return (mapped.length === 0 ? undefined : mapped) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const stripped = stripEmpty(v);
      if (stripped !== undefined) out[k] = stripped;
    }
    return (Object.keys(out).length === 0 ? undefined : out) as unknown as T;
  }
  return value;
}

/** Świeżo rozpoczęta partia (faza mission, misja odkryta) — jak w OnlineGame. */
function startedGame(): GameState {
  const fresh = createGame({
    players: [
      { id: 'a', name: 'Ala', characterId: 'ch-odkrywca' },
      { id: 'b', name: 'Bartek', characterId: 'ch-odkrywca' },
    ],
    deck: ALL_CARDS,
    problems: ALL_PROBLEMS,
    seed: 7,
    config: DEFAULT_CONFIG,
  });
  return reduce(fresh, { type: 'START_MISSION' }).state;
}

describe('hydrateState — stan po RTDB', () => {
  it('okrojony stan traci puste tablice (odtworzenie buga)', () => {
    const stripped = stripEmpty(startedGame()) as GameState;
    // To jest dokładnie stan, który wysypywał grę: `played` zniknęło.
    expect(stripped.mission!.played).toBeUndefined();
  });

  it('dokłada z powrotem wszystkie puste tablice misji', () => {
    const stripped = stripEmpty(startedGame()) as GameState;
    const hydrated = hydrateState(stripped);

    for (const key of [
      'played', 'matUsedBy', 'activeBlackSwans', 'slotsFilledBeforeDoubling',
      'takenToMat', 'sharedCardIds', 'swappedThisRound', 'pendingSwanEvents',
    ] as const) {
      expect(Array.isArray(hydrated.mission![key]), `mission.${key}`).toBe(true);
    }
    // Wywołanie, które wcześniej rzucało, teraz przechodzi.
    expect(() => hydrated.mission!.played.some(() => true)).not.toThrow();
  });

  it('dokłada tablice gracza (ręka, mata) i pola stanu', () => {
    const stripped = stripEmpty(startedGame()) as GameState;
    const hydrated = hydrateState(stripped);

    for (const player of hydrated.players) {
      expect(Array.isArray(player.mat)).toBe(true);
      expect(Array.isArray(player.receivedCardIds)).toBe(true);
      expect(Array.isArray(player.experience)).toBe(true);
    }
    expect(Array.isArray(hydrated.log)).toBe(true);
    expect(typeof hydrated.unsolvedSince).toBe('object');
  });

  it('reduktor przyjmuje uzupełniony stan bez błędu', () => {
    const stripped = stripEmpty(startedGame()) as GameState;
    const hydrated = hydrateState(stripped);
    // Pas gracza — ruch, który czyta wiele tablic misji.
    const result = reduce(hydrated, { type: 'PASS', playerId: 'a' });
    expect(result.rejected).toBeUndefined();
  });

  it('hydrateRoom uzupełnia stan i reakcje pokoju', () => {
    const room = stripEmpty({
      code: 'ABCD',
      phase: 'playing',
      hostUid: 'a',
      players: { a: { uid: 'a', name: 'Ala', characterId: 'ch-odkrywca', online: true, ready: false, joinedAt: 1 } },
      state: startedGame(),
      lastAction: null,
      turnStartedAt: 0,
      reactions: [],
      offer: null,
      createdAt: 0,
    }) as unknown as Room;

    const hydrated = hydrateRoom(room);
    expect(Array.isArray(hydrated.reactions)).toBe(true);
    expect(Array.isArray(hydrated.state!.mission!.played)).toBe(true);
  });

  it('odrzuca wpis-widmo gracza po kicku (onDisconnect odtworzył {online:false})', () => {
    // `kickPlayer` kasuje węzeł gracza, ale jego obietnica
    // `onDisconnect(.../online).set(false)` bywa wciąż uzbrojona. Gdy wyrzucony
    // zamknie kartę, serwer zapisuje `players/<uid>/online = false` i odtwarza
    // NIEPEŁNY wpis — bez uid/name/characterId/joinedAt. Taki widmowy gracz psuł
    // kolejność tur (joinedAt = undefined → NaN w sortowaniu), listę w poczekalni
    // (Avatar bez imienia) i start partii (gracz o `id: undefined`).
    const room = {
      code: 'ABCD',
      phase: 'lobby',
      hostUid: 'a',
      players: {
        a: { uid: 'a', name: 'Ala', characterId: 'ch-odkrywca', online: true, ready: false, joinedAt: 1 },
        // Widmo: onDisconnect wyrzuconego dopisał sam `online`, bez reszty pól.
        b: { online: false },
        c: { uid: 'c', name: 'Cezary', characterId: 'ch-lekarz', online: true, ready: false, joinedAt: 2 },
      },
      state: null,
      lastAction: null,
      turnStartedAt: 0,
      reactions: [],
      offer: null,
      createdAt: 0,
    } as unknown as Room;

    const hydrated = hydrateRoom(room);

    // Widmo wypada — zostają tylko prawdziwi gracze.
    expect(Object.keys(hydrated.players).sort()).toEqual(['a', 'c']);
    // Kolejność tur bez NaN: prawdziwi gracze po joinedAt, bez widma w środku.
    expect(playersInOrder(hydrated).map((p) => p.uid)).toEqual(['a', 'c']);
  });

  it('przywraca offer i lastAction jako null, gdy RTDB je wycięła', () => {
    // RTDB usuwa pola o wartości null. Kontrakt typu mówi `| null`, więc muszą
    // wrócić jako null, nie undefined.
    const room = stripEmpty({
      code: 'ABCD',
      phase: 'playing',
      hostUid: 'a',
      players: { a: { uid: 'a', name: 'Ala', characterId: 'ch-odkrywca', online: true, ready: false, joinedAt: 1 } },
      state: startedGame(),
      lastAction: null,
      turnStartedAt: 0,
      reactions: [],
      offer: null,
      createdAt: 0,
    }) as unknown as Room;

    // Po stripie oba pola faktycznie znikają.
    expect((room as { offer?: unknown }).offer).toBeUndefined();

    const hydrated = hydrateRoom(room);
    expect(hydrated.offer).toBeNull();
    expect(hydrated.lastAction).toBeNull();
  });
});
