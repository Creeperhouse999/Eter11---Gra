/** Kategoria karty — odpowiada slotowi problemu. */
export type CardCategory =
  | 'psychological'   // kompetencje psychologiczne
  | 'digital'         // kompetencje cyfrowe
  | 'social'          // kompetencje poznawczo-społeczne
  | 'talent'          // talenty
  | 'mentor'          // mentorzy
  | 'eter11'          // joker — zastępuje dowolny slot
  | 'blackswan';      // Czarny Łabędź — utrudnienie

/**
 * Ścianki problemu — po jednej na każdy bok karty.
 * Układ na stole: psychologiczna po lewej, cyfrowa na dole, społeczna
 * po prawej, mentor w lewym górnym rogu, talent w prawym górnym.
 */
export type SlotKey = 'psychological' | 'digital' | 'social' | 'mentor' | 'talent';

/** Typ problemu — kolor z instrukcji. */
export type ProblemType = 'action' | 'thinking' | 'cooperation' | 'selfchange';

export type BlackSwanKind = 'extraProblem' | 'doubleRequirements' | 'swapHands';

/**
 * Rodzina karty — drugi wymiar obok kategorii.
 * Ścianka problemu wymaga konkretnej rodziny, więc dziecko dopasowuje
 * kolor do koloru. Karty specjalne (ETER11, Czarny Łabędź) rodziny nie mają.
 */
export type FamilyId = 'red' | 'blue' | 'yellow' | 'green';

export interface Card {
  id: string;
  name: string;
  category: CardCategory;
  /** Opis widoczny na karcie. */
  description: string;
  /** Nazwa ikony z zestawu ETER11 (patrz src/ui/icons/Icon.tsx). */
  icon: string;
  /** Rodzina w obrębie kategorii. Brak oznacza kartę specjalną. */
  family?: FamilyId;
  /** Tylko dla category === 'blackswan'. */
  blackSwanKind?: BlackSwanKind;
  /** Oznaczenie treści dopisanej technicznie, do weryfikacji merytorycznej. */
  draft?: boolean;
}

export interface ProblemSlot {
  key: SlotKey;
  /**
   * Wymagana rodzina karty. Ścianka przyjmuje wyłącznie kartę swojej
   * kategorii w tej rodzinie — albo kartę ETER11.
   */
  family: FamilyId;
  /** Podpowiedź dla graczy, np. "Ktoś, kto uspokoi emocje". */
  hint: string;
  /** Id kart dających bonus (wymienione wprost w opisie problemu). */
  bonusCardIds: string[];
}

export interface Problem {
  id: string;
  name: string;
  story: string;
  /** Przeciwnik / źródło problemu. */
  antagonist: string;
  /** Co się stanie, jeśli gracze nie rozwiążą. */
  consequence: string;
  /** Cel misji. */
  goal: string;
  type: ProblemType;
  slots: ProblemSlot[];
  icon: string;
  draft?: boolean;
}

export interface Character {
  id: string;
  name: string;
  kind: 'child' | 'parent' | 'teacher';
  traits: string;
  icon: string;
}

/** Karta doświadczenia. Typ ma znaczenie dla warunku spełnienia. */
export interface ExperienceCard {
  id: string;
  kind: 'solve' | 'share';
}

export interface Player {
  id: string;
  name: string;
  characterId: string;
  /** Karty w ręce. */
  hand: Card[];
  /** Karty zabrane na kartę postaci (rozwój). */
  mat: Card[];
  /** Id kart z maty otrzymanych od innych graczy. */
  receivedCardIds: string[];
  /** Liczba kart przekazanych innym graczom przez całą grę. */
  sharedCount: number;
  experience: ExperienceCard[];
}

/** Karta wyłożona na stół w bieżącej misji. */
export interface PlayedCard {
  card: Card;
  playerId: string;
  slotKey: SlotKey;
  /** Który problem, gdy Czarny Łabędź dołożył drugi. */
  problemId: string;
  /** Czy karta pochodziła z maty postaci, a nie z ręki. */
  fromMat: boolean;
}

export interface RulesConfig {
  roundsPerMission: number;      // 7
  handSize: number;              // 5
  missionsPerGame: number;       // 7
  teamWinThreshold: number;      // 5
  maxMatCardsPerMission: number; // 1
  pointsPerExperience: number;   // 1
  pointsPerFulfillment: number;  // 2
}

export type MissionPhase = 'playing' | 'won' | 'lost';

export interface MissionState {
  /** Problemy aktywne w misji. Zwykle 1; 2 po Czarnym Łabędziu 'extraProblem'. */
  problems: Problem[];
  played: PlayedCard[];
  round: number;
  phase: MissionPhase;
  /** Id graczy, którzy użyli już karty z maty w tej misji. */
  matUsedBy: string[];
  /** Aktywne efekty Czarnego Łabędzia w tej misji. */
  activeBlackSwans: BlackSwanKind[];
  /** Sloty zapełnione zanim zadziałało podwojenie — nie wymagają 2. kart. */
  slotsFilledBeforeDoubling: string[];
  /** Id graczy, którzy zabrali już kartę na matę w tej misji. */
  takenToMat: string[];
  /** Id kart przekazanych innym graczom w tej misji. */
  sharedCardIds: string[];
}

export interface GameState {
  rng: number;
  config: RulesConfig;
  players: Player[];
  /** Indeks gracza, którego jest ruch. */
  activePlayerIndex: number;
  drawPile: Card[];
  discardPile: Card[];
  problemPile: Problem[];
  solvedProblems: Problem[];
  unsolvedProblems: Problem[];
  /** Numer misji, w której dany problem przegrał — klucz to id problemu. */
  unsolvedSince: Record<string, number>;
  mission: MissionState | null;
  missionNumber: number;
  phase: 'setup' | 'mission' | 'missionSummary' | 'finale';
  /** Log zdarzeń do wyświetlenia graczom. */
  log: string[];
}

export type Action =
  | { type: 'START_MISSION' }
  | { type: 'PLAY_CARD'; playerId: string; cardId: string; slotKey: SlotKey; problemId: string; fromMat: boolean }
  | { type: 'PASS'; playerId: string }
  | { type: 'SWAP_HAND'; playerId: string }
  | { type: 'TAKE_CARD_TO_MAT'; playerId: string; cardId: string }
  | { type: 'SHARE_CARD'; fromPlayerId: string; toPlayerId: string; cardId: string }
  | { type: 'END_MISSION_SUMMARY' }
  | { type: 'END_GAME' };

/** Wynik reducera. Odrzucony ruch zwraca stan bez zmian + powód. */
export interface ReducerResult {
  state: GameState;
  rejected?: string;
}
