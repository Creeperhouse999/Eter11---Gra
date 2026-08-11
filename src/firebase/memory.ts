import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from './client';

/**
 * Pamięć zespołu — wspólny notatnik o projekcie i o nas samych.
 *
 * Jedno zdanie na wpis, bez tytułu i bez wątków. Nie jest to czat (nie odpowiada
 * się sobie) ani zgłoszenie (nie ma statusu) — to miejsce na fakty, które warto
 * pamiętać: „gramy dla dzieci 8–13", „Adam odpowiada za merytorykę kart",
 * „Marcin nie lubi żółtego na kartach". Claude czyta to tak samo jak zespół,
 * więc kolejna rozmowa z nim zaczyna się od tego, co już wiadomo.
 */
export interface MemoryNote {
  id: string;
  /** Jedno zdanie — cała treść wpisu. */
  text: string;
  /** Kto zapisał — imię z konta, nie pole do wpisania. To widać pod wpisem. */
  author: string;
  /**
   * Konto autora — po nim (a nie po imieniu) poznajemy właściciela wpisu.
   *
   * Imię bywa adresem e-mail, gdy ktoś nie ustawił sobie `displayName`, i nie
   * ma go wtedy w tokenie — reguły bazy nie mogłyby po nim sprawdzić, czy to
   * autor poprawia własny wpis. Uid jest zawsze i nie da się go podszyć.
   * Starsze wpisy (sprzed tego pola) go nie mają — wtedy poprawia je admin.
   */
  authorUid?: string;
  /** Kiedy zapisano (ISO). */
  createdAt: string;
  /** Kiedy poprawiono, jeśli w ogóle — pokazujemy „(poprawione)". */
  editedAt?: string;
}

const COLLECTION = 'memory';

/**
 * Limit długości jednego wpisu.
 *
 * Pamięć ma być listą zdań do przeczytania jednym rzutem oka, nie zbiorem
 * notatek — stąd twardy limit, ten sam co w regułach Firestore.
 */
export const MAX_LENGTH = 300;

export async function addNote(input: {
  text: string;
  author: string;
  /** Konto piszącego — reguły wymagają zgodności z zalogowanym. */
  authorUid: string;
}): Promise<{ ok: boolean; error?: string }> {
  const text = input.text.trim();
  if (!text) return { ok: false, error: 'Wpisz zdanie do zapamiętania.' };
  if (text.length > MAX_LENGTH) {
    return { ok: false, error: `Zdanie ma ${text.length} znaków, a mieści się ${MAX_LENGTH}.` };
  }

  const author = input.author.trim();
  if (!author) return { ok: false, error: 'Brak imienia — nie wiadomo, kto zapisał.' };
  if (!input.authorUid) return { ok: false, error: 'Nie jesteś zalogowany.' };

  try {
    await addDoc(collection(db, COLLECTION), {
      text,
      author,
      authorUid: input.authorUid,
      createdAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch (error) {
    // Surowy błąd zostaje w konsoli; zespół widzi zdanie po ludzku.
    console.error('Zapis do pamięci nie powiódł się:', error);
    return { ok: false, error: 'Nie udało się zapisać. Spróbuj jeszcze raz.' };
  }
}

/** Poprawka własnego wpisu — treść, ze znacznikiem zmiany. */
export async function editNote(
  id: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Zdanie nie może być puste.' };
  if (trimmed.length > MAX_LENGTH) {
    return { ok: false, error: `Zdanie ma ${trimmed.length} znaków, a mieści się ${MAX_LENGTH}.` };
  }

  try {
    await updateDoc(doc(db, COLLECTION, id), {
      text: trimmed,
      editedAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch (error) {
    console.error('Poprawka wpisu w pamięci nie powiodła się:', error);
    return { ok: false, error: 'Nie udało się zapisać poprawki.' };
  }
}

export async function removeNote(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    return { ok: true };
  } catch (error) {
    console.error('Usunięcie wpisu z pamięci nie powiodło się:', error);
    return { ok: false, error: 'Nie udało się usunąć wpisu.' };
  }
}

/**
 * Podgląd na żywo — czyjś świeży wpis pojawia się bez odświeżania strony.
 *
 * Najnowsze na górze: pamięć czyta się od tego, co dopisano ostatnio.
 */
export function watchNotes(onChange: (notes: MemoryNote[]) => void): () => void {
  return onSnapshot(
    query(collection(db, COLLECTION), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data() as Omit<MemoryNote, 'id'>;
          return {
            id: entry.id,
            text: data.text ?? '',
            author: data.author ?? '',
            createdAt: data.createdAt ?? '',
            ...(data.authorUid ? { authorUid: data.authorUid } : {}),
            ...(data.editedAt ? { editedAt: data.editedAt } : {}),
          };
        }),
      );
    },
    // Brak uprawnień albo brak sieci: pusta lista zamiast wywrócenia panelu.
    (error) => {
      console.error('Podgląd pamięci nie działa:', error);
      onChange([]);
    },
  );
}
