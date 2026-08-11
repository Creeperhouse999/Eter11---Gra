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
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './client';

/**
 * Powiadomienia zespołu.
 *
 * Powstają w chwili zdarzenia, po stronie panelu — projekt nie używa Cloud
 * Functions, więc to ta sama akcja, która zmienia zgłoszenie albo dopisuje
 * wypowiedź, zapisuje przy okazji powiadomienie dla zainteresowanych.
 *
 * Adresatem jest KONTO (`uid`), nie podpis: imiona bywały różne dla tej samej
 * osoby, a uid jest jedno i nie da się go podszyć.
 */
export type NotificationKind =
  /** Twoje zgłoszenie zostało odrzucone. */
  | 'report-dismissed'
  /** Twoje zgłoszenie czeka na sprawdzenie — ktoś twierdzi, że naprawione. */
  | 'report-fixed'
  /** Ktoś odpisał w wątku, w którym zabrałeś głos. */
  | 'discussion-reply'
  /** Ogłoszenie od admina — trafia do wszystkich. */
  | 'announcement';

export interface Notification {
  id: string;
  /** Konto adresata. */
  uid: string;
  kind: NotificationKind;
  /** Jedno zdanie: co się stało. */
  title: string;
  /** Szczegóły — komentarz odrzucenia, fragment wypowiedzi, treść ogłoszenia. */
  body?: string;
  /** Kto wywołał zdarzenie (podpis do pokazania). */
  from?: string;
  /**
   * Dokąd prowadzi kliknięcie — ścieżka w panelu, np.
   * `/admin/reports/dismissed?open=<id>`.
   */
  link?: string;
  createdAt: string;
  read: boolean;
}

const COLLECTION = 'notifications';

/**
 * Zapisuje powiadomienia dla wskazanych kont.
 *
 * Pomija adresata, który sam wywołał zdarzenie — nikt nie chce powiadomienia
 * o własnej wypowiedzi. Cicho przełyka błąd: powiadomienie jest dodatkiem do
 * akcji, więc jego brak nie może wywrócić zmiany statusu ani wysłania wpisu.
 */
export async function notify(input: {
  uids: string[];
  kind: NotificationKind;
  title: string;
  body?: string;
  from?: string;
  link?: string;
  /** Konto, które wywołało zdarzenie — nie dostaje powiadomienia. */
  exceptUid?: string;
}): Promise<void> {
  const targets = [...new Set(input.uids)].filter(
    (uid) => uid && uid !== input.exceptUid,
  );
  if (targets.length === 0) return;

  const createdAt = new Date().toISOString();
  try {
    await Promise.all(
      targets.map((uid) =>
        addDoc(collection(db, COLLECTION), {
          uid,
          kind: input.kind,
          title: input.title,
          ...(input.body ? { body: input.body } : {}),
          ...(input.from ? { from: input.from } : {}),
          ...(input.link ? { link: input.link } : {}),
          createdAt,
          read: false,
        }),
      ),
    );
  } catch (error) {
    console.error('Nie udało się zapisać powiadomienia:', error);
  }
}

/**
 * Konta pasujące do podpisu.
 *
 * Zgłoszenia i dyskusje pamiętają tylko podpis („Adam"), nie konto — powstały,
 * zanim imiona trafiły do wpisów zespołu. Szukamy więc po imieniu nadanym
 * w zakładce zespołu, a gdy go nie ma, po części adresu przed małpą, żeby
 * trafić też starsze wpisy podpisane e-mailem.
 *
 * Zwraca listę, nie jedno konto: gdyby dwie osoby miały ten sam podpis, lepiej
 * powiadomić obie niż nie powiadomić nikogo.
 */
export function uidsForAuthor(
  author: string,
  team: Array<{ uid: string; email: string; name?: string }>,
): string[] {
  const wanted = author.trim().toLowerCase();
  if (!wanted) return [];

  return team
    .filter((member) => {
      if (member.name?.trim().toLowerCase() === wanted) return true;
      if (member.email.trim().toLowerCase() === wanted) return true;
      return member.email.split('@')[0].toLowerCase() === wanted;
    })
    .map((member) => member.uid);
}

/** Podgląd na żywo — dzwonek ma zapalać się bez odświeżania strony. */
export function watchMine(
  uid: string,
  onChange: (items: Notification[]) => void,
): () => void {
  if (!uid) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, COLLECTION), where('uid', '==', uid), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data() as Omit<Notification, 'id'>;
          return {
            id: entry.id,
            uid: data.uid,
            kind: data.kind,
            title: data.title ?? '',
            createdAt: data.createdAt ?? '',
            read: data.read === true,
            ...(data.body ? { body: data.body } : {}),
            ...(data.from ? { from: data.from } : {}),
            ...(data.link ? { link: data.link } : {}),
          };
        }),
      );
    },
    (error) => {
      console.error('Podgląd powiadomień nie działa:', error);
      onChange([]);
    },
  );
}

export async function markRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, id), { read: true });
  } catch (error) {
    console.error('Nie udało się oznaczyć powiadomienia:', error);
  }
}

export async function removeNotification(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    console.error('Nie udało się usunąć powiadomienia:', error);
  }
}

/**
 * Oznacza wszystkie jako przeczytane albo usuwa wszystkie.
 *
 * Jedną paczką (`writeBatch`), żeby lista nie migała po jednym wpisie i żeby
 * przy kilkudziesięciu powiadomieniach nie poszła seria osobnych zapisów.
 */
export async function markAllRead(uid: string): Promise<void> {
  await forEachMine(uid, (batch, ref) => batch.update(ref, { read: true }), {
    onlyUnread: true,
  });
}

export async function removeAllMine(uid: string): Promise<void> {
  await forEachMine(uid, (batch, ref) => batch.delete(ref));
}

async function forEachMine(
  uid: string,
  apply: (batch: ReturnType<typeof writeBatch>, ref: ReturnType<typeof doc>) => void,
  options: { onlyUnread?: boolean } = {},
): Promise<void> {
  if (!uid) return;

  try {
    const snapshot = await getDocs(
      query(collection(db, COLLECTION), where('uid', '==', uid)),
    );
    const docs = options.onlyUnread
      ? snapshot.docs.filter((entry) => entry.data().read !== true)
      : snapshot.docs;
    if (docs.length === 0) return;

    // Firestore przyjmuje najwyżej 500 operacji w paczce.
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach((entry) => apply(batch, entry.ref));
      await batch.commit();
    }
  } catch (error) {
    console.error('Nie udało się zaktualizować powiadomień:', error);
  }
}
