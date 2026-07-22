/**
 * Ikona wgrana przez zespół.
 *
 * Zestaw wbudowany (77 ikon) siedzi w kodzie i tam zostaje. Te dochodzą
 * z panelu: plik w Storage plus nazwa, po której redaktor je rozpoznaje.
 * Używalne wszędzie tam, gdzie wbudowane — na kartach, kategoriach,
 * rodzinach, postaciach.
 */
export interface CustomIcon {
  /** Etykieta widoczna przy wyborze ikony. */
  name: string;
  /** Publiczny adres pliku w Storage. */
  url: string;
}
