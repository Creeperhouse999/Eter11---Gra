import type { Card, Problem } from '../engine/types';

/**
 * Samouczek: osobny tryb dla jednej osoby, prowadzony krok po kroku.
 *
 * To nie jest zwykła gra z podpowiedziami. Talia, ręka i problem są ustawione
 * tak, żeby każdy krok dało się wykonać — inaczej ETER11 kazałby położyć
 * kartę, której gracz nie ma. Scenariusz prowadzi przez sześć rzeczy:
 * dopasowanie koloru, zagranie karty, wymianę przy braku ruchu, domknięcie
 * problemu, zabranie karty na postać i to, czego solo pokazać się nie da —
 * dawanie kart innym graczom.
 */

export type TutorialGoal =
  | 'intro'
  | 'selectCard'
  | 'playFirst'
  | 'playSecond'
  | 'playThird'
  | 'swapCards'
  | 'playAfterSwap'
  | 'finish'
  | 'takeCard'
  | 'outro';

export interface TutorialStep {
  id: string;
  goal: TutorialGoal;
  /** Krok bez zadania — gracz tylko czyta i naciska „Dalej". */
  readOnly?: boolean;
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
    id: 'welcome',
    goal: 'intro',
    readOnly: true,
    allow: [],
    say: 'Cześć, jestem ETER11. Za chwilę nauczę Cię grać. Na środku stołu leży problem — to on jest Waszym przeciwnikiem. Żeby go pokonać, trzeba zamknąć pięć ścianek wokół jego karty.',
    praise: 'Idziemy dalej.',
  },
  {
    id: 'slots',
    goal: 'intro',
    readOnly: true,
    allow: [],
    say: 'Każda ścianka ma kategorię i kolor. Kolor jest najważniejszy — tylko karta w tym samym kolorze ją zamknie. Kolor do koloru, to cała zasada.',
    praise: 'Idziemy dalej.',
  },
  {
    id: 'look',
    goal: 'selectCard',
    allow: [],
    // Bez „dowolną": dwie karty w ręku nie pasują nigdzie i klikając je
    // gracz dostałby wyjaśnienie zamiast obiecanej świecącej ścianki.
    say: 'To Twoje karty. Każda ma kolor w górnym pasku. Kliknij czerwoną, a pokażę Ci, gdzie pasuje.',
    praise: 'Widzisz? Ścianka w tym samym kolorze zaświeciła.',
    nudge: 'Kliknij kartę z czerwonym paskiem u góry.',
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
    // Trzecia czerwona karta musi zejść z ręki, zanim ETER11 powie
    // „nic nie pasuje" — inaczej mówiłby to, mając w ręku pasującą kartę.
    id: 'third',
    goal: 'playThird',
    allow: ['play'],
    say: 'Została Ci jeszcze jedna czerwona karta. Połóż ją na ostatniej czerwonej ściance.',
    praise: 'Trzy ścianki zamknięte. Zostały dwie niebieskie.',
    nudge: 'Czerwona karta pasuje do czerwonej ścianki — kliknij ją.',
  },
  {
    id: 'swap',
    goal: 'swapCards',
    allow: ['swap'],
    say: 'W ręku zostały same karty zielone — żadna nie pasuje do niebieskich ścianek. Tak też bywa. Wtedy wymieniasz karty na nowe: naciśnij „Wymieniam karty", potem „Zaznacz nieprzydatne" i potwierdź.',
    praise: 'Właśnie tak. Wymiana kosztuje Twój ruch w tej rundzie, ale daje nowe karty.',
    nudge: 'Przycisk „Wymieniam karty" jest na dole, obok „Pasuję". Zaznacz karty zielone.',
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
    // Bez wymiany: każda zużywa rundę, a na tym kroku zostało ich niewiele.
    // Dziecko, które zamiast położyć kartę kilka razy kliknęło „Wymieniam
    // karty", przegrywało misję samouczka i utykało — dymek dalej prosił
    // o dokończenie problemu, którego nie było już jak dokończyć. Tutaj
    // wymiana nie jest do niczego potrzebna: dymek sam mówi, że dziecko ma
    // w ręku wszystko.
    allow: ['play'],
    say: 'Została ostatnia ścianka. Dokończ problem — masz w ręku wszystko, czego trzeba.',
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
  {
    // Ostatni krok tłumaczy to, czego samouczek nie może pokazać: dawanie
    // kart i trzy poziomy wygranej wymagają drugiego gracza przy stole.
    id: 'outro',
    goal: 'outro',
    readOnly: true,
    allow: [],
    say: 'Grając z kimś, zamiast brać kartę dla siebie możesz ją oddać innemu graczowi. Dostajesz wtedy punkt doświadczenia za uczenie innych — dzielenie się opłaca się tak samo jak zbieranie.',
    praise: 'Zostało ostatnie.',
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
    { key: 'mentor', family: 'red', hint: 'Ktoś, kto weźmie odpowiedzialność' },
    { key: 'talent', family: 'red', hint: 'Odwaga albo wytrwałość' },
    { key: 'psychological', family: 'red', hint: 'Siła, żeby się nie poddać' },
    { key: 'social', family: 'blue', hint: 'Ktoś, kto zapyta „skąd to wiesz?"' },
    { key: 'digital', family: 'blue', hint: 'Ktoś, kto przeanalizuje dane' },
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
 * Uwaga na mechanikę: przy jednym graczu każdy ruch kończy rundę, więc po
 * każdym zagraniu gracz dobiera kartę. Dlatego talia zaczyna się od kart
 * zielonych (patrz TUTORIAL_DECK) — po zagraniu trzech czerwonych w ręku
 * zostaje sama zieleń i krok „nic nie pasuje, wymień" mówi prawdę.
 */
export const TUTORIAL_HAND: Card[] = [
  card('tut-men-red', 'Lider', 'mentor', 'red', 'flag', 'Bierze odpowiedzialność, gdy inni się wahają.'),
  card('tut-tal-red', 'Odwaga', 'talent', 'red', 'lion', 'Działa mimo strachu.'),
  card('tut-psy-red', 'Odporność psychiczna', 'psychological', 'red', 'shield', 'Pozwala nie poddać się, gdy coś idzie źle.'),
  card('tut-soc-green', 'Współpraca', 'social', 'green', 'handshake', 'Łączy siły zamiast ciągnąć w swoją stronę.'),
  card('tut-dig-green', 'Umiejętności analogowe', 'digital', 'green', 'radio', 'Radzi sobie bez internetu.'),
];

/**
 * Talia samouczka. Kolejność jest częścią scenariusza, nie ozdobą.
 *
 * Przy jednym graczu każdy ruch kończy rundę, a koniec rundy rozdaje po
 * karcie — gracz dobiera więc także między zagraniami, nie tylko przy
 * wymianie. Gdyby na wierzchu leżały karty niebieskie, po trzech zagraniach
 * miałby czym zamknąć kolejne ścianki i krok „nic nie pasuje, wymień je"
 * byłby nieprawdą: ETER11 kazałby wymieniać karty, które pasują.
 *
 * Dlatego pierwsze trzy karty są zielone — bezużyteczne przy tym problemie.
 * Po zagraniu trzech czerwonych ręka jest sama zieleń, wymiana staje się
 * jedynym sensownym ruchem, a niebieskie przychodzą dopiero z niej i
 * zamykają dwie ostatnie ścianki.
 */
export const TUTORIAL_DECK: Card[] = [
  card('tut-soc-green-2', 'Uważne słuchanie', 'social', 'green', 'ear', 'Słyszy, co ktoś mówi między słowami.'),
  card('tut-dig-green-2', 'Naprawianie rzeczy', 'digital', 'green', 'wrench', 'Woli naprawić, niż wyrzucić.'),
  card('tut-psy-green-1', 'Cierpliwość', 'psychological', 'green', 'mountain', 'Czeka, aż nadejdzie właściwy moment.'),
  card('tut-soc-blue-1', 'Krytyczne myślenie', 'social', 'blue', 'puzzle', 'Pyta „skąd to wiesz?" zanim uwierzy.'),
  card('tut-dig-blue-1', 'Analiza danych', 'digital', 'blue', 'chart', 'Znajduje wzory tam, gdzie inni widzą chaos.'),
  card('tut-soc-blue-2', 'Myślenie przyszłościowe', 'social', 'blue', 'telescope', 'Przewiduje skutki decyzji.'),
  card('tut-dig-blue-2', 'Projektant AI', 'digital', 'blue', 'network', 'Tworzy systemy, które pomagają ludziom.'),
  // Zapas. Wymiana pięciu kart pobiera pięć, a wcześniejsze dobierania
  // zjadają wierzch talii — bez tej karty gracz dostawałby cztery i kończył
  // samouczek dokładnie na styk, bez marginesu na własną kolejność ruchów.
  card('tut-soc-blue-3', 'Rozwiązywanie konfliktów', 'social', 'blue', 'dove', 'Szuka wyjścia, które da się przyjąć obu stronom.'),
  card('tut-dig-blue-3', 'Bezpieczeństwo w sieci', 'digital', 'blue', 'lock', 'Wie, czego nie klikać i komu nie ufać.'),
];

/** Gracz samouczka. Jedna osoba — nikt nie czeka na swoją kolej. */
export const TUTORIAL_PLAYER = {
  id: 'tutorial-player',
  name: 'Ty',
  characterId: 'ch-odkrywca',
};
