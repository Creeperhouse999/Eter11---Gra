import type { Card, Character, Problem, RulesConfig, SlotKey } from '../engine/types';
import type { ThemeColors } from '../data/theme';
import type { UiText } from '../data/uiText';

export interface GameContent {
  cards: Card[];
  problems: Problem[];
  characters: Character[];
  rules: RulesConfig;
  text: UiText;
  theme: ThemeColors;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const REQUIRED_SLOTS: SlotKey[] = ['psychological', 'digital', 'social', 'mentorTalent'];
const COMPETENCE_CATEGORIES = ['psychological', 'digital', 'social'] as const;

const NUMERIC_RULES: Array<[keyof RulesConfig, number, number]> = [
  ['roundsPerMission', 1, 30],
  ['handSize', 1, 12],
  ['missionsPerGame', 1, 20],
  ['teamWinThreshold', 1, 20],
  ['maxMatCardsPerMission', 0, 5],
  ['pointsPerExperience', 0, 10],
  ['pointsPerFulfillment', 0, 20],
];

/**
 * Walidacja zawartości przed zapisem do Firestore i po odczycie.
 *
 * Uszkodzone dane zablokowałyby grę wszystkim graczom, dlatego sprawdzane są
 * także zależności między sekcjami — na przykład czy karty bonusowe problemów
 * wskazują na istniejące karty.
 *
 * Zwraca wszystkie błędy naraz, a nie pierwszy napotkany: administrator
 * poprawia wtedy całość w jednym podejściu.
 */
export function validateContent(content: unknown): ValidationResult {
  const errors: string[] = [];
  const add = (message: string) => errors.push(message);

  if (typeof content !== 'object' || content === null) {
    return { ok: false, errors: ['Zawartość nie jest obiektem.'] };
  }

  const data = content as Partial<GameContent>;

  // Sekcje `text` i `theme` doszły później — dokumenty zapisane wcześniej ich
  // nie mają, a uzupełnia je migracja przy odczycie. Dlatego nie są wymagane.
  for (const section of ['cards', 'problems', 'characters', 'rules'] as const) {
    if (!data[section]) add(`Brak sekcji: ${section}.`);
  }
  if (errors.length > 0) return { ok: false, errors };

  const { cards, problems, characters, rules } = data as GameContent;

  // Puste sekcje są błędem, ale walidacja idzie dalej — administrator ma
  // zobaczyć wszystkie problemy naraz, a nie poprawiać je po jednym.
  const cardList = Array.isArray(cards) ? cards : [];
  const problemList = Array.isArray(problems) ? problems : [];
  const characterList = Array.isArray(characters) ? characters : [];

  if (cardList.length === 0) add('Sekcja cards jest pusta.');
  if (problemList.length === 0) add('Sekcja problems jest pusta.');
  if (characterList.length === 0) add('Sekcja characters jest pusta.');

  // --- Karty ---
  const cardIds = new Set<string>();
  for (const card of cardList) {
    if (!card.id) add('Karta bez identyfikatora.');
    else if (cardIds.has(card.id)) add(`Duplikat identyfikatora karty: ${card.id}.`);
    else cardIds.add(card.id);

    if (!card.name?.trim()) add(`Karta ${card.id}: brak nazwy.`);
    if (!card.icon?.trim()) add(`Karta ${card.id}: brak ikony.`);
    if (card.category === 'blackswan' && !card.blackSwanKind) {
      add(`Karta ${card.id}: Czarny Łabędź bez określonego wariantu.`);
    }
  }

  if (cardList.length > 0) {
    for (const category of COMPETENCE_CATEGORIES) {
      if (!cardList.some((c) => c.category === category)) {
        add(`Talia nie zawiera żadnej karty kategorii ${category}.`);
      }
    }
    if (!cardList.some((c) => c.category === 'talent')) add('Talia nie zawiera talentów.');
    if (!cardList.some((c) => c.category === 'mentor')) add('Talia nie zawiera mentorów.');
  }

  // --- Problemy ---
  const problemIds = new Set<string>();
  for (const problem of problemList) {
    if (!problem.id) add('Problem bez identyfikatora.');
    else if (problemIds.has(problem.id)) add(`Duplikat identyfikatora problemu: ${problem.id}.`);
    else problemIds.add(problem.id);

    if (!problem.name?.trim()) add(`Problem ${problem.id}: brak nazwy.`);
    if (!problem.story?.trim()) add(`Problem ${problem.id}: brak historii.`);
    if (!problem.goal?.trim()) add(`Problem ${problem.id}: brak celu.`);

    const slotKeys = (problem.slots ?? []).map((s) => s.key);
    for (const required of REQUIRED_SLOTS) {
      if (!slotKeys.includes(required)) {
        add(`Problem ${problem.id}: brakuje ścianki ${required}.`);
      }
    }

    for (const slot of problem.slots ?? []) {
      if (!slot.hint?.trim()) {
        add(`Problem ${problem.id}, ścianka ${slot.key}: brak podpowiedzi.`);
      }
      for (const bonusId of slot.bonusCardIds ?? []) {
        if (!cardIds.has(bonusId)) {
          add(`Problem ${problem.id}: karta bonusowa ${bonusId} nie istnieje w talii.`);
        }
      }
    }
  }

  // --- Postacie ---
  const characterIds = new Set<string>();
  for (const character of characterList) {
    if (!character.id) add('Postać bez identyfikatora.');
    else if (characterIds.has(character.id)) {
      add(`Duplikat identyfikatora postaci: ${character.id}.`);
    } else characterIds.add(character.id);

    if (!character.name?.trim()) add(`Postać ${character.id}: brak nazwy.`);
  }

  // --- Zasady ---
  // Wartości poza zakresem zablokowałyby rozgrywkę, np. 0 rund na misję.
  for (const [key, min, max] of NUMERIC_RULES) {
    const value = rules[key];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      add(`Zasada ${key}: wartość musi być liczbą.`);
    } else if (value < min || value > max) {
      add(`Zasada ${key}: wartość ${value} poza dozwolonym zakresem ${min}–${max}.`);
    }
  }

  if (
    typeof rules.teamWinThreshold === 'number' &&
    typeof rules.missionsPerGame === 'number' &&
    rules.teamWinThreshold > rules.missionsPerGame
  ) {
    add(
      'Próg zwycięstwa drużynowego jest wyższy niż liczba misji — gra byłaby niemożliwa do wygrania.',
    );
  }

  // --- Motyw ---
  // Nieprawidłowy kolor wywróciłby wygląd całej gry, a błąd byłby trudny
  // do namierzenia — sprawdzamy format zapisu.
  const theme = (data as Partial<GameContent>).theme;
  if (theme) {
    for (const [key, value] of Object.entries(theme)) {
      if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
        add(`Motyw, pole ${key}: „${value}" nie jest kolorem w formacie #rrggbb.`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
