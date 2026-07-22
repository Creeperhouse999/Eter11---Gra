import type { CardCategory } from '../engine/types';

/**
 * Rodziny kart — drugi wymiar obok kategorii.
 *
 * Każda kategoria (psychologiczna, cyfrowa, społeczna, mentor, talent) dzieli
 * się na cztery rodziny. Rodzina ma kolor i symbol, a ścianka problemu wymaga
 * konkretnej rodziny — dziecko dopasowuje kolor do koloru, bez czytania
 * opisów.
 *
 * Identyfikatory rodzin są wspólne dla wszystkich kategorii (`red`, `blue`,
 * `yellow`, `green`), więc problem może wymagać „poznawczej czerwonej"
 * i „cyfrowej żółtej" bez osobnego słownika na kategorię.
 */
export type FamilyId = 'red' | 'blue' | 'yellow' | 'green';

export const FAMILY_IDS: FamilyId[] = ['red', 'blue', 'yellow', 'green'];

export interface Family {
  id: FamilyId;
  /** Nazwa rodziny w obrębie kategorii, np. „Siła wewnętrzna". */
  name: string;
  color: string;
  /** Nazwa ikony z zestawu albo `url:…` dla ikony wgranej przez zespół. */
  icon: string;
  /** Jednym zdaniem: co łączy karty tej rodziny. */
  description: string;
}

/** Kolory rodzin — te same we wszystkich kategoriach. */
export const FAMILY_COLORS: Record<FamilyId, string> = {
  red: '#ff6b6b',
  blue: '#5b9dff',
  yellow: '#ffc94d',
  green: '#5ce08f',
};

export const FAMILY_LABELS: Record<FamilyId, string> = {
  red: 'Czerwona',
  blue: 'Niebieska',
  yellow: 'Żółta',
  green: 'Zielona',
};

/**
 * Rodziny w obrębie każdej kategorii.
 *
 * Kolor jest wspólny dla całej gry, ale nazwa, symbol i opis są dopasowane
 * do kategorii — czerwona rodzina znaczy co innego wśród kompetencji
 * psychologicznych, a co innego wśród talentów.
 */
export type FamilyMap = Record<CardCategory, Family[]>;

export const DEFAULT_FAMILIES: FamilyMap = {
  psychological: [
    { id: 'red', name: 'Siła wewnętrzna', color: FAMILY_COLORS.red, icon: 'shield', description: 'Wytrzymać, nie poddać się, obronić swoje zdanie.' },
    { id: 'blue', name: 'Spokój i uważność', color: FAMILY_COLORS.blue, icon: 'dove', description: 'Wyciszyć emocje, zauważyć to, co ważne.' },
    { id: 'yellow', name: 'Zrozumienie innych', color: FAMILY_COLORS.yellow, icon: 'ear', description: 'Wysłuchać, wczuć się, pomóc komuś wrócić do siebie.' },
    { id: 'green', name: 'Kierowanie sobą', color: FAMILY_COLORS.green, icon: 'balance', description: 'Wiedzieć, co ważne, i prowadzić innych do celu.' },
  ],
  digital: [
    { id: 'red', name: 'Bezpieczeństwo', color: FAMILY_COLORS.red, icon: 'lock', description: 'Chronić dane, wykrywać zagrożenia, zatrzymywać ataki.' },
    { id: 'blue', name: 'Dane i analiza', color: FAMILY_COLORS.blue, icon: 'chart', description: 'Znajdować wzory i wyciągać wnioski z liczb.' },
    { id: 'yellow', name: 'Tworzenie i kod', color: FAMILY_COLORS.yellow, icon: 'code', description: 'Budować programy, roboty i nowe rozwiązania.' },
    { id: 'green', name: 'Świat bez sieci', color: FAMILY_COLORS.green, icon: 'radio', description: 'Radzić sobie, gdy technologia zawodzi.' },
  ],
  social: [
    { id: 'red', name: 'Obrona i odwaga', color: FAMILY_COLORS.red, icon: 'cape', description: 'Stanąć po stronie krzywdzonych, nie milczeć.' },
    { id: 'blue', name: 'Myślenie krytyczne', color: FAMILY_COLORS.blue, icon: 'puzzle', description: 'Pytać, sprawdzać, przewidywać skutki.' },
    { id: 'yellow', name: 'Porozumienie', color: FAMILY_COLORS.yellow, icon: 'message', description: 'Rozmawiać, godzić, tłumaczyć jednych drugim.' },
    { id: 'green', name: 'Działanie razem', color: FAMILY_COLORS.green, icon: 'handshake', description: 'Łączyć ludzi i organizować wspólne działanie.' },
  ],
  mentor: [
    { id: 'red', name: 'Przywództwo', color: FAMILY_COLORS.red, icon: 'flag', description: 'Brać odpowiedzialność, gdy inni się wahają.' },
    { id: 'blue', name: 'Nauka i badania', color: FAMILY_COLORS.blue, icon: 'microscope', description: 'Sprawdzać fakty, zanim ktoś zdąży zgadywać.' },
    { id: 'yellow', name: 'Wynalazczość', color: FAMILY_COLORS.yellow, icon: 'flask', description: 'Tworzyć to, czego jeszcze nie ma.' },
    { id: 'green', name: 'Troska i przyszłość', color: FAMILY_COLORS.green, icon: 'sunrise', description: 'Dbać o ludzi i o to, co będzie jutro.' },
  ],
  talent: [
    { id: 'red', name: 'Odwaga', color: FAMILY_COLORS.red, icon: 'lion', description: 'Działać mimo strachu, próbować mimo porażek.' },
    { id: 'blue', name: 'Ciekawość', color: FAMILY_COLORS.blue, icon: 'lens', description: 'Pytać „dlaczego" aż do skutku.' },
    { id: 'yellow', name: 'Wyobraźnia', color: FAMILY_COLORS.yellow, icon: 'palette', description: 'Widzieć to, czego inni jeszcze nie widzą.' },
    { id: 'green', name: 'Serce', color: FAMILY_COLORS.green, icon: 'heart', description: 'Czuć innych i trzymać grupę razem.' },
  ],
  // Karty specjalne nie mają rodzin — ETER11 pasuje wszędzie,
  // a Czarny Łabędź nie jest wykładany na ścianki.
  eter11: [],
  blackswan: [],
};

/** Rodzina danej kategorii i koloru. Zwraca undefined dla kart specjalnych. */
export function findFamily(
  families: FamilyMap,
  category: CardCategory,
  familyId: FamilyId,
): Family | undefined {
  return families[category]?.find((f) => f.id === familyId);
}
