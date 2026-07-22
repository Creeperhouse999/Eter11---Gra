import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from './client';

/**
 * Wątek dyskusji zespołu.
 *
 * Zgłoszenia (`reports`) są o tym, co nie działa — mają status i domykają
 * się, gdy zgłaszający potwierdzi naprawę. Dyskusja jest o tym, czego
 * jeszcze nie ma: nowa mechanika, pomysł na misję, spór o zasadę. Nie ma
 * statusu ani właściciela, bo nie ma czego domykać.
 */
export interface DiscussionMessage {
  /**
   * Kto pisze. Imię bierze się z konta (`displayName`, w zapasie e-mail),
   * a nie z pola wpisywanego ręcznie — pod wypowiedzią w dyskusji musi stać
   * nazwisko, którego nie da się podszyć.
   */
  author: string;
  text: string;
  at: string;
  /** Jeden obrazek na wypowiedź — zrzut ekranu albo szkic pomysłu. */
  image?: string;
}

export interface Discussion {
  id: string;
  title: string;
  /** Pierwsza wypowiedź — to, od czego wątek się zaczął. */
  description: string;
  author: string;
  createdAt: string;
  messages: DiscussionMessage[];
  /** Wątek ustalony — schodzi z listy, ale zostaje do wglądu. */
  closed?: boolean;
}

const COLLECTION = 'discussions';

/** Górna granica długości wątku — ta sama, co w regułach Firestore. */
export const MAX_MESSAGES = 200;

export async function addDiscussion(input: {
  title: string;
  description: string;
  author: string;
}): Promise<{ ok: boolean; error?: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Wpisz temat dyskusji.' };

  const author = input.author.trim();
  if (!author) return { ok: false, error: 'Podaj swoje imię — inaczej nikt nie wie, kto pisze.' };

  try {
    await addDoc(collection(db, COLLECTION), {
      title,
      description: input.description.trim(),
      author,
      createdAt: new Date().toISOString(),
      messages: [],
      closed: false,
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Nie udało się założyć wątku: ${message}` };
  }
}

export async function loadDiscussions(): Promise<Discussion[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy('createdAt', 'desc')),
  );

  return snapshot.docs.map((entry) => {
    const data = entry.data() as Omit<Discussion, 'id'>;
    return {
      id: entry.id,
      title: data.title,
      description: data.description ?? '',
      author: data.author ?? '',
      createdAt: data.createdAt,
      messages: data.messages ?? [],
      closed: data.closed ?? false,
    };
  });
}

/**
 * Podgląd na żywo — nowe wypowiedzi wchodzą same.
 *
 * Dyskusja czyta się jak czat: odpowiedź pojawiająca się dopiero po
 * kliknięciu „odśwież" zamienia rozmowę w wymianę listów. Firestore liczy
 * każdy odczyt, ale wątków są dziesiątki, nie tysiące, a nasłuch dostaje
 * wyłącznie zmiany, nie całą kolekcję za każdym razem.
 *
 * Zwraca funkcję odłączającą — wywołanie jej kończy nasłuch i naliczanie.
 */
export function watchDiscussions(
  onChange: (discussions: Discussion[]) => void,
  onError?: (message: string) => void,
): () => void {
  return onSnapshot(
    query(collection(db, COLLECTION), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data() as Omit<Discussion, 'id'>;
          return {
            id: entry.id,
            title: data.title,
            description: data.description ?? '',
            author: data.author ?? '',
            createdAt: data.createdAt,
            messages: data.messages ?? [],
            closed: data.closed ?? false,
          };
        }),
      );
    },
    (error) => onError?.(error.message),
  );
}

/**
 * Dopisanie wypowiedzi.
 *
 * Wysyłamy całą listę, a nie `arrayUnion`: reguły muszą sprawdzić, że wątek
 * tylko urósł i że nikt nie podmienił cudzych wypowiedzi. `arrayUnion` nie
 * pozwala tego wyrazić po stronie reguł, bo serwer sam składa wynik.
 *
 * Skutek uboczny: dwie osoby piszące w tej samej sekundzie mogą sobie
 * nadpisać wypowiedź. Zespół to cztery osoby ustalające rzeczy w ciągu dnia,
 * więc realne ryzyko jest znikome, a chronimy się przed czymś gorszym —
 * wyczyszczeniem cudzego wątku.
 */
export async function addMessage(
  discussion: Discussion,
  input: { author: string; text: string; image?: string },
): Promise<{ ok: boolean; error?: string }> {
  const text = input.text.trim();
  // Sam obrazek bez słowa też jest wypowiedzią — „o to mi chodziło" + zrzut.
  if (!text && !input.image) return { ok: false, error: 'Napisz coś albo dołącz obraz.' };

  const author = input.author.trim();
  if (!author) return { ok: false, error: 'Podaj swoje imię.' };

  if (discussion.messages.length >= MAX_MESSAGES) {
    return { ok: false, error: 'Wątek osiągnął limit wypowiedzi. Załóż nowy.' };
  }

  try {
    await updateDoc(doc(db, COLLECTION, discussion.id), {
      messages: [
        ...discussion.messages,
        {
          author,
          text,
          at: new Date().toISOString(),
          ...(input.image ? { image: input.image } : {}),
        },
      ],
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Nie udało się wysłać: ${message}` };
  }
}

/**
 * Zamknięcie wątku albo jego ponowne otwarcie.
 *
 * Ustalone tematy schodzą z listy, ale nie znikają: wracamy do nich, gdy
 * ktoś pyta „czemu zdecydowaliśmy tak?".
 */
export async function setDiscussionClosed(id: string, closed: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { closed });
}

/** Usunięcie wątku. Reguły dopuszczają to wyłącznie zalogowanym. */
export async function deleteDiscussion(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
