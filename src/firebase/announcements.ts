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
 * Ogłoszenia dla zespołu.
 *
 * Nie zgłoszenie (nie ma obiegu ani statusu) i nie dyskusja (nie odpowiada się
 * na nie). To jedna wiadomość od admina do wszystkich: „w piątek testujemy
 * z dziećmi", „nie ruszamy kart do poniedziałku". Trafia w dzwonek każdemu
 * i zostaje na liście, żeby dało się wrócić do treści po skasowaniu
 * powiadomienia.
 */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  /** Wyróżnione — trzyma się góry listy, dopóki admin go nie odepnie. */
  pinned?: boolean;
}

const COLLECTION = 'announcements';

export const MAX_TITLE = 120;
export const MAX_BODY = 2000;

export async function addAnnouncement(input: {
  title: string;
  body: string;
  author: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Wpisz tytuł ogłoszenia.' };
  if (title.length > MAX_TITLE) {
    return { ok: false, error: `Tytuł ma ${title.length} znaków, a mieści się ${MAX_TITLE}.` };
  }

  const body = input.body.trim();
  if (body.length > MAX_BODY) {
    return { ok: false, error: `Treść ma ${body.length} znaków, a mieści się ${MAX_BODY}.` };
  }

  try {
    const entry = await addDoc(collection(db, COLLECTION), {
      title,
      body,
      author: input.author.trim(),
      createdAt: new Date().toISOString(),
      pinned: false,
    });
    return { ok: true, id: entry.id };
  } catch (error) {
    console.error('Nie udało się wysłać ogłoszenia:', error);
    return { ok: false, error: 'Nie udało się wysłać ogłoszenia.' };
  }
}

/** Przypina albo odpina — przypięte trzyma się góry listy. */
export async function setPinned(id: string, pinned: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, id), { pinned });
  } catch (error) {
    console.error('Nie udało się zmienić przypięcia:', error);
  }
}

export async function removeAnnouncement(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    console.error('Nie udało się usunąć ogłoszenia:', error);
  }
}

/**
 * Podgląd na żywo. Przypięte na górze, reszta od najnowszych.
 *
 * Sortowanie po stronie panelu, nie zapytania: Firestore wymagałby do tego
 * złożonego indeksu, a ogłoszeń są dziesiątki, nie tysiące.
 */
export function watchAnnouncements(
  onChange: (items: Announcement[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, COLLECTION), orderBy('createdAt', 'desc')),
    (snapshot) => {
      const items = snapshot.docs.map((entry) => {
        const data = entry.data() as Omit<Announcement, 'id'>;
        return {
          id: entry.id,
          title: data.title ?? '',
          body: data.body ?? '',
          author: data.author ?? '',
          createdAt: data.createdAt ?? '',
          pinned: data.pinned === true,
        };
      });
      onChange([...items].sort((a, b) => Number(b.pinned) - Number(a.pinned)));
    },
    (error) => {
      console.error('Podgląd ogłoszeń nie działa:', error);
      onChange([]);
    },
  );
}
