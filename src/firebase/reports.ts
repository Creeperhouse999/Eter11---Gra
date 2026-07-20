import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from './client';

export type ReportKind = 'bug' | 'idea';
export type ReportStatus = 'new' | 'done';

export interface Report {
  id: string;
  kind: ReportKind;
  title: string;
  description: string;
  status: ReportStatus;
  /** Kto zgłosił — pole opcjonalne, wpisywane ręcznie. */
  author?: string;
  createdAt: string;
}

const COLLECTION = 'reports';

/**
 * Zgłoszenia błędów i pomysłów od zespołu.
 *
 * Osobna kolekcja od zawartości gry: zapis jest tu otwarty dla wszystkich,
 * bo zespół merytoryczny nie ma kont, a odczyt wymaga zalogowania — inaczej
 * zgłoszenia byłyby widoczne dla graczy.
 */
export async function addReport(input: {
  kind: ReportKind;
  title: string;
  description: string;
  author?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Wpisz tytuł zgłoszenia.' };

  try {
    await addDoc(collection(db, COLLECTION), {
      kind: input.kind,
      title,
      description: input.description.trim(),
      author: input.author?.trim() || null,
      status: 'new' satisfies ReportStatus,
      createdAt: new Date().toISOString(),
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
    };
  });
}

export async function setReportStatus(
  id: string,
  status: ReportStatus,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status });
}
