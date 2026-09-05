import type { Card } from '../engine/types';

/**
 * Talia kart ETER11.
 *
 * Porządek: pięć kategorii, w każdej cztery rodziny, w każdej rodzinie trzy
 * karty — czyli 60 kart kompetencji, talentów i mentorów. Do tego karty
 * specjalne: ETER11 i Czarne Łabędzie. Rodzina ma swój kolor i symbol, a ścianka problemu
 * wymaga konkretnej rodziny, więc dziecko dopasowuje kolor do koloru bez
 * czytania opisów.
 *
 * Karty oznaczone `draft: true` zostały dopisane technicznie i wymagają
 * weryfikacji merytorycznej przez zespół.
 */

// ── Kompetencje psychologiczne ────────────────────────────────────────────

const psychological: Card[] = [
  // Czerwona — Siła wewnętrzna
  { id: 'psy-r-odpornosc', name: 'Odporność psychiczna', category: 'psychological', family: 'red', icon: 'shield', description: 'Pozwala nie poddać się, gdy coś idzie źle.' },
  { id: 'psy-r-asertywnosc', name: 'Asertywność', category: 'psychological', family: 'red', icon: 'hand', description: 'Umie powiedzieć „nie" i obronić swoje zdanie bez krzywdzenia innych.' },
  { id: 'psy-r-wytrwalosc', name: 'Konsekwencja', category: 'psychological', family: 'red', icon: 'mountain', description: 'Wraca do sprawy, choć raz już się nie udało.' },

  // Niebieska — Spokój i uważność
  { id: 'psy-b-emocje', name: 'Regulacja emocji', category: 'psychological', family: 'blue', icon: 'balance', description: 'Pomaga zapanować nad złością i strachem, zanim zrobią szkodę.' },
  { id: 'psy-b-uwaznosc', name: 'Uważność', category: 'psychological', family: 'blue', icon: 'eye', description: 'Zauważa to, co inni przeoczą — także własne emocje.' },
  { id: 'psy-b-straznik-spokoju', name: 'Strażnik Spokoju', category: 'psychological', family: 'blue', icon: 'dove', description: 'Pomaga ludziom zachować spokój i podejmować rozsądne decyzje.' },

  // Żółta — Zrozumienie innych
  { id: 'psy-y-sluchanie', name: 'Aktywne słuchanie', category: 'psychological', family: 'yellow', icon: 'ear', description: 'Słucha, żeby zrozumieć, a nie żeby odpowiedzieć.' },
  { id: 'psy-y-medrzec', name: 'Mędrzec Spokojnego Serca', category: 'psychological', family: 'yellow', icon: 'sage', description: 'Pomaga odzyskać odwagę, spokój i wiarę w siebie.' },
  { id: 'psy-y-wsparcie', name: 'Dobre słowo', category: 'psychological', family: 'yellow', icon: 'hearts', description: 'Mówi to jedno zdanie, po którym komuś robi się lżej.', draft: true },

  // Zielona — Kierowanie sobą
  { id: 'psy-g-dowodca', name: 'Dowódca Misji', category: 'psychological', family: 'green', icon: 'medal', description: 'Prowadzi drużynę do celu i pilnuje, żeby nikt nie został sam.' },
  { id: 'psy-g-priorytety', name: 'Poczucie priorytetów', category: 'psychological', family: 'green', icon: 'clipboard', description: 'Wie, co naprawdę ważne, a co tylko głośne.', draft: true },
  { id: 'psy-g-natura', name: 'Strażnik Natury', category: 'psychological', family: 'green', icon: 'sprout', description: 'Pokazuje, że nawet małe codzienne decyzje chronią Ziemię.' },
];

// ── Kompetencje cyfrowe ───────────────────────────────────────────────────

const digital: Card[] = [
  // Czerwona — Bezpieczeństwo
  { id: 'dig-r-bezpieczenstwo', name: 'Tworzenie zabezpieczeń', category: 'digital', family: 'red', icon: 'lock', description: 'Buduje ochronę, zanim ktoś zdąży zaatakować.' },
  { id: 'dig-r-mistrz-internetu', name: 'Mistrz Internetu', category: 'digital', family: 'red', icon: 'globe', description: 'Umie zgłaszać obraźliwe treści i zatrzymać internetowych hejterów.' },
  { id: 'dig-r-detektyw', name: 'Detektyw Danych', category: 'digital', family: 'red', icon: 'search', description: 'Analizuje informacje z całego świata i znajduje ukryte źródło problemu.' },

  // Niebieska — Dane i analiza
  { id: 'dig-b-analiza', name: 'Analiza danych', category: 'digital', family: 'blue', icon: 'chart', description: 'Znajduje wzory tam, gdzie inni widzą chaos liczb.' },
  { id: 'dig-b-ai', name: 'Projektant AI', category: 'digital', family: 'blue', icon: 'network', description: 'Tworzy inteligentne systemy, które pomagają ludziom.' },
  { id: 'dig-b-planowanie', name: 'Mistrz Planowania', category: 'digital', family: 'blue', icon: 'map', description: 'Wyznacza najlepszą trasę i sprawdza, gdzie pomoc jest najpotrzebniejsza.' },

  // Żółta — Tworzenie i kod
  { id: 'dig-y-programowanie', name: 'Programowanie', category: 'digital', family: 'yellow', icon: 'code', description: 'Pisze kod, który rozwiązuje problemy.' },
  { id: 'dig-y-robotyka', name: 'Robotyka', category: 'digital', family: 'yellow', icon: 'robot', description: 'Buduje i naprawia maszyny.' },
  { id: 'dig-y-projektant', name: 'Projektant Przyszłości', category: 'digital', family: 'yellow', icon: 'bulb', description: 'Wymyśla nowe materiały i technologie, których jeszcze nie ma.' },

  // Zielona — Świat bez sieci
  { id: 'dig-g-analog', name: 'Umiejętności analogowe', category: 'digital', family: 'green', icon: 'radio', description: 'Radzi sobie bez internetu: mapa papierowa, krótkofalówka, notes.' },
  { id: 'dig-g-naprawa', name: 'Naprawa sprzętu', category: 'digital', family: 'green', icon: 'wrench', description: 'Doprowadza do działania to, co inni chcieli wyrzucić.', draft: true },
  { id: 'dig-g-higiena', name: 'Higiena cyfrowa', category: 'digital', family: 'green', icon: 'eyeOff', description: 'Wie, kiedy odłożyć telefon i jak ustawić limity.' },
];

// ── Kompetencje poznawczo-społeczne ───────────────────────────────────────

const social: Card[] = [
  // Czerwona — Obrona i odwaga
  { id: 'soc-r-obronca', name: 'Obrońca Przyjaciół', category: 'social', family: 'red', icon: 'cape', description: 'Nie stoi z boku — staje w obronie krzywdzonych.' },
  { id: 'soc-r-straznik-slowa', name: 'Strażnik Dobrego Słowa', category: 'social', family: 'red', icon: 'megaphone', description: 'Pokazuje innym, jak wspierać zamiast wyśmiewać.' },
  { id: 'soc-r-straznik-prawdy', name: 'Strażnik Prawdy', category: 'social', family: 'red', icon: 'check', description: 'Przekazuje sprawdzone informacje i zatrzymuje plotki.' },

  // Niebieska — Myślenie i planowanie
  { id: 'soc-b-krytyczne', name: 'Krytyczne myślenie', category: 'social', family: 'blue', icon: 'puzzle', description: 'Pyta „skąd to wiesz?" zanim uwierzy.' },
  { id: 'soc-b-przyszlosciowe', name: 'Myślenie przyszłościowe', category: 'social', family: 'blue', icon: 'telescope', description: 'Przewiduje skutki decyzji, zanim zapadną.' },
  { id: 'soc-b-rozwiazywanie', name: 'Rozwiązywanie problemów', category: 'social', family: 'blue', icon: 'wrench', description: 'Rozkłada wielki problem na małe, wykonalne kroki.' },

  // Żółta — Porozumienie
  { id: 'soc-y-komunikacja', name: 'Komunikacja', category: 'social', family: 'yellow', icon: 'message', description: 'Mówi tak, że inni rozumieją i chcą słuchać.' },
  { id: 'soc-y-mediator', name: 'Mediator', category: 'social', family: 'yellow', icon: 'peace', description: 'Znajduje wspólny język tam, gdzie wszyscy się kłócą.' },
  { id: 'soc-y-relacje', name: 'Mistrz Dobrych Relacji', category: 'social', family: 'yellow', icon: 'hearts', description: 'Pomaga ludziom spokojnie porozmawiać i rozwiązać konflikt.' },

  // Zielona — Wsparcie i łagodność
  { id: 'soc-g-wspolpraca', name: 'Współpraca', category: 'social', family: 'green', icon: 'handshake', description: 'Łączy siły zamiast ciągnąć w swoją stronę.' },
  { id: 'soc-g-spolecznik', name: 'Społecznik', category: 'social', family: 'green', icon: 'heartHands', description: 'Organizuje zbiórki i zachęca innych do pomocy.' },
  { id: 'soc-g-mistrz-wspolpracy', name: 'Mistrz Współpracy', category: 'social', family: 'green', icon: 'earth', description: 'Łączy ludzi, firmy i miasta wokół jednego celu.' },
];

// ── Mentorzy ──────────────────────────────────────────────────────────────

const mentors: Card[] = [
  // Czerwona — Przywództwo
  { id: 'men-r-lider', name: 'Lider', category: 'mentor', family: 'red', icon: 'flag', description: 'Bierze odpowiedzialność, gdy inni się wahają.' },
  { id: 'men-r-przedsiebiorca', name: 'Przedsiębiorca Zmiany', category: 'mentor', family: 'red', icon: 'rocket', description: 'Sprawia, że dobre rozwiązania trafiają do sklepów i domów.' },
  { id: 'men-r-organizator', name: 'Organizator Akcji', category: 'mentor', family: 'red', icon: 'megaphone', description: 'Zbiera ludzi i ruszają tego samego dnia.', draft: true },

  // Niebieska — Nauka i badania
  { id: 'men-b-badacz', name: 'Badacz', category: 'mentor', family: 'blue', icon: 'microscope', description: 'Sprawdza fakty, zanim ktoś zdąży zgadywać.' },
  { id: 'men-b-wizjoner', name: 'Wizjoner', category: 'mentor', family: 'blue', icon: 'crystal', description: 'Widzi, dokąd to wszystko zmierza.' },
  { id: 'men-b-architekt', name: 'Architekt Przyszłości', category: 'mentor', family: 'blue', icon: 'columns', description: 'Widzi szeroko i łączy pomysły wielu osób w jedną całość.' },

  // Żółta — Wynalazczość
  { id: 'men-y-wynalazca', name: 'Wielki Wynalazca', category: 'mentor', family: 'yellow', icon: 'flask', description: 'Pomaga stworzyć rozwiązanie, którego nikt wcześniej nie wymyślił.' },
  { id: 'men-y-konstruktor', name: 'Konstruktor', category: 'mentor', family: 'yellow', icon: 'crane', description: 'Zamienia pomysł w działającą rzecz.' },
  { id: 'men-y-majster', name: 'Majster Improwizacji', category: 'mentor', family: 'yellow', icon: 'hammer', description: 'Buduje z tego, co akurat jest pod ręką.', draft: true },

  // Zielona — Troska i przyszłość
  { id: 'men-g-opiekun', name: 'Opiekun Społeczności', category: 'mentor', family: 'green', icon: 'handsOpen', description: 'Organizuje pomoc dla tych, którzy sami sobie nie poradzą.' },
  { id: 'men-g-straznik-jutra', name: 'Strażnik Dobrego Jutra', category: 'mentor', family: 'green', icon: 'sunrise', description: 'Dba, żeby pomoc działała także jutro, nie tylko dziś.' },
  { id: 'men-g-starzec', name: 'Starzec spoza Sieci', category: 'mentor', family: 'green', icon: 'elder', description: 'Żyje bez technologii i widzi świat takim, jaki jest naprawdę.' },
];

// ── Talenty ───────────────────────────────────────────────────────────────

const talents: Card[] = [
  // Czerwona — Odwaga
  { id: 'tal-r-odwaga', name: 'Odwaga', category: 'talent', family: 'red', icon: 'lion', description: 'Działa mimo strachu.' },
  { id: 'tal-r-wytrwalosc', name: 'Wytrwałość', category: 'talent', family: 'red', icon: 'mountain', description: 'Nie odpuszcza, nawet gdy jest trudno.' },
  { id: 'tal-r-inicjatywa', name: 'Inicjatywa', category: 'talent', family: 'red', icon: 'bolt', description: 'Zaczyna pierwszy, nie czekając na pozwolenie.', draft: true },

  // Niebieska — Ciekawość
  { id: 'tal-b-ciekawosc', name: 'Ciekawość', category: 'talent', family: 'blue', icon: 'lens', description: 'Pyta „dlaczego?" tak długo, aż znajdzie odpowiedź.' },
  { id: 'tal-b-szybka-nauka', name: 'Szybkie uczenie się', category: 'talent', family: 'blue', icon: 'spark', description: 'Uczy się nowej rzeczy w tempie, które zaskakuje innych.' },
  { id: 'tal-b-spostrzegawczosc', name: 'Spostrzegawczość', category: 'talent', family: 'blue', icon: 'eye', description: 'Widzi szczegół, który wszystkim umknął.', draft: true },

  // Żółta — Wyobraźnia
  { id: 'tal-y-kreatywnosc', name: 'Kreatywność', category: 'talent', family: 'yellow', icon: 'palette', description: 'Wymyśla to, czego nikt wcześniej nie wymyślił.' },
  { id: 'tal-y-organizacja', name: 'Organizacja', category: 'talent', family: 'yellow', icon: 'clipboard', description: 'Zamienia bałagan w plan.' },
  { id: 'tal-y-pomyslowosc', name: 'Pomysłowość', category: 'talent', family: 'yellow', icon: 'bulb', description: 'Znajduje drugie wyjście, gdy pierwsze jest zamknięte.', draft: true },

  // Zielona — Serce
  { id: 'tal-g-empatia', name: 'Empatia', category: 'talent', family: 'green', icon: 'heart', description: 'Czuje to, co czują inni.' },
  { id: 'tal-g-wspolpraca', name: 'Talent współpracy', category: 'talent', family: 'green', icon: 'people', description: 'Sprawia, że grupa działa lepiej niż suma jej członków.' },
  { id: 'tal-g-cierpliwosc', name: 'Cierpliwość', category: 'talent', family: 'green', icon: 'sprout', description: 'Daje innym czas, którego potrzebują.', draft: true },
];

// ── Karty specjalne ───────────────────────────────────────────────────────

/** Karty specjalne nie mają rodziny — ETER11 pasuje wszędzie. */
const special: Card[] = [
  {
    id: 'eter11-1',
    name: 'ETER11',
    category: 'eter11',
    icon: 'spark',
    description: 'Super Mentor. Zastępuje dowolną kartę potrzebną do rozwiązania problemu.',
  },
  {
    id: 'eter11-2',
    name: 'ETER11',
    category: 'eter11',
    icon: 'spark',
    description: 'Super Mentor. Zastępuje dowolną kartę potrzebną do rozwiązania problemu.',
  },
  {
    id: 'swan-extra',
    name: 'Czarny Łabędź: Kryzys się mnoży',
    category: 'blackswan',
    blackSwanKind: 'extraProblem',
    icon: 'swan',
    description: 'Pojawia się drugi problem. Musicie rozwiązać oba, żeby misja się udała.',
  },
  {
    id: 'swan-double',
    name: 'Czarny Łabędź: Sprawa się komplikuje',
    category: 'blackswan',
    blackSwanKind: 'doubleRequirements',
    icon: 'swan',
    description: 'Puste ścianki wymagają teraz dwóch kart. Te już zamknięte zostają zaliczone.',
  },
  {
    id: 'swan-swap',
    name: 'Czarny Łabędź: Wszystko się miesza',
    category: 'blackswan',
    blackSwanKind: 'swapHands',
    icon: 'swan',
    description: 'Przekazujecie sobie ręce zgodnie z ruchem wskazówek zegara.',
  },
];

export const ALL_CARDS: Card[] = [
  ...psychological,
  ...digital,
  ...social,
  ...mentors,
  ...talents,
  ...special,
];

/**
 * Buduje talię do rozgrywki.
 *
 * Karty kompetencji, talentów i mentorów występują po dwa egzemplarze —
 * przy czterech graczach i wymaganiu konkretnej rodziny pojedyncza talia
 * dawałaby zbyt małą szansę na trafienie właściwego koloru. Karty specjalne
 * pozostają pojedyncze, żeby zachować efekt rzadkości.
 */
export function buildDeck(
  cards: Card[] = ALL_CARDS,
  options?: {
    /**
     * Ile kopii każdej karty specjalnej (ETER11, Czarny Łabędź) trafia do
     * talii.
     *
     * Marcin zgłosił, że przy siedmiu problemach jeden gracz dostał ETER11
     * cztery razy, a drugi ani razu — przy pojedynczych kartach specjalnych
     * i podwojonych zwykłych trafienie zależało wyłącznie od tasowania.
     * Adam ustalił: „na całą talię ustalmy, że są 4 karty eter i 4 karty
     * Czarny Łabędź", tak jak w fizycznym pudełku.
     *
     * Brak wartości zostawia talię taką, jaka była — po jednej sztuce
     * z każdej karty specjalnej.
     */
    specialCopies?: number;
  },
): Card[] {
  const isSpecial = (card: Card) =>
    card.category === 'eter11' || card.category === 'blackswan';

  const specialCards = cards.filter(isSpecial);
  const regular = cards.filter((card) => !isSpecial(card));
  const copies = regular.flatMap((card) => [card, { ...card, id: `${card.id}-b` }]);

  const ileSpecjalnych = options?.specialCopies;
  if (ileSpecjalnych === undefined) {
    return [...copies, ...specialCards];
  }

  // Liczba dotyczy KATEGORII, nie pojedynczej karty: Adam ustalił „4 karty
  // eter i 4 karty Czarny Łabędź" na całą talię. Wariantów Łabędzia jest
  // kilka (różne zdarzenia), więc rozkładamy limit po równo między nie —
  // mnożenie każdego wariantu przez cztery dałoby dwanaście Łabędzi zamiast
  // czterech.
  const ile = Math.max(0, ileSpecjalnych);
  const specjalne: Card[] = [];

  for (const kategoria of ['eter11', 'blackswan'] as const) {
    const warianty = specialCards.filter((c) => c.category === kategoria);
    if (warianty.length === 0) continue;

    for (let i = 0; i < ile; i += 1) {
      // Po kolei w kółko: przy trzech wariantach i czterech kartach wychodzi
      // 2+1+1, a nie cztery kopie tego samego zdarzenia.
      const wzor = warianty[i % warianty.length];
      // Każda kopia z własnym identyfikatorem — silnik rozpoznaje karty po
      // `id`, więc kopie z tym samym id zachowywałyby się jak jedna karta:
      // zagranie jednej „zużyłoby" pozostałe.
      specjalne.push(i < warianty.length ? wzor : { ...wzor, id: `${wzor.id}-${i + 1}` });
    }
  }

  return [...copies, ...specjalne];
}

/**
 * Karty, które faktycznie trafiają do gry.
 *
 * Karty oznaczone `draft: true` to materiał roboczy — nowa karta rodzi się jako
 * wersja robocza i wymaga sprawdzenia, zanim wejdzie do rozgrywki. Panel mówi
 * redaktorowi wprost, że wersje robocze „nie trafiają do gry", a test pokrycia
 * ścianek liczy tylko karty nierobocze — więc ścieżka rozgrywki też musi je
 * odsiać, inaczej niedokończona karta wychodzi dzieciom do prawdziwej partii.
 */
export const playableCards = (cards: Card[] = ALL_CARDS): Card[] =>
  cards.filter((card) => !card.draft);
