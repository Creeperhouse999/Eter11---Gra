import type { RoomPlayer } from './types';

/**
 * Pierwsza postać, której nikt w pokoju jeszcze nie ma.
 *
 * Adam zgłosił: „nie mogę kontynuować gry 2 graczy, bo wybiera się ta sama
 * postać (…) gdy dołącza kolejny gracz, automatycznie przypisz mu inną, ale
 * daj możliwość zmiany na taką, która nie jest zajęta".
 *
 * Wcześniej każdy wchodził z pierwszą postacią z listy, więc przy dwóch
 * graczach obaj mieli tę samą, a start gry słusznie tego nie przepuszczał —
 * partia stała, zanim się zaczęła. Zmiana w poczekalni istniała, ale trzeba
 * było o niej wiedzieć i o niej pamiętać.
 *
 * `wracajacyUid` to gracz, który wraca po rozłączeniu: jego własna postać nie
 * może liczyć się jako zajęta, bo dostałby wtedy kolejną wolną zamiast swojej.
 */
export function pierwszaWolnaPostac(
  players: Record<string, RoomPlayer> | undefined | null,
  characters: Array<{ id: string }>,
  wracajacyUid?: string,
): string {
  if (characters.length === 0) return '';

  const gracze = Object.values(players ?? {});

  // Wracający dostaje z powrotem swoją postać — bez tego po każdym
  // rozłączeniu zmieniałby postać w trakcie partii.
  if (wracajacyUid) {
    const wlasna = gracze.find((p) => p?.uid === wracajacyUid)?.characterId;
    if (wlasna) return wlasna;
  }

  const zajete = new Set(
    gracze.filter((p) => p?.uid !== wracajacyUid).map((p) => p?.characterId),
  );

  const wolna = characters.find((c) => !zajete.has(c.id));
  // Postaci jest więcej niż miejsc w pokoju, więc brak wolnej nie powinien się
  // zdarzyć. Pusty identyfikator wywróciłby jednak start gry, więc w ostatniej
  // chwili wolimy powtórzoną postać niż gracza bez żadnej.
  return wolna?.id ?? characters[0].id;
}
