import type { GameState, MissionState, Player } from '../engine/types';
import type { Room, RoomPlayer } from './types';

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
 * Odrzuca wpisy-widma graczy.
 *
 * `kickPlayer` kasuje węzeł gracza, ale jego obietnica
 * `onDisconnect(.../online).set(false)` bywa wciąż uzbrojona na łączu wyrzuconego.
 * Gdy ten zamknie kartę, serwer zapisuje `players/<uid>/online = false` i odtwarza
 * NIEPEŁNY wpis `{ online: false }` — bez `uid`, `name`, `characterId`, `joinedAt`.
 * Taki widmowy gracz psuł kolejność tur (`joinedAt` = undefined → NaN w sortowaniu
 * `playersInOrder`), listę w poczekalni (Avatar bez imienia) i start partii
 * (`Multiplayer.start` budował gracza o `id: undefined`). Wpis bez `uid` nie jest
 * graczem — pomijamy go już na wejściu z sieci.
 */
function realPlayers(
  players: Record<string, RoomPlayer> | undefined | null,
): Record<string, RoomPlayer> {
  if (!players) return {};
  const out: Record<string, RoomPlayer> = {};
  for (const [key, player] of Object.entries(players)) {
    if (player && typeof player.uid === 'string' && player.uid.length > 0) {
      out[key] = player;
    }
  }
  return out;
}

/**
 * Dopełnia cały pokój: stan gry, listę reakcji i mapę graczy.
 *
 * `reactions` i `players` też bywają wycięte przez RTDB, gdy puste — a widok
 * i tak po nich iteruje. Wpisy-widma (patrz `realPlayers`) odsiewamy tutaj.
 */
export function hydrateRoom(room: Room): Room {
  return {
    ...room,
    players: realPlayers(room.players),
    reactions: arr(room.reactions),
    // RTDB usuwa też pola o wartości null — kontrakt typu mówi `| null`, więc
    // przywracamy je, żeby reszta kodu nie musiała odróżniać braku od null.
    offer: room.offer ?? null,
    lastAction: room.lastAction ?? null,
    state: room.state ? hydrateState(room.state) : null,
  };
}
