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

/**
 * App Check — dowód, że zapytanie idzie z NASZEJ strony, a nie ze skryptu.
 *
 * Firebase wymaga go dla AI Logic (od lipca 2026 wymusza automatycznie).
 * Powód jest kosztowy i dotyczy nas wprost: gra loguje anonimowo, więc bez
 * App Check każdy, kto otworzy źródło strony, może wołać model na nasz
 * rachunek. Alan przy zgłoszeniu o czatbocie napisał tylko „Koszty… i jeszcze
 * raz koszty…".
 *
 * Klucz reCAPTCHA jest PUBLICZNY z natury — musi trafić do przeglądarki, żeby
 * zadziałać, i sam w sobie nic nie otwiera. Tajny jest odpowiadający mu klucz
 * po stronie Google, którego tu nie ma.
 *
 * Ładowane leniwie: App Check ściąga skrypt reCAPTCHA, a gra ma się uruchamiać
 * także wtedy, gdy sieć jest wolna albo skrypt zablokowany. Bez niego działa
 * wszystko poza funkcjami ETER.
 */
const RECAPTCHA_KEY = '6LfOrastAAAAAKoP-US2tjC3Idyn4ZvrnZPpl8GJ';

let appCheckReady: Promise<void> | null = null;

export function ensureAppCheck(): Promise<void> {
  if (appCheckReady) return appCheckReady;

  appCheckReady = (async () => {
    try {
      const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import(
        'firebase/app-check'
      );
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_KEY),
        // Odświeżanie w tle — bez tego żeton wygasa w trakcie dłuższej partii
        // i pytanie zadane po godzinie gry dostaje odmowę.
        isTokenAutoRefreshEnabled: true,
      });
    } catch (error) {
      // Zablokowany skrypt reCAPTCHA albo brak sieci nie może wywrócić gry —
      // funkcje ETER po prostu odmówią, reszta działa jak dotąd.
      console.warn('App Check niedostępny — funkcje ETER będą wyłączone.', error);
    }
  })();

  return appCheckReady;
}
