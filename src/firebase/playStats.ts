import { doc, getDoc, increment, setDoc } from 'firebase/firestore';
import { db } from './client';

/**
 * Licznik rozegranych partii.
 *
 * Zespół pyta „czy ktoś w to w ogóle gra?", a odpowiedź brzmiała
 * „nie wiadomo". To jedyna liczba w tym projekcie, której nie da się
 * wyprowadzić z treści gry — trzeba ją zliczać, gdy partia się kończy.
 *
 * Zliczamy wyłącznie zdarzenia, nigdy przebiegu rozgrywki: ile partii
 * dobiegło końca, ile z nich wygrano, ile misji rozwiązano łącznie.
 * Gra jest dla dzieci i nie zbiera o nich niczego — żadnych imion,
 * ustawień ani identyfikatorów.
 */
export interface PlayStats {
  /** Partie doprowadzone do ekranu końcowego. */
  finished: number;
  /** Z tego zakończone wygraną drużyny. */
  won: number;
  /** Łączna liczba rozwiązanych problemów we wszystkich partiach. */
  missionsSolved: number;
  /** Ukończone samouczki — ile osób przeszło naukę do końca. */
  tutorialsFinished: number;
}

const COLLECTION = 'stats';
const DOCUMENT = 'play';

export const EMPTY_STATS: PlayStats = {
  finished: 0,
  won: 0,
  missionsSolved: 0,
  tutorialsFinished: 0,
};

/**
 * Dopisuje zakończoną partię.
 *
 * `increment` po stronie serwera, a nie odczyt-dodaj-zapis: dwie partie
 * kończące się w tej samej chwili inaczej nadpisałyby sobie wynik, a przy
 * grze na kilku telefonach naraz to nie jest przypadek teoretyczny.
 *
 * Cisza przy błędzie jest celowa. Statystyka to ciekawostka dla zespołu;
 * dziecko kończące grę nie ma prawa zobaczyć komunikatu o nieudanym
 * zapisie czegoś, o czego istnieniu nie wie.
 */
export async function recordFinishedGame(input: {
  won: boolean;
  missionsSolved: number;
}): Promise<void> {
  try {
    await setDoc(
      doc(db, COLLECTION, DOCUMENT),
      {
        finished: increment(1),
        won: increment(input.won ? 1 : 0),
        missionsSolved: increment(input.missionsSolved),
      },
      { merge: true },
    );
  } catch {
    // Bez śladu — patrz wyżej.
  }
}

/** Dopisuje ukończony samouczek. */
export async function recordFinishedTutorial(): Promise<void> {
  try {
    await setDoc(
      doc(db, COLLECTION, DOCUMENT),
      { tutorialsFinished: increment(1) },
      { merge: true },
    );
  } catch {
    // Bez śladu — patrz wyżej.
  }
}

export async function loadPlayStats(): Promise<PlayStats> {
  try {
    const snapshot = await getDoc(doc(db, COLLECTION, DOCUMENT));
    if (!snapshot.exists()) return EMPTY_STATS;

    const data = snapshot.data();
    const read = (key: keyof PlayStats): number =>
      typeof data[key] === 'number' ? (data[key] as number) : 0;

    return {
      finished: read('finished'),
      won: read('won'),
      missionsSolved: read('missionsSolved'),
      tutorialsFinished: read('tutorialsFinished'),
    };
  } catch {
    return EMPTY_STATS;
  }
}
