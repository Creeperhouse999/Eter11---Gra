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
  { id: 'psy-emocje', name: 'Regulacja emocji', category: 'psychological', art: '🧘', description: 'Pomaga zapanować nad złością i strachem, zanim zrobią szkodę.' },
  { id: 'psy-odpornosc', name: 'Odporność psychiczna', category: 'psychological', art: '🛡️', description: 'Pozwala nie poddać się, gdy coś idzie źle.' },
  { id: 'psy-uwaznosc', name: 'Uważność', category: 'psychological', art: '👁️', description: 'Zauważa to, co inni przeoczą — także własne emocje.' },
  { id: 'psy-asertywnosc', name: 'Asertywność', category: 'psychological', art: '✋', description: 'Umie powiedzieć „nie" i obronić własne zdanie bez krzywdzenia innych.' },
  { id: 'psy-sluchanie', name: 'Aktywne słuchanie', category: 'psychological', art: '👂', description: 'Słucha, żeby zrozumieć, a nie żeby odpowiedzieć.' },
  { id: 'psy-straznik-spokoju', name: 'Strażnik Spokoju', category: 'psychological', art: '🕊️', description: 'Pomaga ludziom zachować spokój i podejmować rozsądne decyzje.' },
  { id: 'psy-straznik-natury', name: 'Strażnik Natury', category: 'psychological', art: '🌱', description: 'Pokazuje, że nawet małe codzienne decyzje chronią Ziemię.' },
  { id: 'psy-dowodca-misji', name: 'Dowódca Misji', category: 'psychological', art: '🎖️', description: 'Prowadzi drużynę do celu i pilnuje, żeby nikt nie został sam.' },
  { id: 'psy-medrzec', name: 'Mędrzec Spokojnego Serca', category: 'psychological', art: '🧙', description: 'Pomaga odzyskać odwagę, spokój i wiarę w siebie.' },
  { id: 'psy-priorytety', name: 'Poczucie priorytetów', category: 'psychological', art: '⚖️', description: 'Wie, co naprawdę ważne, a co tylko głośne.', draft: true },
];

const digital: Card[] = [
  { id: 'dig-programowanie', name: 'Programowanie', category: 'digital', art: '⌨️', description: 'Pisze kod, który rozwiązuje problemy.' },
  { id: 'dig-robotyka', name: 'Robotyka', category: 'digital', art: '🤖', description: 'Buduje i naprawia maszyny.' },
  { id: 'dig-analiza-danych', name: 'Analiza danych', category: 'digital', art: '📊', description: 'Znajduje wzory tam, gdzie inni widzą chaos liczb.' },
  { id: 'dig-ai', name: 'Projektant AI', category: 'digital', art: '🧠', description: 'Tworzy inteligentne systemy, które pomagają ludziom.' },
  { id: 'dig-detektyw-danych', name: 'Detektyw Danych', category: 'digital', art: '🔍', description: 'Analizuje informacje z całego świata i znajduje ukryte źródło problemu.' },
  { id: 'dig-mistrz-internetu', name: 'Mistrz Internetu', category: 'digital', art: '🌐', description: 'Umie zgłaszać obraźliwe treści i zatrzymać internetowych hejterów.' },
  { id: 'dig-bezpieczenstwo', name: 'Tworzenie zabezpieczeń', category: 'digital', art: '🔐', description: 'Buduje ochronę, zanim ktoś zdąży zaatakować.' },
  { id: 'dig-projektant-przyszlosci', name: 'Projektant Przyszłości', category: 'digital', art: '💡', description: 'Wymyśla nowe materiały i technologie, których jeszcze nie ma.' },
  { id: 'dig-mistrz-planowania', name: 'Mistrz Planowania', category: 'digital', art: '🗺️', description: 'Wyznacza najlepszą trasę i sprawdza, gdzie pomoc jest najpotrzebniejsza.' },
  { id: 'dig-analog', name: 'Umiejętności analogowe', category: 'digital', art: '📻', description: 'Radzi sobie bez internetu: mapa papierowa, krótkofalówka, notes.', draft: true },
];

const social: Card[] = [
  { id: 'soc-komunikacja', name: 'Komunikacja', category: 'social', art: '💬', description: 'Mówi tak, że inni rozumieją i chcą słuchać.' },
  { id: 'soc-wspolpraca', name: 'Współpraca', category: 'social', art: '🤝', description: 'Łączy siły zamiast ciągnąć w swoją stronę.' },
  { id: 'soc-krytyczne', name: 'Krytyczne myślenie', category: 'social', art: '🧩', description: 'Pyta „skąd to wiesz?" zanim uwierzy.' },
  { id: 'soc-rozwiazywanie', name: 'Rozwiązywanie problemów', category: 'social', art: '🔧', description: 'Rozkłada wielki problem na małe, wykonalne kroki.' },
  { id: 'soc-przyszlosciowe', name: 'Myślenie przyszłościowe', category: 'social', art: '🔭', description: 'Przewiduje skutki decyzji, zanim zapadną.' },
  { id: 'soc-mistrz-relacji', name: 'Mistrz Dobrych Relacji', category: 'social', art: '💞', description: 'Pomaga ludziom spokojnie porozmawiać i rozwiązać konflikt.' },
  { id: 'soc-straznik-slowa', name: 'Strażnik Dobrego Słowa', category: 'social', art: '📣', description: 'Pokazuje innym, jak wspierać zamiast wyśmiewać.' },
  { id: 'soc-obronca', name: 'Obrońca Przyjaciół', category: 'social', art: '🦸', description: 'Nie stoi z boku — staje w obronie krzywdzonych.' },
  { id: 'soc-straznik-prawdy', name: 'Strażnik Prawdy', category: 'social', art: '✅', description: 'Przekazuje sprawdzone informacje i zatrzymuje plotki.' },
  { id: 'soc-spolecznik', name: 'Społecznik', category: 'social', art: '💛', description: 'Organizuje zbiórki i zachęca innych do pomocy.' },
  { id: 'soc-mediator', name: 'Mediator', category: 'social', art: '☮️', description: 'Znajduje wspólny język tam, gdzie wszyscy się kłócą.' },
  { id: 'soc-mistrz-wspolpracy', name: 'Mistrz Współpracy', category: 'social', art: '🌍', description: 'Łączy ludzi, firmy i miasta wokół jednego celu.' },
];

const talents: Card[] = [
  { id: 'tal-kreatywnosc', name: 'Kreatywność', category: 'talent', art: '🎨', description: 'Wymyśla to, czego nikt wcześniej nie wymyślił.' },
  { id: 'tal-empatia', name: 'Empatia', category: 'talent', art: '❤️', description: 'Czuje to, co czują inni.' },
  { id: 'tal-odwaga', name: 'Odwaga', category: 'talent', art: '🦁', description: 'Działa mimo strachu.' },
  { id: 'tal-wytrwalosc', name: 'Wytrwałość', category: 'talent', art: '🏔️', description: 'Nie odpuszcza, nawet gdy jest trudno.' },
  { id: 'tal-ciekawosc', name: 'Ciekawość', category: 'talent', art: '🔎', description: 'Pyta „dlaczego?" tak długo, aż znajdzie odpowiedź.' },
  { id: 'tal-organizacja', name: 'Organizacja', category: 'talent', art: '📋', description: 'Zamienia bałagan w plan.' },
  { id: 'tal-szybka-nauka', name: 'Szybkie uczenie się', category: 'talent', art: '⚡', description: 'Uczy się nowej rzeczy w tempie, które zaskakuje innych.' },
  { id: 'tal-wspolpraca', name: 'Talent współpracy', category: 'talent', art: '🫂', description: 'Sprawia, że grupa działa lepiej niż suma jej członków.' },
];

const mentors: Card[] = [
  { id: 'men-wynalazca', name: 'Wielki Wynalazca', category: 'mentor', art: '🧪', description: 'Pomaga stworzyć rozwiązanie, którego nikt wcześniej nie wymyślił.' },
  { id: 'men-wizjoner', name: 'Wizjoner', category: 'mentor', art: '🔮', description: 'Widzi, dokąd to wszystko zmierza.' },
  { id: 'men-opiekun', name: 'Opiekun Społeczności', category: 'mentor', art: '🤲', description: 'Organizuje pomoc dla tych, którzy sami sobie nie poradzą.' },
  { id: 'men-lider', name: 'Lider', category: 'mentor', art: '🚩', description: 'Bierze odpowiedzialność, gdy inni się wahają.' },
  { id: 'men-badacz', name: 'Badacz', category: 'mentor', art: '🔬', description: 'Sprawdza fakty, zanim ktoś zdąży zgadywać.' },
  { id: 'men-konstruktor', name: 'Konstruktor', category: 'mentor', art: '🏗️', description: 'Zamienia pomysł w działającą rzecz.' },
  { id: 'men-architekt', name: 'Architekt Przyszłości', category: 'mentor', art: '🏛️', description: 'Widzi szeroko i łączy pomysły wielu osób w jedną całość.' },
  { id: 'men-straznik-jutra', name: 'Strażnik Dobrego Jutra', category: 'mentor', art: '🌅', description: 'Dba, żeby pomoc działała także jutro, nie tylko dziś.' },
  { id: 'men-starzec', name: 'Starzec spoza Sieci', category: 'mentor', art: '🧓', description: 'Żyje bez technologii i widzi świat takim, jaki jest naprawdę.' },
  { id: 'men-przedsiebiorca', name: 'Przedsiębiorca Zmiany', category: 'mentor', art: '🚀', description: 'Sprawia, że dobre rozwiązania trafiają do sklepów i domów.' },
];

/** Karty specjalne — pojedyncze, rzadkość jest częścią zasad. */
const special: Card[] = [
  {
    id: 'eter11-1',
    name: 'ETER11',
    category: 'eter11',
    art: '✨',
    description: 'Super Mentor. Zastępuje dowolną kartę potrzebną do rozwiązania problemu.',
  },
  {
    id: 'eter11-2',
    name: 'ETER11',
    category: 'eter11',
    art: '✨',
    description: 'Super Mentor. Zastępuje dowolną kartę potrzebną do rozwiązania problemu.',
  },
  {
    id: 'swan-extra',
    name: 'Czarny Łabędź: Kryzys się mnoży',
    category: 'blackswan',
    blackSwanKind: 'extraProblem',
    art: '🦢',
    description: 'Pojawia się drugi problem. Musicie rozwiązać oba, żeby misja się udała.',
  },
  {
    id: 'swan-double',
    name: 'Czarny Łabędź: Sprawa się komplikuje',
    category: 'blackswan',
    blackSwanKind: 'doubleRequirements',
    art: '🦢',
    description: 'Puste ścianki wymagają teraz dwóch kart. Te już zamknięte zostają zaliczone.',
  },
  {
    id: 'swan-swap',
    name: 'Czarny Łabędź: Wszystko się miesza',
    category: 'blackswan',
    blackSwanKind: 'swapHands',
    art: '🦢',
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
