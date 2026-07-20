import { draw, shuffle } from './deck';
import { cardFitsSlot, isMissionSolved, isSlotFilled, slotId } from './rules';
import type {
  Action,
  BlackSwanKind,
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

/**
 * Efekt Czarnego Łabędzia. Wywoływany, gdy gracz dobierze taką kartę
 * (w fazie 1 również ręcznie z panelu testowego).
 *
 * - extraProblem: dokłada drugi problem; oba muszą paść, by misja się udała
 * - doubleRequirements: puste sloty wymagają 2 kart; zapełnione zostają zaliczone
 * - swapHands: ręce wędrują zgodnie z ruchem wskazówek zegara, maty bez zmian
 */
export function applyBlackSwan(state: GameState, kind: BlackSwanKind): GameState {
  const mission = state.mission;
  if (!mission || mission.phase !== 'playing') return state;

  if (kind === 'extraProblem') {
    if (state.problemPile.length === 0) return state;
    const [extra, ...rest] = state.problemPile;
    return {
      ...state,
      problemPile: rest,
      mission: { ...mission, problems: [...mission.problems, extra] },
      log: [...state.log, `Czarny Łabędź: dodatkowy problem — ${extra.name}!`],
    };
  }

  if (kind === 'doubleRequirements') {
    if (mission.activeBlackSwans.includes('doubleRequirements')) return state;
    const alreadyFilled = mission.problems.flatMap((problem) =>
      problem.slots
        .filter((slot) => isSlotFilled(mission, problem.id, slot.key))
        .map((slot) => slotId(problem.id, slot.key)),
    );
    return {
      ...state,
      mission: {
        ...mission,
        activeBlackSwans: [...mission.activeBlackSwans, 'doubleRequirements'],
        slotsFilledBeforeDoubling: [
          ...mission.slotsFilledBeforeDoubling,
          ...alreadyFilled,
        ],
      },
      log: [...state.log, 'Czarny Łabędź: puste sloty wymagają teraz 2 kart!'],
    };
  }

  // swapHands — ręka gracza i trafia do gracza i+1 (ostatni oddaje pierwszemu)
  const hands = state.players.map((p) => p.hand);
  const players = state.players.map((player, index) => ({
    ...player,
    hand: hands[(index - 1 + hands.length) % hands.length],
  }));

  return {
    ...state,
    players,
    mission: { ...mission, activeBlackSwans: [...mission.activeBlackSwans, 'swapHands'] },
    log: [...state.log, 'Czarny Łabędź: wymiana kart między graczami!'],
  };
}

/** Kompetencje — tylko nimi można dzielić się z innymi graczami. */
const COMPETENCE_CATEGORIES: Card['category'][] = ['psychological', 'digital', 'social'];

/**
 * Zabranie karty na matę postaci.
 * Dostępne po zakończeniu misji — także po porażce, zgodnie z zasadą
 * "nawet przegrana uczy". Gracz może zabrać jedną ze swoich zagranych kart.
 */
function takeCardToMat(
  state: GameState,
  action: Extract<Action, { type: 'TAKE_CARD_TO_MAT' }>,
): ReducerResult {
  const mission = state.mission;
  if (!mission || state.phase !== 'missionSummary') {
    return reject(state, 'Karty można zabrać dopiero po zakończeniu misji.');
  }
  if (mission.takenToMat.includes(action.playerId)) {
    return reject(state, 'W tej misji zabrałeś już kartę.');
  }

  const play = mission.played.find(
    (p) => p.card.id === action.cardId && p.playerId === action.playerId,
  );
  if (!play) return reject(state, 'To nie jest karta zagrana przez Ciebie.');
  if (mission.sharedCardIds.includes(action.cardId)) {
    return reject(state, 'Ta karta została już przekazana innemu graczowi.');
  }

  return {
    state: {
      ...state,
      players: updatePlayer(state, action.playerId, (p) => ({
        ...p,
        mat: [...p.mat, play.card],
      })),
      mission: { ...mission, takenToMat: [...mission.takenToMat, action.playerId] },
    },
  };
}

/**
 * Przekazanie zagranej kompetencji innemu graczowi.
 * Przekazujący dostaje kartę doświadczenia typu 'share' — to jedyny sposób
 * na jej zdobycie i warunek konieczny spełnienia.
 */
function shareCard(
  state: GameState,
  action: Extract<Action, { type: 'SHARE_CARD' }>,
): ReducerResult {
  const mission = state.mission;
  if (!mission || state.phase !== 'missionSummary') {
    return reject(state, 'Karty można przekazać dopiero po zakończeniu misji.');
  }
  if (action.fromPlayerId === action.toPlayerId) {
    return reject(state, 'Nie możesz przekazać karty samemu sobie.');
  }
  if (mission.sharedCardIds.includes(action.cardId)) {
    return reject(state, 'Ta karta została już przekazana.');
  }

  const play = mission.played.find(
    (p) => p.card.id === action.cardId && p.playerId === action.fromPlayerId,
  );
  if (!play) return reject(state, 'To nie jest karta zagrana przez Ciebie.');

  if (!COMPETENCE_CATEGORIES.includes(play.card.category)) {
    return reject(state, 'Przekazywać można tylko karty kompetencji.');
  }

  const receiver = state.players.find((p) => p.id === action.toPlayerId);
  if (!receiver) return reject(state, 'Nieznany gracz docelowy.');

  const giver = state.players.find((p) => p.id === action.fromPlayerId);
  if (!giver) return reject(state, 'Nieznany gracz przekazujący.');

  const players = state.players.map((p) => {
    if (p.id === action.fromPlayerId) {
      return {
        ...p,
        sharedCount: p.sharedCount + 1,
        experience: [
          ...p.experience,
          {
            id: `exp-share-${state.missionNumber}-${p.id}-${action.cardId}`,
            kind: 'share' as const,
          },
        ],
      };
    }
    if (p.id === action.toPlayerId) {
      return {
        ...p,
        mat: [...p.mat, play.card],
        receivedCardIds: [...p.receivedCardIds, action.cardId],
      };
    }
    return p;
  });

  return {
    state: {
      ...state,
      players,
      mission: { ...mission, sharedCardIds: [...mission.sharedCardIds, action.cardId] },
      log: [...state.log, `${giver.name} uczy gracza ${receiver.name}: ${play.card.name}`],
    },
  };
}

/**
 * Zamknięcie podsumowania misji.
 * Przy sukcesie: karta doświadczenia dla każdego + bonus za karty wymienione
 * w opisie problemu. Niezabrane karty trafiają na stos odrzuconych.
 * Ręce uzupełniane do pełnego rozmiaru.
 */
function endMissionSummary(state: GameState): ReducerResult {
  const mission = state.mission;
  if (!mission || state.phase !== 'missionSummary') {
    return reject(state, 'Brak podsumowania do zamknięcia.');
  }

  const won = mission.phase === 'won';
  const bonusCardIds = new Set(
    mission.problems.flatMap((p) => p.slots.flatMap((s) => s.bonusCardIds)),
  );

  let players = state.players;

  if (won) {
    players = players.map((player) => {
      const extra = mission.played.filter(
        (p) => p.playerId === player.id && bonusCardIds.has(p.card.id),
      ).length;
      const awards = [
        { id: `exp-solve-${state.missionNumber}-${player.id}`, kind: 'solve' as const },
        ...Array.from({ length: extra }, (_, i) => ({
          id: `exp-bonus-${state.missionNumber}-${player.id}-${i}`,
          kind: 'solve' as const,
        })),
      ];
      return { ...player, experience: [...player.experience, ...awards] };
    });
  }

  // Karty niezabrane i nieprzekazane idą na stos odrzuconych.
  const keptCardIds = new Set(players.flatMap((p) => p.mat.map((c) => c.id)));
  const discarded = mission.played
    .filter((p) => !keptCardIds.has(p.card.id))
    .map((p) => p.card);

  // Wyrównanie rąk do rozmiaru startowego — zasada "dobierają, żeby wrócić
  // do początkowego układu". Działa w obie strony: brakujące karty są
  // dobierane, nadmiarowe (np. po Czarnym Łabędziu) trafiają na odrzucone.
  let pile = state.drawPile;
  let discard = [...state.discardPile, ...discarded];
  let seed = state.rng;
  players = players.map((player) => {
    const difference = state.config.handSize - player.hand.length;

    if (difference === 0) return player;

    if (difference < 0) {
      const kept = player.hand.slice(0, state.config.handSize);
      discard = [...discard, ...player.hand.slice(state.config.handSize)];
      return { ...player, hand: kept };
    }

    const result = draw(pile, discard, difference, seed);
    pile = result.pile;
    discard = result.discard;
    seed = result.seed;
    return { ...player, hand: [...player.hand, ...result.drawn] };
  });

  const solvedProblems = won
    ? [...state.solvedProblems, ...mission.problems]
    : state.solvedProblems;

  // Problemy przegrane w tej misji trafiają na stos nierozwiązanych.
  let unsolvedProblems = won
    ? state.unsolvedProblems
    : [...state.unsolvedProblems, ...mission.problems];

  const unsolvedSince = { ...state.unsolvedSince };
  if (!won) {
    for (const problem of mission.problems) {
      unsolvedSince[problem.id] = state.missionNumber;
    }
  }

  // Zasada z instrukcji: po dwóch kolejnych misjach można wrócić do problemu.
  // Wraca na spód talii, żeby nie pojawił się natychmiast.
  const readyForRetry = unsolvedProblems.filter(
    (problem) => state.missionNumber - (unsolvedSince[problem.id] ?? 0) >= 2,
  );
  const retryIds = new Set(readyForRetry.map((p) => p.id));
  unsolvedProblems = unsolvedProblems.filter((p) => !retryIds.has(p.id));
  for (const id of retryIds) delete unsolvedSince[id];

  const problemPile = [...state.problemPile, ...readyForRetry];
  const gameOver = state.missionNumber >= state.config.missionsPerGame;

  return {
    state: {
      ...state,
      players,
      drawPile: pile,
      discardPile: discard,
      rng: seed,
      problemPile,
      solvedProblems,
      unsolvedProblems,
      unsolvedSince,
      mission: null,
      phase: gameOver ? 'finale' : 'setup',
    },
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
    case 'TAKE_CARD_TO_MAT':
      return takeCardToMat(state, action);
    case 'SHARE_CARD':
      return shareCard(state, action);
    case 'END_MISSION_SUMMARY':
      return endMissionSummary(state);
    default:
      return reject(state, `Nieobsługiwana akcja: ${(action as Action).type}`);
  }
}
