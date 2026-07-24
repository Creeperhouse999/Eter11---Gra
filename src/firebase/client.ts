import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { firebaseConfig } from './config';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Persystencja logowania z listą awaryjną. Domyślne `getAuth` stawia wyłącznie
// na IndexedDB, a ten bywa niedostępny na telefonie (prywatna karta iOS Safari,
// blokady ITP, oszczędzanie miejsca) — wtedy `onAuthStateChanged` potrafi nigdy
// nie zawołać callbacku i panel wisiał na „Sprawdzanie sesji…" (zgłoszone przez
// Adama na mobile). `initializeAuth` przyjmuje listę i używa pierwszej działającej:
// IndexedDB → localStorage → sessionStorage → pamięć (sesja tylko na czas życia
// karty, ale logowanie w ogóle działa).
export const auth = initializeAuth(app, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence,
  ],
});

// Realtime Database — gra wieloosobowa na żywo. Ładowana leniwie przez
// moduł multiplayer, więc kod jednoosobowy jej nie ściąga.
export const rtdb = getDatabase(app);
