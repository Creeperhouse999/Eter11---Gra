import { draw, shuffle } from './deck';
import {
  cardFitsSlot,
  cardsInSlot,
  isMissionSolved,
  isSlotFilled,
  requiredCountForSlot,
  slotId,
} from './rules';
// Jedno źródło reguły dzielenia się. Silnik miał własną kopię listy —
// dokładnie ten rozjazd, przed którym ostrzega komentarz przy oryginale.
import { isCompetence } from '../ui/components/categoryStyles';
import type {
  Action,
  BlackSwanEvent,
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
  maxHandSize: 7,
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

/**
 * Limit rund na misję.
 *
 * Bierze wyłącznie wartość z zasad. Sprawdzałem skalowanie limitu liczbą
 * graczy — miało wyrównać trudność, bo cztery osoby mają dwa razy więcej
 * ruchów niż dwie na te same pięć ścianek. Pomiar A/B na tym samym bocie
 * pokazał jednak zero różnicy (54% i 57% przed i po): misja rozstrzyga się
 * w 3–5 rundach, więc limit siedmiu rund prawie nigdy nie jest tym, co ją
 * kończy. Skracanie go zabierałoby graczom zapas, nie dokładając trudności.
 *
 * Zostawiam funkcję jako jedno miejsce, w którym liczy się limit — silnik,
 * pasek rund i podpowiedzi muszą liczyć tak samo.
 */
export function roundsForPlayers(_players: number, configured: number): number {
  return configured;
}

/**
 * Czy jest jeszcze jakiś problem do odkrycia.
 *
 * `startMission` odkrywa problem z talii, a gdy talia opustoszała — sięga po
 * odłożone (recykling, żeby partia nie zawisła). Ekran startu MUSI liczyć tak
 * samo: gdyby patrzył tylko na `problemPile`, wyłączałby „Odkryj problem"
 * mimo że silnik ma co wyłożyć, i zostawiał gracza w ślepym zaułku z obietnicą
 * „wrócą po dwóch misjach", której nic nie mogło spełnić. Jedno źródło prawdy
 * dla obu ekranów startu (gra przy stole i tryb testowy panelu).
 */
export function hasProblemToReveal(state: GameState): boolean {
  return state.problemPile.length > 0 || state.unsolvedProblems.length > 0;
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
  if (state.phase === 'finale') {
    return reject(state, 'Gra już się zakończyła.');
  }
  if (state.mission && state.mission.phase === 'playing') {
    return reject(state, 'Misja już trwa.');
  }
  // Misja w podsumowaniu wciąż trzyma zagrane karty. Nowa misja podmienia
  // `mission` na świeży obiekt z pustym `played`, więc te karty znikałyby
  // z gry — nie wracają ani na stos, ani do rąk. Zamknięcie misji
  // (`END_MISSION_SUMMARY`) rozdziela je z powrotem, więc wymagamy go
  // wprost, zamiast po cichu gubić po trzy karty na misję.
  if (state.mission && state.phase === 'missionSummary') {
    return reject(state, 'Najpierw zamknij podsumowanie poprzedniej misji.');
  }
  // Odłożone problemy wracają normalnie przy zamykaniu misji. Gdy talia
  // pustoszeje, nie ma czego zamykać — bez tego gracz stał na ekranie startu
  // z komunikatem „wrócą po dwóch misjach", którego nic nie mogło spełnić.
  const pile =
    state.problemPile.length > 0
      ? state.problemPile
      : [...state.unsolvedProblems];
  const recycled = state.problemPile.length === 0 && pile.length > 0;

  if (pile.length === 0) {
    // Naprawdę nie ma czego odkryć — gra dobiega końca zamiast wisieć.
    return {
      state: {
        ...state,
        phase: 'finale',
        log: [...state.log, 'Talia problemów wyczerpana — koniec gry.'],
      },
    };
  }

  const [problem, ...rest] = pile;
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
    swappedThisRound: [],
    pendingSwanEvents: [],
  };

  const started: GameState = {
    ...state,
    problemPile: rest,
    // Recykling przenosi CAŁĄ listę odłożonych do talii, nie tylko problem
    // wzięty na stół. Usuwanie samego wylosowanego zostawiało resztę
    // w dwóch miejscach naraz — ten sam problem wracał wtedy drugi raz.
    unsolvedProblems: recycled ? [] : state.unsolvedProblems,
    // Licznik odłożenia też musi zniknąć: zostawiony sprawiłby, że przy
    // kolejnej porażce problem wróciłby natychmiast, bez dwóch misji przerwy.
    unsolvedSince: recycled ? {} : state.unsolvedSince,
    mission,
    missionNumber: state.missionNumber + 1,
    activePlayerIndex: 0,
    phase: 'mission',
    log: [...state.log, `Misja ${state.missionNumber + 1}: ${problem.name}`],
  };

  // Łabędź mógł trafić do ręki już przy rozdaniu — misja zaczyna się wtedy
  // od jego skutku, a nie od zwykłej pierwszej tury.
  const resolved = resolveDrawnBlackSwans(started);
  if (resolved.events.length === 0) return { state: resolved.state };

  return {
    state: {
      ...resolved.state,
      mission: {
        ...resolved.state.mission!,
        pendingSwanEvents: resolved.events,
      },
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

  if (mission.round >= roundsForPlayers(state.players.length, state.config.roundsPerMission)) {
    return {
      ...state,
      activePlayerIndex: 0,
      mission: { ...mission, phase: 'lost' },
      phase: 'missionSummary',
      log: [...state.log, 'Runda ostatnia minęła — problem tym razem wygrał.'],
    };
  }

  // Nowa runda: każdy dobiera 1 kartę.
  // Pomijamy graczy, którzy w tej rundzie wymienili rękę — wymiana była ich
  // dobraniem, więc kolejna karta dałaby im przewagę nad resztą stołu.
  let pile = state.drawPile;
  let discard = state.discardPile;
  let seed = state.rng;
  const players = state.players.map((player) => {
    if (mission.swappedThisRound.includes(player.id)) return player;

    // Pełna ręka nie dobiera. Karta zostaje w talii zamiast trafić do kogoś,
    // kto i tak nie miałby jej gdzie zagrać.
    if (player.hand.length >= state.config.maxHandSize) return player;

    const result = draw(pile, discard, 1, seed);
    pile = result.pile;
    discard = result.discard;
    seed = result.seed;
    return { ...player, hand: [...player.hand, ...result.drawn] };
  });

  const dealt: GameState = {
    ...state,
    players,
    drawPile: pile,
    discardPile: discard,
    rng: seed,
    activePlayerIndex: 0,
    mission: { ...mission, round: mission.round + 1, swappedThisRound: [] },
  };

  // Łabędź dobrany na początku rundy działa od razu — nie czeka na ruch
  // gracza, bo nie jest ruchem gracza.
  const resolved = resolveDrawnBlackSwans(dealt);
  if (resolved.events.length === 0) return resolved.state;

  return {
    ...resolved.state,
    mission: {
      ...resolved.state.mission!,
      pendingSwanEvents: [
        ...resolved.state.mission!.pendingSwanEvents,
        ...resolved.events,
      ],
    },
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
    return reject(state, 'Ten problem nie ma takiej ścianki.');
  }
  const slot = problem.slots.find((s) => s.key === action.slotKey)!;
  if (!cardFitsSlot(card, action.slotKey, slot.family)) {
    return reject(state, 'Ta karta nie pasuje do tej ścianki.');
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

/**
 * Wymiana wybranych kart na nowe. Kosztuje ruch w tej rundzie.
 *
 * Brak `cardIds` oznacza wymianę całej ręki. Wymienione karty trafiają na
 * stos odrzuconych dopiero po dobraniu — inaczej przy kończącej się talii
 * gracz mógłby dostać z powrotem dokładnie te karty, których się pozbywał.
 */
function swapHand(
  state: GameState,
  playerId: string,
  cardIds?: string[],
): ReducerResult {
  if (!state.mission || state.mission.phase !== 'playing') {
    return reject(state, 'Misja nie trwa.');
  }
  if (!isActivePlayer(state, playerId)) {
    return reject(state, 'To nie Twoja kolej.');
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return reject(state, 'Nieznany gracz.');

  const toSwap = cardIds
    ? player.hand.filter((card) => cardIds.includes(card.id))
    : player.hand;

  if (toSwap.length === 0) {
    return reject(state, 'Wybierz przynajmniej jedną kartę do wymiany.');
  }
  if (cardIds && toSwap.length !== cardIds.length) {
    return reject(state, 'Nie masz którejś z tych kart.');
  }

  const swapIds = new Set(toSwap.map((card) => card.id));
  const kept = player.hand.filter((card) => !swapIds.has(card.id));

  // Oddane karty wracają do obiegu PRZED dobraniem.
  //
  // Wcześniej trafiały na stos dopiero po dobraniu, więc przy krótkiej talii
  // nie było ich z czego przetasować: gracz oddawał pięć kart i dostawał
  // dwie, a przy pustej talii zostawał z niczym. Wymiana ma oddać tyle,
  // ile zabrała — te same karty w najgorszym razie wrócą do ręki.
  const result = draw(
    state.drawPile,
    [...state.discardPile, ...toSwap],
    toSwap.length,
    state.rng,
  );

  const mission = state.mission;
  // Polska odmiana ma trzy formy, a 12–14 bierze mnogą mimo końcówki 2–4:
  // proste `< 5` dawało „12 karty".
  const lastDigit = toSwap.length % 10;
  const lastTwo = toSwap.length % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14);
  const label =
    toSwap.length === 1
      ? 'jedną kartę'
      : `${toSwap.length} ${few ? 'karty' : 'kart'}`;

  const swapped: GameState = {
    ...state,
    players: updatePlayer(state, playerId, (p) => ({
      ...p,
      hand: [...kept, ...result.drawn],
    })),
    drawPile: result.pile,
    discardPile: result.discard,
    rng: result.seed,
    mission: { ...mission, swappedThisRound: [...mission.swappedThisRound, playerId] },
    log: [...state.log, `${player.name} wymienia ${label}.`],
  };

  // Łabędź dociągnięty przy wymianie działa natychmiast. Bez tego zostawał
  // martwą kartą w ręce: zagrać się nie da, wymienić też nie, więc gracz
  // grał do końca misji o jedną kartę mniej.
  return { state: endTurn(withResolvedSwans(swapped)) };
}

/**
 * Stan po odpaleniu wszystkich świeżo dobranych Czarnych Łabędzi.
 * Zdarzenia dopisujemy do kolejki, żeby gracz zobaczył, co się stało.
 */
function withResolvedSwans(state: GameState): GameState {
  // Wymiana zużywa ruch gracza NA TO — jego kolej w tej rundzie już się
  // liczy jako spożytkowana, więc do zabezpieczenia feasibility trafia
  // liczba ruchów, które w tej rundzie ZOSTAŁY (bez własnego, właśnie
  // zużytego). Gracze przed nim w kolejce też już swój ruch wykorzystali.
  const movesRemainingThisRound = state.players.length - state.activePlayerIndex - 1;
  const resolved = resolveDrawnBlackSwans(state, movesRemainingThisRound);
  if (resolved.events.length === 0) return resolved.state;

  return {
    ...resolved.state,
    mission: {
      ...resolved.state.mission!,
      pendingSwanEvents: [
        ...resolved.state.mission!.pendingSwanEvents,
        ...resolved.events,
      ],
    },
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
/**
 * Czarny Łabędź wchodzi do gry sam, w chwili dobrania.
 *
 * Karty nie da się zagrać ani zatrzymać: kto ją wyciągnie, ten od razu
 * ponosi skutek, a karta idzie na stos odrzuconych. Tak działa łabędź w
 * grze planszowej — jest zdarzeniem, nie ruchem gracza.
 *
 * Zwraca też opis tego, co się stało: gracz musi wiedzieć, dlaczego
 * plansza nagle wygląda inaczej.
 */
export function resolveDrawnBlackSwans(
  state: GameState,
  movesRemainingThisRound: number = state.players.length,
): {
  state: GameState;
  events: BlackSwanEvent[];
} {
  // Tylko w trwającej misji. Po rozwiązaniu problemu karta nie ma czego
  // utrudnić, a okno z utrudnieniem nad ekranem zwycięstwa myliłoby graczy.
  if (!state.mission || state.mission.phase !== 'playing') {
    return { state, events: [] };
  }

  const events: BlackSwanEvent[] = [];
  let next = state;

  // Pętla, bo Łabędź typu „wymiana rąk" przesuwa karty między graczami,
  // a karta dobrana w zamian też bywa Łabędziem.
  //
  // Limit liczony z liczby kart w grze, nie zgadywany: sztywna ósemka
  // zostawiała Łabędzie w rękach, gdy trafiło się ich więcej. Każdy obieg
  // usuwa dokładnie jedną kartę z ręki, więc tyle obiegów wystarczy
  // z zapasem, a pętla i tak kończy się sama, gdy nie ma czego szukać.
  const maxRounds =
    state.players.reduce((sum, p) => sum + p.hand.length, 0) +
    state.drawPile.length +
    state.discardPile.length +
    1;

  for (let guard = 0; guard < maxRounds; guard += 1) {
    let found: { player: Player; card: Card } | null = null;

    for (const player of next.players) {
      const card = player.hand.find((c) => c.category === 'blackswan');
      if (card) {
        found = { player, card };
        break;
      }
    }

    if (!found) break;

    const { player, card } = found;

    // Łabędź nie zjada miejsca w ręce: schodzi na stos, a gracz dobiera
    // w zamian zwykłą kartę. Bez tego ten, kto go wyciągnął, grał do końca
    // misji o kartę mniej niż reszta stołu — a wyciągnięcie jest losowe.
    const replacement = draw(next.drawPile, next.discardPile, 1, next.rng);

    const withoutCard: GameState = {
      ...next,
      players: next.players.map((p) =>
        p.id === player.id
          ? {
              ...p,
              hand: [...p.hand.filter((c) => c.id !== card.id), ...replacement.drawn],
            }
          : p,
      ),
      drawPile: replacement.pile,
      discardPile: [...replacement.discard, card],
      rng: replacement.seed,
    };

    const kind = card.blackSwanKind ?? 'extraProblem';
    const before = withoutCard.mission!.activeBlackSwans.length;
    next = applyBlackSwan(withoutCard, kind, movesRemainingThisRound);
    const applied = next.mission!.activeBlackSwans.length > before;

    events.push({
      playerId: player.id,
      playerName: player.name,
      cardName: card.name,
      kind,
      // Ten sam wariant nie kumuluje się drugi raz — gracz ma wiedzieć,
      // że karta zeszła, ale plansza się nie zmieniła.
      applied,
    });
  }

  return { state: next, events };
}

/**
 * `movesRemainingThisRound` — ile ruchów w BIEŻĄCEJ rundzie jeszcze może
 * wypełnić slot, licząc od chwili wywołania.
 *
 * Domyślnie cała runda (`state.players.length`): tak liczy się to na
 * początku rundy (rozdanie startowe misji albo nowej rundy), zanim
 * ktokolwiek zagrał — wtedy każdy z n graczy ma jeszcze przed sobą swój
 * ruch. Przy Łabędziu dobranym w trakcie wymiany karty (`withResolvedSwans`)
 * `state.activePlayerIndex` wskazuje gracza, który WŁAŚNIE zużywa swój ruch
 * na wymianę (nie na wypełnienie slotu), a gracze przed nim w tej rundzie
 * już swój ruch zużyli — wywołanie przekazuje wtedy jawnie mniejszą liczbę.
 *
 * Regresja: liczenie zawsze jak przy starcie rundy (`(rundy - runda + 1) *
 * gracze`) ignorowało już zużyte ruchy przy wymianie w trakcie rundy, więc
 * zabezpieczenie przepuszczało utrudnienie w misji, której faktycznie nie
 * dało się już domknąć — dokładnie to, przed czym ma chronić.
 */
export function applyBlackSwan(
  state: GameState,
  kind: BlackSwanKind,
  movesRemainingThisRound: number = state.players.length,
): GameState {
  const mission = state.mission;
  if (!mission || mission.phase !== 'playing') return state;

  if (kind === 'extraProblem') {
    // Bez tego drugie wywołanie dokładałoby trzeci problem, choć zasady
    // mówią o jednym dodatkowym.
    if (mission.activeBlackSwans.includes('extraProblem')) return state;
    if (state.problemPile.length === 0) return state;

    // Ten sam warunek co przy podwojeniu, tylko z drugiej strony: dokładanie
    // problemu, którego nie da się zamknąć w pozostałych rundach, robi
    // z misji przegraną bez ruchu gracza.
    const perCard = mission.activeBlackSwans.includes('doubleRequirements') ? 2 : 1;
    const movesLeft =
      (roundsForPlayers(state.players.length, state.config.roundsPerMission) -
        mission.round) *
        state.players.length +
      movesRemainingThisRound;
    // Deficyt liczony slot po slocie, nie „każdy niezapełniony × perCard" —
    // przy aktywnym podwojeniu slot z 1 z 2 wymaganych kart potrzebuje już
    // tylko 1, nie pełnych 2. Licząc ryczałtem zawyżało to wymóg i potrafiło
    // zablokować dodatkowy problem, mimo że pozostałych ruchów starczało.
    const cardsStillNeeded = mission.problems.reduce(
      (sum, problem) =>
        sum +
        problem.slots.reduce(
          (slotSum, slot) =>
            slotSum +
            Math.max(
              0,
              requiredCountForSlot(mission, problem.id, slot.key) -
                cardsInSlot(mission, problem.id, slot.key),
            ),
          0,
        ),
      0,
    );
    const extraSlots = state.problemPile[0].slots.length;
    if (cardsStillNeeded + extraSlots * perCard > movesLeft) return state;

    const [extra, ...rest] = state.problemPile;
    return {
      ...state,
      problemPile: rest,
      mission: {
        ...mission,
        problems: [...mission.problems, extra],
        activeBlackSwans: [...mission.activeBlackSwans, 'extraProblem'],
      },
      log: [...state.log, `Czarny Łabędź: dodatkowy problem — ${extra.name}!`],
    };
  }

  if (kind === 'doubleRequirements') {
    if (mission.activeBlackSwans.includes('doubleRequirements')) return state;

    // Dwa utrudnienia naraz potrafią zabrać matematyczną możliwość wygranej:
    // dwa problemy po podwojeniu wymagają 20 kart, a dwóch graczy ma w całej
    // misji 14 ruchów. Drugie utrudnienie odpuszczamy — misja ma być trudna,
    // a nie przegrana w chwili wylosowania karty.
    const movesLeft =
      (roundsForPlayers(state.players.length, state.config.roundsPerMission) -
        mission.round) *
        state.players.length +
      movesRemainingThisRound;
    const needed = mission.problems.reduce(
      (sum, problem) =>
        sum +
        problem.slots.filter((slot) => !isSlotFilled(mission, problem.id, slot.key))
          .length,
      0,
    );
    if (needed * 2 > movesLeft) return state;
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

  // swapHands — ręka gracza i trafia do gracza i+1 (ostatni oddaje pierwszemu).
  // Kopiujemy tablice, żeby dwóch graczy nie dzieliło tej samej referencji.
  if (mission.activeBlackSwans.includes('swapHands')) return state;

  const hands = state.players.map((p) => p.hand);
  const players = state.players.map((player, index) => ({
    ...player,
    hand: [...hands[(index - 1 + hands.length) % hands.length]],
  }));

  return {
    ...state,
    players,
    mission: { ...mission, activeBlackSwans: [...mission.activeBlackSwans, 'swapHands'] },
    log: [...state.log, 'Czarny Łabędź: wymiana kart między graczami!'],
  };
}



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

  // ETER11 jest jokerem do zagrania, nie kompetencją do zebrania: karta
  // postaci ma pięć miejsc na kategorie i żadne z nich do niego nie pasuje.
  // Wcześniej zabranie przechodziło, a karta znikała bez śladu — gracz tracił
  // swój jedyny wybór w tej misji i nic w zamian nie dostawał.
  if (play.card.category === 'eter11' || play.card.category === 'blackswan') {
    return reject(
      state,
      'ETER11 i Czarny Łabędź zostają w grze — na kartę postaci zabierasz kompetencje, talenty i mentorów.',
    );
  }
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
      mission: {
        ...mission,
        // Karta schodzi z listy zagranych: leży teraz na karcie postaci, nie
        // przy problemie. Zostawiona tu leżałaby naraz w `mat` i w `played` —
        // spis kart widziałby ją dwa razy przez całe podsumowanie. Tak samo
        // robi `shareCard`, gdy karta odchodzi do innego gracza.
        played: mission.played.filter((p) => p.card.id !== action.cardId),
        takenToMat: [...mission.takenToMat, action.playerId],
      },
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

  // ETER11 jest jokerem do zagrania, nie kompetencją do zebrania: karta
  // postaci ma pięć miejsc na kategorie i żadne z nich do niego nie pasuje.
  // Wcześniej zabranie przechodziło, a karta znikała bez śladu — gracz tracił
  // swój jedyny wybór w tej misji i nic w zamian nie dostawał.
  if (play.card.category === 'eter11' || play.card.category === 'blackswan') {
    return reject(
      state,
      'ETER11 i Czarny Łabędź zostają w grze — na kartę postaci zabierasz kompetencje, talenty i mentorów.',
    );
  }

  // Karta już zabrana na matę nie może zostać przekazana — inaczej ta sama
  // karta leżałaby na dwóch matach naraz i liczyła się obu graczom.
  const alreadyOnMat = state.players.some((p) =>
    p.mat.some((card) => card.id === action.cardId),
  );
  if (alreadyOnMat) {
    return reject(state, 'Ta karta leży już na czyjejś karcie postaci.');
  }

  // Karty specjalne zostają u tego, kto je zagrał: ETER11 jest jokerem,
  // a Czarny Łabędź utrudnieniem — żadna nie jest kompetencją do nauczenia.
  if (!isCompetence(play.card.category)) {
    return reject(state, 'Przekazywać można tylko karty kompetencji.');
  }

  const receiver = state.players.find((p) => p.id === action.toPlayerId);
  if (!receiver) return reject(state, 'Nieznany gracz docelowy.');

  // Limit „jedna karta na misję" dotyczy też kart otrzymanych. Bez tego
  // gracz brał własną kartę i dostawał jeszcze kilka od innych, a mata
  // rosła w jednej misji o tyle kart, ilu było chętnych.
  if (mission.takenToMat.includes(action.toPlayerId)) {
    return reject(
      state,
      `${receiver.name} zabrał już kartę w tej misji — może dostać kolejną dopiero w następnej.`,
    );
  }

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
      mission: {
        ...mission,
        // Karta schodzi z listy zagranych: przestała leżeć przy problemie,
        // a leży na karcie postaci odbiorcy. Zostawiona tu liczyła się dwa
        // razy — podsumowanie pokazywało ją i u dającego, i u biorącego,
        // a spis kart w grze widział o jedną kartę za dużo.
        played: mission.played.filter((p) => p.card.id !== action.cardId),
        sharedCardIds: [...mission.sharedCardIds, action.cardId],
        // Otrzymana karta wyczerpuje limit odbiorcy na tę misję — inaczej
        // dostałby po karcie od każdego chętnego gracza przy stole.
        takenToMat: [...mission.takenToMat, action.toPlayerId],
      },
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

  let players = state.players;

  if (won) {
    players = players.map((player) => ({
      ...player,
      experience: [
        ...player.experience,
        { id: `exp-solve-${state.missionNumber}-${player.id}`, kind: 'solve' as const },
      ],
    }));
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

/**
 * Gracz przeczytał komunikat o Czarnym Łabędziu.
 *
 * Karta odpaliła się sama przy dobraniu; to potwierdzenie tylko czyści
 * kolejkę, żeby okno nie wracało przy każdym kolejnym renderze.
 */
function dismissSwanEvents(state: GameState): ReducerResult {
  if (!state.mission) return { state };
  return {
    state: { ...state, mission: { ...state.mission, pendingSwanEvents: [] } },
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
      return swapHand(state, action.playerId, action.cardIds);
    case 'DISMISS_SWAN_EVENTS':
      return dismissSwanEvents(state);
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
