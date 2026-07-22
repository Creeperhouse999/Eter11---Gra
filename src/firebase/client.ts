import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { firebaseConfig } from './config';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Realtime Database — gra wieloosobowa na żywo. Ładowana leniwie przez
// moduł multiplayer, więc kod jednoosobowy jej nie ściąga.
export const rtdb = getDatabase(app);
