import type { GameState, MissionState, Player } from '../engine/types';
import type { Room } from './types';

/**
 * Uzupełnienie stanu gry po drodze przez Realtime Database.
 *
 * RTDB NIE przechowuje pustych tablic ani pustych obiektów — po prostu
 * usuwa taki klucz. Świeżo rozpoczęta misja ma osiem pustych tablic
 * (`played`, `takenToMat`, `activeBlackSwans`…), więc po zapisie i odczycie
 * wracają jako `undefined`. Pierwsze `mission.played.some(...)` czy
 * `player.hand.some(...)` w widoku wysypywało wtedy całą grę:
 * „Cannot read properties of undefined (reading 'some')" — dokładnie to
 * zgłosił gracz przy starcie partii we dwóch (u jednego gracza stan jest
 * lokalny i tablice zostają, u drugiego przychodzi z bazy okrojony).
 *
 * Tu dokładamy z powrotem każdą tablicę i obiekt, których silnik oczekuje,
 * żeby reszta kodu mogła zakładać ich obecność jak przy grze przy stole.
 */

/** Zwraca tablicę, jeśli jest; inaczej pustą — RTDB gubi puste. */
function arr<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function hydratePlayer(player: Player): Player {
  return {
    ...player,
    hand: arr(player.hand),
    mat: arr(player.mat),
    receivedCardIds: arr(player.receivedCardIds),
    experience: arr(player.experience),
    sharedCount: player.sharedCount ?? 0,
  };
}

function hydrateMission(mission: MissionState): MissionState {
  return {
    ...mission,
    problems: arr(mission.problems),
    played: arr(mission.played),
    matUsedBy: arr(mission.matUsedBy),
    activeBlackSwans: arr(mission.activeBlackSwans),
    slotsFilledBeforeDoubling: arr(mission.slotsFilledBeforeDoubling),
    takenToMat: arr(mission.takenToMat),
    sharedCardIds: arr(mission.sharedCardIds),
    swappedThisRound: arr(mission.swappedThisRound),
    pendingSwanEvents: arr(mission.pendingSwanEvents),
  };
}

/** Dopełnia stan gry z RTDB brakującymi (pustymi) tablicami i obiektami. */
export function hydrateState(state: GameState): GameState {
  return {
    ...state,
    players: arr(state.players).map(hydratePlayer),
    drawPile: arr(state.drawPile),
    discardPile: arr(state.discardPile),
    problemPile: arr(state.problemPile),
    solvedProblems: arr(state.solvedProblems),
    unsolvedProblems: arr(state.unsolvedProblems),
    log: arr(state.log),
    // Record też znika, gdy pusty — kod czyta go jako mapę, więc musi istnieć.
    unsolvedSince: state.unsolvedSince ?? {},
    mission: state.mission ? hydrateMission(state.mission) : null,
  };
}

/**
 * Dopełnia cały pokój: stan gry, listę reakcji i mapę graczy.
 *
 * `reactions` i `players` też bywają wycięte przez RTDB, gdy puste — a widok
 * i tak po nich iteruje.
 */
export function hydrateRoom(room: Room): Room {
  return {
    ...room,
    players: room.players ?? {},
    reactions: arr(room.reactions),
    // RTDB usuwa też pola o wartości null — kontrakt typu mówi `| null`, więc
    // przywracamy je, żeby reszta kodu nie musiała odróżniać braku od null.
    offer: room.offer ?? null,
    lastAction: room.lastAction ?? null,
    state: room.state ? hydrateState(room.state) : null,
  };
}
