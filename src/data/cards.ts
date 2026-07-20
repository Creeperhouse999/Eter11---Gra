import type { Card } from '../engine/types';

/**
 * Karty kompetencji, talentów i mentorów.
 *
 * Źródła nazw:
 * - listy kompetencji i talentów z instrukcji gry,
 * - postacie nazwane wprost w opisach problemów (Detektyw Danych,
 *   Strażnik Prawdy, Mistrz Współpracy i pozostałe) — te są jednocześnie
 *   kartami bonusowymi dla odpowiednich problemów.
 *
 * Karty oznaczone `draft: true` zostały dopisane technicznie i wymagają
 * weryfikacji merytorycznej przez zespół.
 */

const psychological: Card[] = [
  { id: 'psy-emocje', name: 'Regulacja emocji', category: 'psychological', icon: 'balance', description: 'Pomaga zapanować nad złością i strachem, zanim zrobią szkodę.' },
  { id: 'psy-odpornosc', name: 'Odporność psychiczna', category: 'psychological', icon: 'shield', description: 'Pozwala nie poddać się, gdy coś idzie źle.' },
  { id: 'psy-uwaznosc', name: 'Uważność', category: 'psychological', icon: 'eye', description: 'Zauważa to, co inni przeoczą — także własne emocje.' },
  { id: 'psy-asertywnosc', name: 'Asertywność', category: 'psychological', icon: 'hand', description: 'Umie powiedzieć „nie" i obronić własne zdanie bez krzywdzenia innych.' },
  { id: 'psy-sluchanie', name: 'Aktywne słuchanie', category: 'psychological', icon: 'ear', description: 'Słucha, żeby zrozumieć, a nie żeby odpowiedzieć.' },
  { id: 'psy-straznik-spokoju', name: 'Strażnik Spokoju', category: 'psychological', icon: 'dove', description: 'Pomaga ludziom zachować spokój i podejmować rozsądne decyzje.' },
  { id: 'psy-straznik-natury', name: 'Strażnik Natury', category: 'psychological', icon: 'sprout', description: 'Pokazuje, że nawet małe codzienne decyzje chronią Ziemię.' },
  { id: 'psy-dowodca-misji', name: 'Dowódca Misji', category: 'psychological', icon: 'medal', description: 'Prowadzi drużynę do celu i pilnuje, żeby nikt nie został sam.' },
  { id: 'psy-medrzec', name: 'Mędrzec Spokojnego Serca', category: 'psychological', icon: 'sage', description: 'Pomaga odzyskać odwagę, spokój i wiarę w siebie.' },
  { id: 'psy-priorytety', name: 'Poczucie priorytetów', category: 'psychological', icon: 'balance', description: 'Wie, co naprawdę ważne, a co tylko głośne.', draft: true },
];

const digital: Card[] = [
  { id: 'dig-programowanie', name: 'Programowanie', category: 'digital', icon: 'code', description: 'Pisze kod, który rozwiązuje problemy.' },
  { id: 'dig-robotyka', name: 'Robotyka', category: 'digital', icon: 'robot', description: 'Buduje i naprawia maszyny.' },
  { id: 'dig-analiza-danych', name: 'Analiza danych', category: 'digital', icon: 'chart', description: 'Znajduje wzory tam, gdzie inni widzą chaos liczb.' },
  { id: 'dig-ai', name: 'Projektant AI', category: 'digital', icon: 'network', description: 'Tworzy inteligentne systemy, które pomagają ludziom.' },
  { id: 'dig-detektyw-danych', name: 'Detektyw Danych', category: 'digital', icon: 'search', description: 'Analizuje informacje z całego świata i znajduje ukryte źródło problemu.' },
  { id: 'dig-mistrz-internetu', name: 'Mistrz Internetu', category: 'digital', icon: 'globe', description: 'Umie zgłaszać obraźliwe treści i zatrzymać internetowych hejterów.' },
  { id: 'dig-bezpieczenstwo', name: 'Tworzenie zabezpieczeń', category: 'digital', icon: 'lock', description: 'Buduje ochronę, zanim ktoś zdąży zaatakować.' },
  { id: 'dig-projektant-przyszlosci', name: 'Projektant Przyszłości', category: 'digital', icon: 'bulb', description: 'Wymyśla nowe materiały i technologie, których jeszcze nie ma.' },
  { id: 'dig-mistrz-planowania', name: 'Mistrz Planowania', category: 'digital', icon: 'map', description: 'Wyznacza najlepszą trasę i sprawdza, gdzie pomoc jest najpotrzebniejsza.' },
  { id: 'dig-analog', name: 'Umiejętności analogowe', category: 'digital', icon: 'radio', description: 'Radzi sobie bez internetu: mapa papierowa, krótkofalówka, notes.', draft: true },
];

const social: Card[] = [
  { id: 'soc-komunikacja', name: 'Komunikacja', category: 'social', icon: 'message', description: 'Mówi tak, że inni rozumieją i chcą słuchać.' },
  { id: 'soc-wspolpraca', name: 'Współpraca', category: 'social', icon: 'handshake', description: 'Łączy siły zamiast ciągnąć w swoją stronę.' },
  { id: 'soc-krytyczne', name: 'Krytyczne myślenie', category: 'social', icon: 'puzzle', description: 'Pyta „skąd to wiesz?" zanim uwierzy.' },
  { id: 'soc-rozwiazywanie', name: 'Rozwiązywanie problemów', category: 'social', icon: 'wrench', description: 'Rozkłada wielki problem na małe, wykonalne kroki.' },
  { id: 'soc-przyszlosciowe', name: 'Myślenie przyszłościowe', category: 'social', icon: 'telescope', description: 'Przewiduje skutki decyzji, zanim zapadną.' },
  { id: 'soc-mistrz-relacji', name: 'Mistrz Dobrych Relacji', category: 'social', icon: 'hearts', description: 'Pomaga ludziom spokojnie porozmawiać i rozwiązać konflikt.' },
  { id: 'soc-straznik-slowa', name: 'Strażnik Dobrego Słowa', category: 'social', icon: 'megaphone', description: 'Pokazuje innym, jak wspierać zamiast wyśmiewać.' },
  { id: 'soc-obronca', name: 'Obrońca Przyjaciół', category: 'social', icon: 'cape', description: 'Nie stoi z boku — staje w obronie krzywdzonych.' },
  { id: 'soc-straznik-prawdy', name: 'Strażnik Prawdy', category: 'social', icon: 'check', description: 'Przekazuje sprawdzone informacje i zatrzymuje plotki.' },
  { id: 'soc-spolecznik', name: 'Społecznik', category: 'social', icon: 'heartHands', description: 'Organizuje zbiórki i zachęca innych do pomocy.' },
  { id: 'soc-mediator', name: 'Mediator', category: 'social', icon: 'peace', description: 'Znajduje wspólny język tam, gdzie wszyscy się kłócą.' },
  { id: 'soc-mistrz-wspolpracy', name: 'Mistrz Współpracy', category: 'social', icon: 'earth', description: 'Łączy ludzi, firmy i miasta wokół jednego celu.' },
];

const talents: Card[] = [
  { id: 'tal-kreatywnosc', name: 'Kreatywność', category: 'talent', icon: 'palette', description: 'Wymyśla to, czego nikt wcześniej nie wymyślił.' },
  { id: 'tal-empatia', name: 'Empatia', category: 'talent', icon: 'heart', description: 'Czuje to, co czują inni.' },
  { id: 'tal-odwaga', name: 'Odwaga', category: 'talent', icon: 'lion', description: 'Działa mimo strachu.' },
  { id: 'tal-wytrwalosc', name: 'Wytrwałość', category: 'talent', icon: 'mountain', description: 'Nie odpuszcza, nawet gdy jest trudno.' },
  { id: 'tal-ciekawosc', name: 'Ciekawość', category: 'talent', icon: 'lens', description: 'Pyta „dlaczego?" tak długo, aż znajdzie odpowiedź.' },
  { id: 'tal-organizacja', name: 'Organizacja', category: 'talent', icon: 'clipboard', description: 'Zamienia bałagan w plan.' },
  { id: 'tal-szybka-nauka', name: 'Szybkie uczenie się', category: 'talent', icon: 'bolt', description: 'Uczy się nowej rzeczy w tempie, które zaskakuje innych.' },
  { id: 'tal-wspolpraca', name: 'Talent współpracy', category: 'talent', icon: 'people', description: 'Sprawia, że grupa działa lepiej niż suma jej członków.' },
];

const mentors: Card[] = [
  { id: 'men-wynalazca', name: 'Wielki Wynalazca', category: 'mentor', icon: 'flask', description: 'Pomaga stworzyć rozwiązanie, którego nikt wcześniej nie wymyślił.' },
  { id: 'men-wizjoner', name: 'Wizjoner', category: 'mentor', icon: 'crystal', description: 'Widzi, dokąd to wszystko zmierza.' },
  { id: 'men-opiekun', name: 'Opiekun Społeczności', category: 'mentor', icon: 'handsOpen', description: 'Organizuje pomoc dla tych, którzy sami sobie nie poradzą.' },
  { id: 'men-lider', name: 'Lider', category: 'mentor', icon: 'flag', description: 'Bierze odpowiedzialność, gdy inni się wahają.' },
  { id: 'men-badacz', name: 'Badacz', category: 'mentor', icon: 'microscope', description: 'Sprawdza fakty, zanim ktoś zdąży zgadywać.' },
  { id: 'men-konstruktor', name: 'Konstruktor', category: 'mentor', icon: 'crane', description: 'Zamienia pomysł w działającą rzecz.' },
  { id: 'men-architekt', name: 'Architekt Przyszłości', category: 'mentor', icon: 'columns', description: 'Widzi szeroko i łączy pomysły wielu osób w jedną całość.' },
  { id: 'men-straznik-jutra', name: 'Strażnik Dobrego Jutra', category: 'mentor', icon: 'sunrise', description: 'Dba, żeby pomoc działała także jutro, nie tylko dziś.' },
  { id: 'men-starzec', name: 'Starzec spoza Sieci', category: 'mentor', icon: 'elder', description: 'Żyje bez technologii i widzi świat takim, jaki jest naprawdę.' },
  { id: 'men-przedsiebiorca', name: 'Przedsiębiorca Zmiany', category: 'mentor', icon: 'rocket', description: 'Sprawia, że dobre rozwiązania trafiają do sklepów i domów.' },
];

/** Karty specjalne — pojedyncze, rzadkość jest częścią zasad. */
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
  ...talents,
  ...mentors,
  ...special,
];

/**
 * Buduje talię do rozgrywki.
 *
 * Kompetencje, talenty i mentorzy występują po dwa egzemplarze — przy czterech
 * graczach pojedyncza talia kończyłaby się w połowie gry. Karty specjalne
 * (ETER11, Czarny Łabędź) pozostają pojedyncze, żeby zachować efekt rzadkości.
 */
export function buildDeck(cards: Card[] = ALL_CARDS): Card[] {
  const isSpecial = (card: Card) =>
    card.category === 'eter11' || card.category === 'blackswan';

  const specialCards = cards.filter(isSpecial);
  const regular = cards.filter((card) => !isSpecial(card));
  const copies = regular.flatMap((card) => [card, { ...card, id: `${card.id}-b` }]);

  return [...copies, ...specialCards];
}
