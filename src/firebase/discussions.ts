import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
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
  /**
   * Konto autora — po nim, nie po widocznym podpisie, poznajemy właściciela
   * wypowiedzi przy poprawianiu i usuwaniu. Imię bywa takie samo u dwóch osób
   * i da się je zmienić w zakładce Admin, więc jako dowód własności się nie
   * nadaje. Starsze wypowiedzi go nie mają — wtedy ruszyć je może tylko admin.
   */
  authorUid?: string;
  text: string;
  at: string;
  /** Kiedy poprawiono treść — puste, gdy wypowiedź jest w pierwotnej formie. */
  editedAt?: string;
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
  /**
   * Wypowiedzi startowe wątku. Pusto przy zwykłym zakładaniu; wypełnione, gdy
   * wątek powstaje z odrzuconego zgłoszenia — przenosimy wtedy jego treść i
   * komentarz odrzucenia jako pierwsze wypowiedzi, żeby dyskusja miała kontekst.
   */
  messages?: DiscussionMessage[];
  // `id` wraca do panelu, żeby powiadomienie o nowym wątku mogło prowadzić
  // wprost do niego. Bez tego zespół dostawał informację „jest nowy temat"
  // i musiał go szukać na liście.
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Wpisz temat dyskusji.' };

  const author = input.author.trim();
  if (!author) return { ok: false, error: 'Podaj swoje imię — inaczej nikt nie wie, kto pisze.' };

  const description = input.description.trim();
  // Wątek bez treści jest gorszy niż brak wątku: na liście widać temat, ktoś
  // go otwiera i nie zastaje nic — nie wie, o co chodziło ani czy to pomyłka.
  // Wyjątek to wątek z odrzuconego zgłoszenia: opisu nie ma, ale treść niosą
  // przeniesione wypowiedzi, więc pusty nie jest.
  if (!description && !input.messages?.length) {
    return { ok: false, error: 'Napisz, o czym ma być rozmowa — sam temat nikomu nic nie mówi.' };
  }

  try {
    const entry = await addDoc(collection(db, COLLECTION), {
      title,
      description,
      author,
      createdAt: new Date().toISOString(),
      messages: input.messages ?? [],
      closed: false,
    });
    return { ok: true, id: entry.id };
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
 * Listę składamy z wersji SERWEROWEJ czytanej w JEDNEJ transakcji, nie z kopii
 * gracza (`discussion.messages`). Reguła Firestore wymaga, by nowa lista była
 * starą listą Z BAZY plus dokładnie jedna wypowiedź na końcu. Gdy ktoś dopisał
 * w międzyczasie, kopia gracza była już nieaktualna: zapis nie pasował do
 * reguły i wypowiedź leciała z błędem „Nie udało się wysłać". A dyskusja czyta
 * się jak czat — dwie osoby piszące niemal równocześnie to norma, nie wyjątek.
 * Transakcja czyta świeżą listę, dokłada wypowiedź i przy równoległym zapisie
 * ponawia całość, więc dopisanie zawsze siada na aktualnym stanie, nie kasuje
 * cudzej wypowiedzi i nie wymaga ręcznego odświeżenia.
 */
export async function addMessage(
  discussion: Discussion,
  input: { author: string; authorUid?: string; text: string; image?: string },
): Promise<{ ok: boolean; error?: string }> {
  const text = input.text.trim();
  // Sam obrazek bez słowa też jest wypowiedzią — „o to mi chodziło" + zrzut.
  if (!text && !input.image) return { ok: false, error: 'Napisz coś albo dołącz obraz.' };

  const author = input.author.trim();
  if (!author) return { ok: false, error: 'Podaj swoje imię.' };

  const message: DiscussionMessage = {
    author,
    // Konto autora — po nim poznajemy właściciela przy poprawianiu i usuwaniu.
    ...(input.authorUid ? { authorUid: input.authorUid } : {}),
    text,
    at: new Date().toISOString(),
    ...(input.image ? { image: input.image } : {}),
  };

  try {
    const ref = doc(db, COLLECTION, discussion.id);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return { ok: false, error: 'Tego wątku już nie ma.' };

      // Limit liczony ze stanu z bazy, nie z kopii gracza — inaczej dwie osoby
      // dobijające do granicy naraz mogłyby ją przekroczyć.
      const current = (snap.data()?.messages ?? []) as DiscussionMessage[];
      if (current.length >= MAX_MESSAGES) {
        return { ok: false, error: 'Wątek osiągnął limit wypowiedzi. Załóż nowy.' };
      }

      tx.update(ref, { messages: [...current, message] });
      return { ok: true };
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Nie udało się wysłać: ${reason}` };
  }
}

/**
 * Czy dana osoba może ruszyć tę wypowiedź.
 *
 * Właściciela poznajemy po koncie (`authorUid`), nie po widocznym podpisie:
 * imię bywa takie samo u dwóch osób i da się je zmienić w zakładce Admin,
 * więc jako dowód własności się nie nadaje.
 *
 * Wypowiedzi sprzed wprowadzenia `authorUid` nie mają czym się wylegitymować —
 * ruszyć je może wyłącznie admin. Inaczej wystarczyłoby zmienić sobie imię na
 * cudze, żeby przejąć stare wpisy.
 */
export function canEditMessage(
  message: DiscussionMessage,
  viewerUid: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  return Boolean(message.authorUid) && message.authorUid === viewerUid;
}

/**
 * Poprawa własnej wypowiedzi (admin: dowolnej).
 *
 * Zostawia znacznik `editedAt`, żeby dało się poznać, że treść zmieniła się po
 * publikacji — w rozmowie, do której inni się odnoszą, cicha podmiana byłaby
 * myląca.
 */
export async function editMessage(
  discussion: Discussion,
  index: number,
  text: string,
  viewer: { uid: string; isAdmin: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Wypowiedź nie może być pusta.' };

  try {
    const ref = doc(db, COLLECTION, discussion.id);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return { ok: false, error: 'Tego wątku już nie ma.' };

      // Stan z bazy, nie z kopii na ekranie: ktoś mógł w międzyczasie dopisać
      // wypowiedź i indeksy by się rozjechały.
      const current = (snap.data()?.messages ?? []) as DiscussionMessage[];
      const message = current[index];
      if (!message) return { ok: false, error: 'Tej wypowiedzi już nie ma.' };
      if (!canEditMessage(message, viewer.uid, viewer.isAdmin)) {
        return { ok: false, error: 'To nie Twoja wypowiedź.' };
      }

      const next = [...current];
      next[index] = { ...message, text: trimmed, editedAt: new Date().toISOString() };
      // `editIndex` mówi regule, którego elementu dotyczy zmiana — reguły nie
      // mają pętli po tablicy, więc same nie znajdą różnicy.
      tx.update(ref, { messages: next, editIndex: index });
      return { ok: true };
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Nie udało się poprawić: ${reason}` };
  }
}

/** Usunięcie własnej wypowiedzi (admin: dowolnej). */
export async function removeMessage(
  discussion: Discussion,
  index: number,
  viewer: { uid: string; isAdmin: boolean },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ref = doc(db, COLLECTION, discussion.id);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return { ok: false, error: 'Tego wątku już nie ma.' };

      const current = (snap.data()?.messages ?? []) as DiscussionMessage[];
      const message = current[index];
      if (!message) return { ok: false, error: 'Tej wypowiedzi już nie ma.' };
      if (!canEditMessage(message, viewer.uid, viewer.isAdmin)) {
        return { ok: false, error: 'To nie Twoja wypowiedź.' };
      }

      tx.update(ref, { messages: current.filter((_, i) => i !== index), editIndex: index });
      return { ok: true };
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Nie udało się usunąć: ${reason}` };
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

/**
 * Stan wątku na liście: czy ktoś czeka, czy jest coś nowego do przeczytania.
 *
 * Adam poprosił o te napisy wprost: „nowa odpowiedź", gdy ktoś odpowiedział,
 * i „czeka na odp. od AI", gdy odpowiedzi jeszcze nie było. Po samej liście
 * nie dało się tego poznać — trzeba było otwierać wątek po wątku.
 *
 * Rozstrzyga OSTATNIA wypowiedź: jeśli należy do człowieka, piłka jest po
 * mojej stronie; jeśli do mnie — jest co przeczytać. Wątek ustalony (`closed`)
 * nie ma stanu, bo nikt na nic nie czeka.
 */
export type StanWatku = 'czeka-na-ai' | 'nowa-odpowiedz';

/** Podpis, którym podpisuję się w dyskusjach (patrz `scripts/discuss.mjs`). */
const PODPIS_AI = 'Claude';

export function stanWatku(discussion: Discussion): StanWatku | null {
  if (discussion.closed) return null;

  const ostatnia = discussion.messages?.[discussion.messages.length - 1];
  // Wątek bez odpowiedzi: sam opis jest pytaniem, na które nikt nie odpisał.
  if (!ostatnia) return 'czeka-na-ai';

  return ostatnia.author === PODPIS_AI ? 'nowa-odpowiedz' : 'czeka-na-ai';
}

/** Napisy do plakietek — tak, jak sformułował je Adam. */
export const STAN_WATKU_LABELS: Record<StanWatku, string> = {
  'czeka-na-ai': 'Czeka na odpowiedź',
  'nowa-odpowiedz': 'Nowa odpowiedź',
};
