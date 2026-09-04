import { playableCards } from '../data/cards';
import type { Card, CardCategory, Problem, Character } from '../engine/types';

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
 */
export interface PozycjaZestawu {
  klucz: string;
  nazwa: string;
  ile: number;
  /** Przykładowa karta — z niej wydruk bierze ikonę, kolor i tytuł. */
  przyklad?: Card;
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
}): PodsumowanieZestawu {
  const karty = playableCards(content.cards ?? []);

  const policz = (lista: Array<{ klucz: CardCategory; nazwa: string }>): PozycjaZestawu[] =>
    lista.map(({ klucz, nazwa }) => {
      const zKategorii = karty.filter((c) => c.category === klucz);
      return {
        klucz,
        nazwa,
        ile: zKategorii.length,
        // Przykład z grafiką ma pierwszeństwo: strona ma pokazywać, jak karta
        // wygląda naprawdę, a nie samą ikonę zastępczą.
        przyklad: zKategorii.find((c) => c.image) ?? zKategorii[0],
      };
    });

  const specjalne = policz(SPECJALNE);

  return {
    problemy: (content.problems ?? []).filter((p) => !p.draft).length,
    postacie: (content.characters ?? []).length,
    kategorie: policz(KATEGORIE),
    specjalne,
    specjalneRazem: specjalne.reduce((suma, p) => suma + p.ile, 0),
    kartyRazem: karty.length,
  };
}
