import type { Card, Problem } from '../engine/types';

/**
 * Samouczek: osobny tryb dla jednej osoby, prowadzony krok po kroku.
 *
 * To nie jest zwykła gra z podpowiedziami. Talia, ręka i problem są ustawione
 * tak, żeby każdy krok dało się wykonać — inaczej ETER11 kazałby położyć
 * kartę, której gracz nie ma. Scenariusz prowadzi przez cztery rzeczy:
 * dopasowanie koloru, zagranie karty, wymianę przy braku ruchu i domknięcie
 * problemu.
 */

export type TutorialGoal =
  | 'selectCard'
  | 'playFirst'
  | 'playSecond'
  | 'swapCards'
  | 'playAfterSwap'
  | 'finish'
  | 'takeCard';

export interface TutorialStep {
  id: string;
  goal: TutorialGoal;
  /** Co ETER11 mówi przed wykonaniem kroku. */
  say: string;
  /** Pochwała po wykonaniu. */
  praise: string;
  /** Wskazówka po chwili bezruchu. */
  nudge?: string;
  /**
   * Ruchy dozwolone na tym kroku. Reszta jest zablokowana, żeby gracz nie
   * wyprzedził scenariusza i nie zobaczył podpowiedzi bez sensu.
   */
  allow: Array<'play' | 'swap' | 'pass'>;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'look',
    goal: 'selectCard',
    allow: [],
    say: 'Cześć, jestem ETER11. Nauczę Cię grać. Na środku leży problem, a wokół niego pięć ścianek — każda czeka na kartę w swoim kolorze. Kliknij dowolną kartę z ręki.',
    praise: 'Widzisz? Ścianka, do której ta karta pasuje, zaświeciła.',
    nudge: 'Kliknij którąkolwiek kartę na dole ekranu.',
  },
  {
    id: 'play',
    goal: 'playFirst',
    allow: ['play'],
    say: 'Teraz przeciągnij tę kartę na świecącą ściankę. Możesz też po prostu kliknąć ściankę.',
    praise: 'Brawo! Ścianka zamknięta. Tak właśnie rozwiązuje się problemy — po kawałku.',
    nudge: 'Chwyć kartę i przeciągnij ją na świecącą ściankę.',
  },
  {
    id: 'second',
    goal: 'playSecond',
    allow: ['play'],
    say: 'Zasada jest prosta: kolor karty musi zgadzać się z kolorem ścianki. Połóż następną kartę.',
    praise: 'Dokładnie tak. Kolor do koloru.',
    nudge: 'Kliknij kartę, a zobaczysz, która ścianka się zapali.',
  },
  {
    id: 'swap',
    goal: 'swapCards',
    allow: ['swap'],
    say: 'Uwaga — teraz żadna Twoja karta nie pasuje do wolnych ścianek. Tak też bywa. Wtedy wymieniasz karty: naciśnij „Wymieniam karty", zaznacz te nieprzydatne i potwierdź.',
    praise: 'Właśnie tak. Wymiana kosztuje Twój ruch w tej rundzie, ale daje nowe karty.',
    nudge: 'Przycisk „Wymieniam karty" jest na dole, obok „Pasuję".',
  },
  {
    id: 'after-swap',
    goal: 'playAfterSwap',
    allow: ['play'],
    say: 'Masz świeże karty. Sprawdź, czy któraś pasuje, i połóż ją.',
    praise: 'Coraz lepiej. Widzisz, jak wymiana odblokowała ruch?',
    nudge: 'Klikaj kolejne karty — któraś zapali ściankę.',
  },
  {
    id: 'finish',
    goal: 'finish',
    allow: ['play', 'swap'],
    say: 'Zostały dwie ścianki. Dokończ problem — masz w ręku wszystko, czego trzeba.',
    praise: 'Problem rozwiązany! Zostało jeszcze jedno.',
  },
  {
    id: 'take',
    goal: 'takeCard',
    allow: [],
    say: 'Za rozwiązanie problemu zabierasz jedną ze swoich kart na kartę postaci — zostaje z Tobą na całą grę. Wybierz kartę i naciśnij „Zabieram na postać".',
    praise: 'Gotowe. Ta karta jest teraz Twoja — możesz jej użyć w kolejnych misjach.',
    nudge: 'Pod każdą zagraną kartą jest przycisk „Zabieram na postać".',
  },
];

/**
 * Problem samouczka.
 *
 * Pięć ścianek w trzech rodzinach: czerwona uczy dopasowania, niebieskie
 * pojawiają się dopiero po wymianie. Dzięki temu krok „nie masz czym zagrać"
 * jest prawdziwy, a nie udawany.
 */
export const TUTORIAL_PROBLEM: Problem = {
  id: 'tutorial-1',
  name: 'Pierwsza misja',
  icon: 'spark',
  type: 'cooperation',
  story:
    'To ćwiczenie. Nic nikomu nie grozi — możesz spokojnie sprawdzić, jak działa gra.',
  antagonist: 'Nikt. To trening.',
  consequence: 'Nic. Spróbujesz jeszcze raz.',
  goal: 'Poznać zasady gry.',
  slots: [
    { key: 'mentor', family: 'red', hint: 'Ktoś, kto weźmie odpowiedzialność', bonusCardIds: [] },
    { key: 'talent', family: 'red', hint: 'Odwaga albo wytrwałość', bonusCardIds: [] },
    { key: 'psychological', family: 'red', hint: 'Siła, żeby się nie poddać', bonusCardIds: [] },
    { key: 'social', family: 'blue', hint: 'Ktoś, kto zapyta „skąd to wiesz?"', bonusCardIds: [] },
    { key: 'digital', family: 'blue', hint: 'Ktoś, kto przeanalizuje dane', bonusCardIds: [] },
  ],
};

const card = (
  id: string,
  name: string,
  category: Card['category'],
  family: Card['family'],
  icon: string,
  description: string,
): Card => ({ id, name, category, family, icon, description });

/**
 * Ręka startowa: trzy karty czerwone pasujące do trzech ścianek, dwie
 * zielone, które nie pasują nigdzie.
 *
 * Po zagraniu trzech czerwonych zostają dwie zielone — i wtedy krok wymiany
 * ma sens, bo gracz naprawdę nie ma czym zagrać.
 */
export const TUTORIAL_HAND: Card[] = [
  card('tut-men-red', 'Lider', 'mentor', 'red', 'flag', 'Bierze odpowiedzialność, gdy inni się wahają.'),
  card('tut-tal-red', 'Odwaga', 'talent', 'red', 'lion', 'Działa mimo strachu.'),
  card('tut-psy-red', 'Odporność psychiczna', 'psychological', 'red', 'shield', 'Pozwala nie poddać się, gdy coś idzie źle.'),
  card('tut-soc-green', 'Współpraca', 'social', 'green', 'handshake', 'Łączy siły zamiast ciągnąć w swoją stronę.'),
  card('tut-dig-green', 'Umiejętności analogowe', 'digital', 'green', 'radio', 'Radzi sobie bez internetu.'),
];

/**
 * Talia samouczka: same karty niebieskie pasujące do dwóch ostatnich ścianek.
 *
 * Po wymianie gracz dostanie dokładnie to, czego potrzebuje — samouczek nie
 * może zależeć od szczęścia w losowaniu.
 */
export const TUTORIAL_DECK: Card[] = [
  card('tut-soc-blue-1', 'Krytyczne myślenie', 'social', 'blue', 'puzzle', 'Pyta „skąd to wiesz?" zanim uwierzy.'),
  card('tut-dig-blue-1', 'Analiza danych', 'digital', 'blue', 'chart', 'Znajduje wzory tam, gdzie inni widzą chaos.'),
  card('tut-soc-blue-2', 'Myślenie przyszłościowe', 'social', 'blue', 'telescope', 'Przewiduje skutki decyzji.'),
  card('tut-dig-blue-2', 'Projektant AI', 'digital', 'blue', 'network', 'Tworzy systemy, które pomagają ludziom.'),
  card('tut-soc-blue-3', 'Rozwiązywanie problemów', 'social', 'blue', 'wrench', 'Rozkłada wielki problem na małe kroki.'),
  card('tut-dig-blue-3', 'Mistrz Planowania', 'digital', 'blue', 'map', 'Wyznacza najlepszą trasę.'),
];

/** Gracz samouczka. Jedna osoba — nikt nie czeka na swoją kolej. */
export const TUTORIAL_PLAYER = {
  id: 'tutorial-player',
  name: 'Ty',
  characterId: 'ch-odkrywca',
};
