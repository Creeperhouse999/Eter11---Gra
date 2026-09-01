import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  limit,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './client';

/**
 * Strefa Nudy — wspólna kolejka drobiazgów i historia sesji.
 *
 * Dwie kolekcje, bo to dwie różne rzeczy:
 * - `boredomDone` — co już sprawdzono. WSPÓLNE dla zespołu: rzecz odhaczona
 *   przez jedną osobę znika wszystkim, żeby dwie osoby nie oceniały tej samej
 *   karty roboczej.
 * - `boredomSessions` — podsumowania sesji. Też wspólne: Alan chciał widzieć,
 *   kto ile przerobił, bo to jedyny ślad, że ktoś w ogóle usiadł do porządków.
 */

const DONE = 'boredomDone';
const SESSIONS = 'boredomSessions';

export type BoredomVerdict = 'ok' | 'fix' | 'skip';

export interface BoredomSession {
  id: string;
  author: string;
  startedAt: string;
  finishedAt: string;
  /** Ile fiszek przeklikano, w rozbiciu na werdykty. */
  ok: number;
  fix: number;
  skip: number;
  /** Ile sekund trwała sesja — liczone z dat, ale zapisane wprost. */
  seconds: number;
}

/**
 * Odhacza rzecz jako sprawdzoną.
 *
 * Identyfikatorem dokumentu jest id fiszki, nie losowy klucz: dwie osoby
 * klikające tę samą rzecz w tej samej chwili zapiszą ten sam dokument zamiast
 * dwóch, a kolejka i tak pokaże ją jako zrobioną.
 */
export async function markChecked(input: {
  itemId: string;
  verdict: BoredomVerdict;
  author: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await setDoc(doc(db, DONE, input.itemId), {
      verdict: input.verdict,
      author: input.author.trim(),
      at: new Date().toISOString(),
      // Serwerowy znacznik do porządkowania — data z przeglądarki bywa
      // przestawiona, a przy wspólnej kolejce liczy się kolejność.
      serverAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (error) {
    console.error('Nie udało się odhaczyć rzeczy:', error);
    return { ok: false, error: 'Nie udało się zapisać. Spróbuj jeszcze raz.' };
  }
}

/** Podgląd na żywo: co zespół już sprawdził. */
export function watchChecked(onChange: (ids: string[]) => void): () => void {
  return onSnapshot(
    collection(db, DONE),
    (snapshot) => onChange(snapshot.docs.map((entry) => entry.id)),
    (error) => {
      console.error('Podgląd sprawdzonych nie działa:', error);
      onChange([]);
    },
  );
}

/** Zapisuje podsumowanie zakończonej sesji. */
export async function saveSession(
  input: Omit<BoredomSession, 'id'>,
): Promise<{ ok: boolean; error?: string }> {
  // Pusta sesja nie jest wydarzeniem — nie zaśmiecamy nią historii zespołu.
  if (input.ok + input.fix + input.skip === 0) return { ok: true };

  try {
    await addDoc(collection(db, SESSIONS), input);
    return { ok: true };
  } catch (error) {
    console.error('Nie udało się zapisać sesji:', error);
    return { ok: false, error: 'Nie udało się zapisać podsumowania sesji.' };
  }
}

/** Historia sesji zespołu — najnowsze pierwsze. */
export function watchSessions(
  onChange: (sessions: BoredomSession[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, SESSIONS), orderBy('finishedAt', 'desc'), limit(30)),
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data() as Omit<BoredomSession, 'id'>;
          return {
            id: entry.id,
            author: data.author ?? '',
            startedAt: data.startedAt ?? '',
            finishedAt: data.finishedAt ?? '',
            ok: data.ok ?? 0,
            fix: data.fix ?? 0,
            skip: data.skip ?? 0,
            seconds: data.seconds ?? 0,
          };
        }),
      );
    },
    (error) => {
      console.error('Podgląd sesji nie działa:', error);
      onChange([]);
    },
  );
}
