/**
 * Konfiguracja projektu Firebase.
 *
 * Te wartości są publiczne z założenia — klucz API Firebase identyfikuje
 * projekt, ale niczego nie autoryzuje. Dostęp do danych regulują wyłącznie
 * reguły Firestore (patrz firestore.rules).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAaA1OJrJSjmDU7RPo6KXv0HhzVG9OI1X0',
  authDomain: 'savetheworld-eter11.firebaseapp.com',
  projectId: 'savetheworld-eter11',
  storageBucket: 'savetheworld-eter11.firebasestorage.app',
  messagingSenderId: '488354466236',
  appId: '1:488354466236:web:c6a7e22c991220660d43b9',
  measurementId: 'G-58QQ6MJN0F',
  // Realtime Database — gra wieloosobowa na żywo. Region europe-west1.
  databaseURL:
    'https://savetheworld-eter11-default-rtdb.europe-west1.firebasedatabase.app',
};
