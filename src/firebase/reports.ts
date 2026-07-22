import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from './client';

export type ReportKind = 'bug' | 'idea';

/**
 * Obieg zgłoszenia.
 *
 * - `new` — zgłoszone, czeka na programistę
 * - `fixed` — programista twierdzi, że naprawione; czeka na sprawdzenie
 * - `rejected` — zgłaszający sprawdził i dalej nie działa; wraca do naprawy
 * - `done` — zgłaszający potwierdził, że działa
 *
 * Rozdzielenie `fixed` i `done` jest sednem: naprawiający nie zamyka
 * własnego zgłoszenia. Zamyka je ten, kto je napisał.
 */
export type ReportStatus = 'new' | 'fixed' | 'rejected' | 'done';

export interface ReportNote {
  /** Kto pisze: programista czy zgłaszający. */
  from: 'dev' | 'reporter';
  text: string;
  at: string;
}

export interface Report {
  id: string;
  kind: ReportKind;
  title: string;
  description: string;
  status: ReportStatus;
  author?: string;
  createdAt: string;
  /** Adresy zrzutów ekranu wgranych do Storage. Najwyżej pięć. */
  images?: string[];
  /** Rozmowa o zgłoszeniu: co naprawiono, co dalej nie działa. */
  notes?: ReportNote[];
}

const COLLECTION = 'reports';

export async function addReport(input: {
  kind: ReportKind;
  title: string;
  description: string;
  author?: string;
  images?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Wpisz tytuł zgłoszenia.' };

  try {
    await addDoc(collection(db, COLLECTION), {
      kind: input.kind,
      title,
      description: input.description.trim(),
      author: input.author?.trim() ?? '',
      status: 'new' satisfies ReportStatus,
      createdAt: new Date().toISOString(),
      // Puste pole pomijamy: reguły dopuszczają `images`, ale pusta lista
      // niczego nie wnosi, a odczyt i tak podstawia [].
      ...(input.images?.length ? { images: input.images.slice(0, 5) } : {}),
      // Bez `notes`: reguły dopuszczają dokładnie sześć pól, a pusta lista
      // niczego nie wnosi — odczyt i tak podstawia `[]`, gdy pola brakuje.
      // Wysyłanie jej odrzucało KAŻDE zgłoszenie z błędem uprawnień, czyli
      // kanał zgłaszania błędów był martwy od początku.
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Nie udało się wysłać zgłoszenia: ${message}` };
  }
}

export async function loadReports(): Promise<Report[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy('createdAt', 'desc')),
  );

  return snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      kind: (data.kind as ReportKind) ?? 'bug',
      title: (data.title as string) ?? '',
      description: (data.description as string) ?? '',
      status: (data.status as ReportStatus) ?? 'new',
      author: (data.author as string) ?? undefined,
      createdAt: (data.createdAt as string) ?? '',
      images: (data.images as string[]) ?? [],
      notes: (data.notes as ReportNote[]) ?? [],
    };
  });
}

/**
 * Zmiana statusu, opcjonalnie z komentarzem.
 *
 * Komentarz dopisywany jest do listy, nie nadpisuje poprzednich — historia
 * zgłoszenia zostaje w całości, żeby dało się prześledzić, co już próbowano.
 */
export async function setReportStatus(
  id: string,
  status: ReportStatus,
  note?: { from: ReportNote['from']; text: string },
): Promise<void> {
  const text = note?.text.trim();

  await updateDoc(doc(db, COLLECTION, id), {
    status,
    ...(text
      ? {
          notes: arrayUnion({
            from: note!.from,
            text,
            at: new Date().toISOString(),
          }),
        }
      : {}),
  });
}

/** Trwałe usunięcie zgłoszenia. Wymaga konta administracyjnego. */
export async function deleteReport(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
