import { buildDeck, playableCards } from '../data/cards';
import type { Card, CardCategory, Problem, Character, RulesConfig } from '../engine/types';

/**
 * Podsumowanie techniczne zestawu — ile czego jest w pudełku.
 *
 * Adam poprosił o stronę wydruku, na której „przy każdej nazwie umieść cyfrę
 * oraz grafikę przykładową danej karty": ile kart problemów, postaci, kart
 * specjalnych oraz talentów, mentorów, psychologicznych, cyfrowych
 * i społecznych.
 *
 * Liczby wyliczamy z treści gry, a nie wpisujemy na sztywno. Zestaw rośnie —
 * ktoś doda kartę w panelu i nikt nie pamięta, że w instrukcji stoi stara
 * liczba. Wydrukowana instrukcja z fałszywą liczbą jest gorsza niż jej brak:
 * przy pierwszym liczeniu kart dziecko myśli, że zestaw jest niekompletny.
 *
 * Wersje robocze (`draft`) nie idą do gry, więc nie liczą się też do wydruku.
 *
 * Adam zgłosił stronę jako reopened: liczby kart specjalnych liczyły RÓŻNE
 * projekty (2 ETER11, 3 Czarne Łabędzie), a nie sztuki, które faktycznie
 * trafiają do talii — w pudełku jest tyle, ile mówi zasada „Kart ETER11
 * i Łabędzi w talii" w panelu (domyślnie po 4). Liczymy więc z tej samej
 * talii, którą buduje „Drukuj karty" (`buildDeck`), żeby obie zakładki
 * zgadzały się ze sobą i z fizycznym pudełkiem.
 *
 * Zgłoszenie wróciło drugi raz: liczba przy nazwie kategorii („16 talentów")
 * nie zgadzała się z liczbą wyświetlonych obrazków (8) — bo `ile` liczyło
 * sztuki w talii (z dwoma egzemplarzami na kartę), a `karty` do wizualizacji
 * brało różne PROJEKTY, po jednym obrazku na kartę. Adam prosił wprost
 * o wygląd „jak w »drukuj karty«" — a ta zakładka drukuje właśnie całą talię,
 * czyli oba egzemplarze każdej karty. Więc obrazki też biorą się z talii —
 * liczba przy nazwie zawsze równa liczbie pokazanych kart.
 */
export interface PozycjaZestawu {
  klucz: string;
  nazwa: string;
  /** Ile sztuk tej kategorii trafia do fizycznej talii — tyle ma być w pudełku. */
  ile: number;
  /** Każda sztuka z talii tej kategorii — tyle obrazków, ile mówi `ile`. */
  karty: Card[];
}

/** Kategorie kart w kolejności, w jakiej Adam je wymienił. */
const KATEGORIE: Array<{ klucz: CardCategory; nazwa: string }> = [
  { klucz: 'talent', nazwa: 'Talenty' },
  { klucz: 'mentor', nazwa: 'Mentorzy' },
  { klucz: 'psychological', nazwa: 'Kompetencje psychologiczne' },
  { klucz: 'digital', nazwa: 'Kompetencje cyfrowe' },
  { klucz: 'social', nazwa: 'Kompetencje poznawczo-społeczne' },
];

/** Karty specjalne — jokery i utrudnienia, liczone osobno od kompetencji. */
const SPECJALNE: Array<{ klucz: CardCategory; nazwa: string }> = [
  { klucz: 'eter11', nazwa: 'Karty ETER11 (joker)' },
  { klucz: 'blackswan', nazwa: 'Czarne Łabędzie' },
];

export interface PodsumowanieZestawu {
  /** Problemy i postacie — osobne talie, nie karty kompetencji. */
  problemy: number;
  postacie: number;
  /** Karty kompetencji, talentów i mentorów — po jednej pozycji na kategorię. */
  kategorie: PozycjaZestawu[];
  /** Karty specjalne razem z rozbiciem. */
  specjalne: PozycjaZestawu[];
  /** Ile kart specjalnych łącznie — Adam prosił o tę jedną liczbę wprost. */
  specjalneRazem: number;
  /** Wszystkie karty do zagrania (bez problemów i postaci). */
  kartyRazem: number;
}

export function podsumujZestaw(content: {
  cards: Card[];
  problems: Problem[];
  characters: Character[];
  rules?: Pick<RulesConfig, 'specialCardCopies'>;
}): PodsumowanieZestawu {
  const karty = playableCards(content.cards ?? []);
  // Ta sama talia, którą buduje „Drukuj karty" — stąd liczby na obu stronach
  // się zgadzają, a karty specjalne liczą się tyle razy, ile mówi zasada
  // w panelu, nie tyle, ile jest różnych projektów.
  const talia = buildDeck(karty, { specialCopies: content.rules?.specialCardCopies });

  const policz = (lista: Array<{ klucz: CardCategory; nazwa: string }>): PozycjaZestawu[] =>
    lista.map(({ klucz, nazwa }) => {
      const zTalii = talia.filter((c) => c.category === klucz);
      return { klucz, nazwa, ile: zTalii.length, karty: zTalii };
    });

  const specjalne = policz(SPECJALNE);

  return {
    problemy: (content.problems ?? []).filter((p) => !p.draft).length,
    postacie: (content.characters ?? []).length,
    kategorie: policz(KATEGORIE),
    specjalne,
    specjalneRazem: specjalne.reduce((suma, p) => suma + p.ile, 0),
    kartyRazem: talia.length,
  };
}
