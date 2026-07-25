import type { Card, Character, Problem, RulesConfig } from '../engine/types';
import {
  COMPETENCE_CATEGORIES,
  SLOT_ORDER,
} from '../ui/components/categoryStyles';
import type { FamilyMap } from '../data/families';
import { DEFAULT_THEME, type ThemeColors } from '../data/theme';
import type { UiText } from '../data/uiText';

import type { CategoryMap } from '../data/categories';
import type { CustomIcon } from '../data/customIcons';
import type { IntroContent } from '../data/intro';
import type { TutorialStep } from '../data/tutorial';

export interface GameContent {
  cards: Card[];
  problems: Problem[];
  characters: Character[];
  rules: RulesConfig;
  text: UiText;
  theme: ThemeColors;
  /**
   * Kolory trybu jasnego. Opcjonalne — zapisy sprzed dodaniem trybu jasnego
   * go nie mają, więc gra podstawia wtedy wbudowany LIGHT_THEME. `theme`
   * pozostaje zestawem ciemnym.
   */
  themeLight?: ThemeColors;
  families: FamilyMap;
  /**
   * Wstęp przed grą i kwestie ETER11 w samouczku.
   *
   * Opcjonalne, bo zapisy sprzed dodania tych pól ich nie mają — gra
   * podstawia wtedy teksty wbudowane. Bez tego wczytanie starszej wersji
   * zawartości zostawiłoby dziecko z pustym ekranem wstępu.
   */
  /** Nazwy i ikony kategorii. Brak = wartości wbudowane. */
  categories?: CategoryMap;
  /**
   * Ikony wgrane przez zespół. Nazwa to etykieta, url wskazuje plik
   * w Storage. Wybór ikony pokazuje je obok wbudowanych.
   */
  customIcons?: CustomIcon[];
  intro?: IntroContent;
  tutorial?: TutorialStep[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

// Obie listy pochodzą z jednego miejsca — walidacja musi sprawdzać
// dokładnie to, co pokazuje interfejs i egzekwuje silnik.
const REQUIRED_SLOTS = SLOT_ORDER;

/**
 * Ile znaków mieści się w interfejsie bez rozwalania układu.
 *
 * Bez limitów nazwa karty na 200 znaków przechodziła walidację i wychodziła
 * poza kartę, a opis problemu na 2000 znaków wypychał planszę poza ekran.
 */
/** Kategorie, które gra potrafi obsłużyć. */
const KNOWN_CATEGORIES: string[] = [
  ...SLOT_ORDER,
  'eter11',
  'blackswan',
];

const MAX_LENGTHS = {
  cardName: 60,
  cardDescription: 300,
  problemName: 80,
  problemStory: 1200,
  problemField: 200,
  slotHint: 120,
  characterName: 40,
} as const;

/**
 * Czy pole jest tekstem.
 *
 * Dane z bazy bywają dowolnego kształtu — pole zapisane kiedyś jako liczba
 * wywracało walidację wyjątkiem `trim is not a function`, czyli dokładnie
 * tam, gdzie miała ona chronić grę przed uszkodzoną zawartością.
 */
const isText = (value: unknown): value is string => typeof value === 'string';

/** Znaki, które w nazwie wyglądają jak błąd, a nie jak treść. */
const looksLikeMarkup = (value: string) => /[<>]/.test(value);

const NUMERIC_RULES: Array<[keyof RulesConfig, number, number]> = [
  ['roundsPerMission', 1, 30],
  ['handSize', 1, 12],
  // maxHandSize jest żywą zasadą silnika: reducer.ts dobiera kartę na nowej
  // rundzie tylko gdy `hand.length < maxHandSize`. Bez tego wpisu przechodziła
  // każda wartość — 0 wyłączało dobieranie (warunek zawsze fałszywy), a NaN/
  // tekst wyłączało sam limit (porównanie zawsze fałszywe) i ręka rosła bez
  // końca, czyli dokładnie to przepełnienie, przed którym walidator chroni.
  ['maxHandSize', 1, 12],
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
 * także zależności między sekcjami — na przykład czy ścianki problemów
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
  const rawCards = Array.isArray(cards) ? cards : [];
  const rawProblems = Array.isArray(problems) ? problems : [];
  const rawCharacters = Array.isArray(characters) ? characters : [];

  if (rawCards.length === 0) add('Sekcja cards jest pusta.');
  if (rawProblems.length === 0) add('Sekcja problems jest pusta.');
  if (rawCharacters.length === 0) add('Sekcja characters jest pusta.');

  // Element, który nie jest obiektem (null, liczba, tekst — tak wygląda wpis
  // po uszkodzeniu dokumentu w bazie albo ręcznej edycji w konsoli), wywracał
  // walidator przy pierwszym `card.id`/`slot.key`. A to właśnie walidator ma
  // ZŁAPAĆ uszkodzone dane i opisać je administratorowi — rzucony wyjątek
  // zamiast tego łapał się w `loadContent` jako „brak połączenia", więc admin
  // widział komunikat o sieci i nie miał jak dojść, że dane są zepsute.
  // Odsiewamy nie-obiekty z błędem i pracujemy dalej na poprawnych.
  const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;
  rawCards.forEach((c, i) => {
    if (!isObject(c)) add(`Karta #${i + 1} nie jest obiektem.`);
  });
  rawProblems.forEach((p, i) => {
    if (!isObject(p)) add(`Problem #${i + 1} nie jest obiektem.`);
  });
  rawCharacters.forEach((c, i) => {
    if (!isObject(c)) add(`Postać #${i + 1} nie jest obiektem.`);
  });

  const cardList = rawCards.filter((c): c is Card => isObject(c));
  const problemList = rawProblems.filter((p): p is Problem => isObject(p));
  const characterList = rawCharacters.filter((c): c is Character => isObject(c));

  // Do gry trafia tylko treść NIEROBOCZA (patrz playableCards/playableProblems
  // w danych). Sprawdzenia grywalności — czy każda ścianka ma pasującą kartę,
  // czy talia ma wszystkie kategorie, czy misji nie jest więcej niż problemów —
  // muszą więc liczyć tę samą treść, którą naprawdę zobaczą gracze. Inaczej
  // walidator przepuściłby zawartość niegrywalną w prawdziwej (nieroboczej)
  // partii: np. ściankę pokrytą wyłącznie kartą roboczą. Kontrole strukturalne
  // (nazwa, historia, komplet ścianek) zostają dla WSZYSTKICH, także szkiców.
  const playableCards = cardList.filter((c) => !c.draft);
  const playableProblems = problemList.filter((p) => !p.draft);

  // --- Karty ---
  const cardIds = new Set<string>();
  for (const card of cardList) {
    if (!card.id) add('Karta bez identyfikatora.');
    else if (cardIds.has(card.id)) add(`Duplikat identyfikatora karty: ${card.id}.`);
    else cardIds.add(card.id);

    if (!isText(card.name) || !card.name.trim()) add(`Karta ${card.id}: brak nazwy.`);
    else if (card.name.length > MAX_LENGTHS.cardName) {
      add(
        `Karta ${card.id}: nazwa ma ${card.name.length} znaków, ` +
          `a mieści się ${MAX_LENGTHS.cardName} — dłuższa nie zmieści się na karcie.`,
      );
    } else if (looksLikeMarkup(card.name)) {
      add(`Karta ${card.id}: nazwa zawiera znaki < lub >, które wyświetlą się dosłownie.`);
    }

    if (!isText(card.icon) || !card.icon.trim()) add(`Karta ${card.id}: brak ikony.`);

    if (isText(card.description) && card.description.length > MAX_LENGTHS.cardDescription) {
      add(
        `Karta ${card.id}: opis ma ${card.description.length} znaków, ` +
          `a mieści się ${MAX_LENGTHS.cardDescription}.`,
      );
    }
    // Nieznana kategoria przechodziła i lądowała w grze jako karta bez
    // koloru, ikony kategorii i miejsca na macie.
    if (!KNOWN_CATEGORIES.includes(card.category)) {
      add(`Karta ${card.id}: nieznana kategoria „${card.category}".`);
    }

    const isSpecial = card.category === 'eter11' || card.category === 'blackswan';
    if (!isSpecial && !card.family) {
      add(`Karta ${card.id}: brak rodziny (koloru).`);
    }
    if (card.category === 'blackswan' && !card.blackSwanKind) {
      add(`Karta ${card.id}: Czarny Łabędź bez określonego wariantu.`);
    }
  }

  if (cardList.length > 0) {
    // Grywalna talia (bez szkiców) musi mieć każdą kategorię — to ona wchodzi
    // do partii, więc kategoria pokryta wyłącznie kartą roboczą to za mało.
    for (const category of COMPETENCE_CATEGORIES) {
      if (!playableCards.some((c) => c.category === category)) {
        add(`Talia nie zawiera żadnej karty kategorii ${category}.`);
      }
    }
    if (!playableCards.some((c) => c.category === 'talent')) add('Talia nie zawiera talentów.');
    if (!playableCards.some((c) => c.category === 'mentor')) add('Talia nie zawiera mentorów.');
  }

  // --- Problemy ---
  const problemIds = new Set<string>();
  for (const problem of problemList) {
    if (!problem.id) add('Problem bez identyfikatora.');
    else if (problemIds.has(problem.id)) add(`Duplikat identyfikatora problemu: ${problem.id}.`);
    else problemIds.add(problem.id);

    if (!isText(problem.name) || !problem.name.trim()) add(`Problem ${problem.id}: brak nazwy.`);
    else if (problem.name.length > MAX_LENGTHS.problemName) {
      add(`Problem ${problem.id}: nazwa ma ${problem.name.length} znaków, a mieści się ${MAX_LENGTHS.problemName}.`);
    } else if (looksLikeMarkup(problem.name)) {
      add(`Problem ${problem.id}: nazwa zawiera znaki < lub >, które wyświetlą się dosłownie.`);
    }

    if (!isText(problem.story) || !problem.story.trim()) add(`Problem ${problem.id}: brak historii.`);
    else if (problem.story.length > MAX_LENGTHS.problemStory) {
      add(`Problem ${problem.id}: historia ma ${problem.story.length} znaków, a mieści się ${MAX_LENGTHS.problemStory}.`);
    }

    if (!isText(problem.goal) || !problem.goal.trim()) add(`Problem ${problem.id}: brak celu.`);
    else if (problem.goal.length > MAX_LENGTHS.problemField) {
      add(`Problem ${problem.id}: cel ma ${problem.goal.length} znaków, a mieści się ${MAX_LENGTHS.problemField}.`);
    }

    if (!Array.isArray(problem.slots)) {
      add(`Problem ${problem.id}: ścianki nie są listą.`);
      continue;
    }

    // Ścianka, która nie jest obiektem, wywróciłaby `s.key` niżej — ten sam
    // rodzaj uszkodzenia co przy kartach, więc tak samo ją zgłaszamy i mijamy.
    const slots = problem.slots.filter(
      (s): s is Problem['slots'][number] => isObject(s),
    );
    if (slots.length !== problem.slots.length) {
      add(`Problem ${problem.id}: któraś ścianka nie jest obiektem.`);
    }

    const slotKeys = slots.map((s) => s.key);
    for (const required of REQUIRED_SLOTS) {
      if (!slotKeys.includes(required)) {
        add(`Problem ${problem.id}: brakuje ścianki ${required}.`);
      }
    }

    for (const slot of slots) {
      if (!isText(slot.hint) || !slot.hint.trim()) {
        add(`Problem ${problem.id}, ścianka ${slot.key}: brak podpowiedzi.`);
      } else if (slot.hint.length > MAX_LENGTHS.slotHint) {
        add(
          `Problem ${problem.id}, ścianka ${slot.key}: podpowiedź ma ` +
            `${slot.hint.length} znaków, a mieści się ${MAX_LENGTHS.slotHint}.`,
        );
      }
      if (!slot.family) {
        add(`Problem ${problem.id}, ścianka ${slot.key}: brak wymaganej rodziny.`);
      } else if (!problem.draft) {
        // Ścianka bez ani jednej pasującej karty w talii zablokowałaby misję.
        // Liczymy tylko problemy i karty NIEROBOCZE: szkic jeszcze nie gra
        // (może być niekompletny, nie blokujemy jego zapisu), a ściankę
        // grywalnego problemu musi domknąć karta, która naprawdę trafia do gry.
        const matching = playableCards.filter(
          (c) => c.category === slot.key && c.family === slot.family,
        );
        if (matching.length === 0) {
          add(
            `Problem ${problem.id}, ścianka ${slot.key}: w talii nie ma żadnej karty ` +
              `kategorii ${slot.key} w rodzinie ${slot.family} — misji nie da się ukończyć.`,
          );
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

    if (!isText(character.name) || !character.name.trim()) add(`Postać ${character.id}: brak nazwy.`);
    else if (character.name.length > MAX_LENGTHS.characterName) {
      add(`Postać ${character.id}: nazwa ma ${character.name.length} znaków, a mieści się ${MAX_LENGTHS.characterName}.`);
    }
  }

  // --- Zasady ---
  // Wartości poza zakresem zablokowałyby rozgrywkę, np. 0 rund na misję.
  for (const [key, min, max] of NUMERIC_RULES) {
    const value = rules[key];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      add(`Zasada ${key}: wartość musi być liczbą.`);
    } else if (!Number.isInteger(value)) {
      // Ułamek trafiał do pętli dobierania i do porównań z długością ręki,
      // przez co ręka rozjeżdżała się z każdą rundą.
      add(`Zasada ${key}: wartość musi być liczbą całkowitą (jest ${value}).`);
    } else if (value < min || value > max) {
      add(`Zasada ${key}: wartość ${value} poza dozwolonym zakresem ${min}–${max}.`);
    }
  }

  // Limit ręki nie może być mniejszy niż rozdanie: gracz startuje z ręką
  // rozmiaru handSize, więc już od pierwszej rundy byłaby ona ponad limitem,
  // a `hand.length < maxHandSize` nigdy nie ruszyłoby dobierania. Zestaw
  // pozornie w zakresie (np. handSize 5, maxHandSize 3) po cichu psułby grę.
  if (
    typeof rules.handSize === 'number' &&
    typeof rules.maxHandSize === 'number' &&
    Number.isInteger(rules.handSize) &&
    Number.isInteger(rules.maxHandSize) &&
    rules.maxHandSize < rules.handSize
  ) {
    add(
      `Limit ręki (${rules.maxHandSize}) jest mniejszy niż rozdanie ` +
        `(${rules.handSize}) — gracze startowaliby z ręką ponad limitem, ` +
        'a dobieranie na rundę nigdy by nie ruszyło.',
    );
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

  // Misji nie może być więcej niż GRYWALNYCH problemów: gra dobiega wtedy końca
  // wcześniej, niż zapowiada, a ekran „odkryj problem" zostaje bez treści.
  // Liczymy problemy nierobocze, bo tylko one trafiają do partii — szkice nie.
  if (
    typeof rules.missionsPerGame === 'number' &&
    playableProblems.length > 0 &&
    rules.missionsPerGame > playableProblems.length
  ) {
    add(
      `Misji w grze (${rules.missionsPerGame}) jest więcej niż grywalnych problemów ` +
        `(${playableProblems.length}, bez wersji roboczych) — gra skończy się przed czasem.`,
    );
  }

  // Ręka rośnie o kartę na rundę, dopóki gracz nie zagra. Przy długich
  // misjach robi się z niej kilkadziesiąt kart, których nie da się objąć
  // wzrokiem ani zmieścić na ekranie — to psuje grę bardziej niż pomaga.
  if (
    typeof rules.handSize === 'number' &&
    typeof rules.roundsPerMission === 'number' &&
    rules.handSize + rules.roundsPerMission > 24
  ) {
    add(
      `Ręka może urosnąć do ${rules.handSize + rules.roundsPerMission} kart ` +
        '(rozdanie plus dobieranie co rundę). Powyżej 24 kart ręka nie mieści się ' +
        'na ekranie — zmniejsz rozdanie albo liczbę rund.',
    );
  }

  // --- Motyw ---
  // Nieprawidłowy kolor wywróciłby wygląd całej gry, a błąd byłby trudny
  // do namierzenia — sprawdzamy format zapisu.
  //
  // Ta sama kontrola obejmuje motyw ciemny (`theme`) i jasny (`themeLight`):
  // oba mają kształt `ThemeColors` i tak samo trafiają do zmiennych CSS
  // (App.tsx / AdminApp.tsx → setThemeOverrides → applyTheme). Wcześniej
  // walidowany był tylko ciemny — uszkodzony `themeLight` (brak koloru albo
  // zły format) wpisywał `undefined`/śmieć do zmiennych trybu jasnego, więc
  // gracz w jasnym motywie tracił tło albo tekst, dokładnie tak, jak przed
  // dodaniem tej kontroli dla ciemnego.
  const checkTheme = (label: string, palette: unknown): void => {
    if (palette === undefined) return;
    if (!isObject(palette)) {
      // Motyw będący liczbą albo tekstem (uszkodzony zapis) wywracał walidator
      // na `key in palette` niżej — `in` na wartości prostej rzuca wyjątek.
      add(`${label} nie jest obiektem z kolorami.`);
      return;
    }
    for (const [key, value] of Object.entries(palette)) {
      if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
        add(`${label}, pole ${key}: „${value}" nie jest kolorem w formacie #rrggbb.`);
      }
    }
    // Brakujący kolor wpisywał się do zmiennych CSS jako `undefined`, więc
    // element tracił tło albo tekst — a błąd był nie do namierzenia, bo
    // walidacja sprawdzała tylko te pola, które akurat były.
    const missing = Object.keys(DEFAULT_THEME).filter((key) => !(key in palette));
    if (missing.length > 0) {
      add(`${label}: brakuje kolorów: ${missing.join(', ')}.`);
    }
  };

  const themed = data as Partial<GameContent>;
  checkTheme('Motyw', themed.theme);
  checkTheme('Motyw jasny', themed.themeLight);

  return { ok: errors.length === 0, errors };
}
