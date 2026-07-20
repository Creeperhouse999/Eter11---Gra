import { draw, shuffle } from './deck';
import { cardFitsSlot, isMissionSolved, isSlotFilled } from './rules';
import type {
  Action,
  Card,
  GameState,
  MissionState,
  Player,
  Problem,
  ReducerResult,
  RulesConfig,
} from './types';

export const DEFAULT_CONFIG: RulesConfig = {
  roundsPerMission: 7,
  handSize: 5,
  missionsPerGame: 7,
  teamWinThreshold: 5,
  maxMatCardsPerMission: 1,
  pointsPerExperience: 1,
  pointsPerFulfillment: 2,
};

export interface CreateGameInput {
  players: { id: string; name: string; characterId: string }[];
  deck: Card[];
  problems: Problem[];
  seed: number;
  config: RulesConfig;
}

export function createGame(input: CreateGameInput): GameState {
  const [shuffledDeck, seedAfterDeck] = shuffle(input.deck, input.seed);
  const [shuffledProblems, seedAfterProblems] = shuffle(input.problems, seedAfterDeck);

  let pile = shuffledDeck;
  let discard: Card[] = [];
  let seed = seedAfterProblems;
  const players: Player[] = [];

  for (const p of input.players) {
    const result = draw(pile, discard, input.config.handSize, seed);
    pile = result.pile;
    discard = result.discard;
    seed = result.seed;
    players.push({
      id: p.id,
      name: p.name,
      characterId: p.characterId,
      hand: result.drawn,
      mat: [],
      receivedCardIds: [],
      sharedCount: 0,
      experience: [],
    });
  }

  return {
    rng: seed,
    config: input.config,
    players,
    activePlayerIndex: 0,
    drawPile: pile,
    discardPile: discard,
    problemPile: shuffledProblems,
    solvedProblems: [],
    unsolvedProblems: [],
    unsolvedSince: {},
    mission: null,
    missionNumber: 0,
    phase: 'setup',
    log: [],
  };
}

/** Odrzucenie ruchu — stan bez zmian, powód dla UI. */
function reject(state: GameState, reason: string): ReducerResult {
  return { state, rejected: reason };
}

/** Czy to kolej tego gracza. */
function isActivePlayer(state: GameState, playerId: string): boolean {
  return state.players[state.activePlayerIndex]?.id === playerId;
}

function updatePlayer(
  state: GameState,
  playerId: string,
  update: (player: Player) => Player,
): Player[] {
  return state.players.map((p) => (p.id === playerId ? update(p) : p));
}

function startMission(state: GameState): ReducerResult {
  if (state.mission && state.mission.phase === 'playing') {
    return reject(state, 'Misja już trwa.');
  }
  if (state.problemPile.length === 0) {
    return reject(state, 'Brak problemów w talii.');
  }

  const [problem, ...rest] = state.problemPile;
  const mission: MissionState = {
    problems: [problem],
    played: [],
    round: 1,
    phase: 'playing',
    matUsedBy: [],
    activeBlackSwans: [],
    slotsFilledBeforeDoubling: [],
    takenToMat: [],
    sharedCardIds: [],
  };

  return {
    state: {
      ...state,
      problemPile: rest,
      mission,
      missionNumber: state.missionNumber + 1,
      activePlayerIndex: 0,
      phase: 'mission',
      log: [...state.log, `Misja ${state.missionNumber + 1}: ${problem.name}`],
    },
  };
}

/**
 * Kończy ruch gracza. Gdy ruch wykonał ostatni gracz w kolejce, zamyka rundę:
 * sprawdza rozwiązanie misji, przy braku rozwiązania rozdaje po karcie
 * i zwiększa licznik rund. Po wyczerpaniu limitu rund misja jest przegrana.
 */
function endTurn(state: GameState): GameState {
  const mission = state.mission!;
  const nextIndex = state.activePlayerIndex + 1;

  if (isMissionSolved(mission)) {
    return {
      ...state,
      activePlayerIndex: 0,
      mission: { ...mission, phase: 'won' },
      phase: 'missionSummary',
      log: [...state.log, 'Problem rozwiązany!'],
    };
  }

  if (nextIndex < state.players.length) {
    return { ...state, activePlayerIndex: nextIndex };
  }

  if (mission.round >= state.config.roundsPerMission) {
    return {
      ...state,
      activePlayerIndex: 0,
      mission: { ...mission, phase: 'lost' },
      phase: 'missionSummary',
      log: [...state.log, 'Runda ostatnia minęła — problem tym razem wygrał.'],
    };
  }

  // Nowa runda: każdy dobiera 1 kartę.
  let pile = state.drawPile;
  let discard = state.discardPile;
  let seed = state.rng;
  const players = state.players.map((player) => {
    const result = draw(pile, discard, 1, seed);
    pile = result.pile;
    discard = result.discard;
    seed = result.seed;
    return { ...player, hand: [...player.hand, ...result.drawn] };
  });

  return {
    ...state,
    players,
    drawPile: pile,
    discardPile: discard,
    rng: seed,
    activePlayerIndex: 0,
    mission: { ...mission, round: mission.round + 1 },
  };
}

function playCard(
  state: GameState,
  action: Extract<Action, { type: 'PLAY_CARD' }>,
): ReducerResult {
  const mission = state.mission;
  if (!mission || mission.phase !== 'playing') {
    return reject(state, 'Misja nie trwa.');
  }
  if (!isActivePlayer(state, action.playerId)) {
    return reject(state, 'To nie Twoja kolej.');
  }

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return reject(state, 'Nieznany gracz.');

  const source = action.fromMat ? player.mat : player.hand;
  const card = source.find((c) => c.id === action.cardId);
  if (!card) return reject(state, 'Nie masz tej karty.');

  if (action.fromMat) {
    const used = mission.matUsedBy.filter((id) => id === action.playerId).length;
    if (used >= state.config.maxMatCardsPerMission) {
      return reject(state, 'W tej misji użyłeś już karty ze swojej postaci.');
    }
  }

  const problem = mission.problems.find((p) => p.id === action.problemId);
  if (!problem) return reject(state, 'Nieznany problem.');
  if (!problem.slots.some((s) => s.key === action.slotKey)) {
    return reject(state, 'Ten problem nie ma takiego slotu.');
  }
  if (!cardFitsSlot(card, action.slotKey)) {
    return reject(state, 'Ta karta nie pasuje do tego slotu.');
  }
  if (isSlotFilled(mission, action.problemId, action.slotKey)) {
    return reject(state, 'Ten slot jest już zapełniony.');
  }

  const players = updatePlayer(state, action.playerId, (p) =>
    action.fromMat
      ? { ...p, mat: p.mat.filter((c) => c.id !== action.cardId) }
      : { ...p, hand: p.hand.filter((c) => c.id !== action.cardId) },
  );

  const nextMission: MissionState = {
    ...mission,
    played: [
      ...mission.played,
      {
        card,
        playerId: action.playerId,
        slotKey: action.slotKey,
        problemId: action.problemId,
        fromMat: action.fromMat,
      },
    ],
    matUsedBy: action.fromMat
      ? [...mission.matUsedBy, action.playerId]
      : mission.matUsedBy,
  };

  return {
    state: endTurn({
      ...state,
      players,
      mission: nextMission,
      log: [...state.log, `${player.name} zagrywa: ${card.name}`],
    }),
  };
}

function pass(state: GameState, playerId: string): ReducerResult {
  if (!state.mission || state.mission.phase !== 'playing') {
    return reject(state, 'Misja nie trwa.');
  }
  if (!isActivePlayer(state, playerId)) {
    return reject(state, 'To nie Twoja kolej.');
  }
  return { state: endTurn(state) };
}

/** Wymiana całej ręki na nowe karty. Kosztuje ruch w tej rundzie. */
function swapHand(state: GameState, playerId: string): ReducerResult {
  if (!state.mission || state.mission.phase !== 'playing') {
    return reject(state, 'Misja nie trwa.');
  }
  if (!isActivePlayer(state, playerId)) {
    return reject(state, 'To nie Twoja kolej.');
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return reject(state, 'Nieznany gracz.');

  const discardWithOldHand = [...state.discardPile, ...player.hand];
  const result = draw(
    state.drawPile,
    discardWithOldHand,
    state.config.handSize,
    state.rng,
  );

  return {
    state: endTurn({
      ...state,
      players: updatePlayer(state, playerId, (p) => ({ ...p, hand: result.drawn })),
      drawPile: result.pile,
      discardPile: result.discard,
      rng: result.seed,
      log: [...state.log, `${player.name} wymienia karty.`],
    }),
  };
}

export function reduce(state: GameState, action: Action): ReducerResult {
  switch (action.type) {
    case 'START_MISSION':
      return startMission(state);
    case 'PLAY_CARD':
      return playCard(state, action);
    case 'PASS':
      return pass(state, action.playerId);
    case 'SWAP_HAND':
      return swapHand(state, action.playerId);
    default:
      return reject(state, `Nieobsługiwana akcja: ${(action as Action).type}`);
  }
}
