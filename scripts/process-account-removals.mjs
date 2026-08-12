/**
 * Wykonuje zlecenia trwałego usunięcia konta złożone w panelu.
 *
 * Konta z Firebase kasuje wyłącznie Admin SDK, a jego klucz daje pełną władzę
 * nad projektem — w przeglądarce byłby do wyjęcia przez każdego, kto otworzy
 * narzędzia deweloperskie. Panel więc tylko zapisuje zlecenie w kolekcji
 * `accountRemovals`, a ten skrypt (uruchamiany przez GitHub Actions, gdzie
 * klucz jest sekretem repozytorium) je wykonuje.
 *
 * Po usunięciu konta znika też jego wpis roli — inaczej zespół pokazywałby
 * kogoś, kogo już nie ma.
 *
 * Wymaga sekretu `FIREBASE_SERVICE_ACCOUNT` (zawartość pliku JSON z Firebase
 * Console → Ustawienia projektu → Konta usługi → Wygeneruj nowy klucz).
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error('Brak FIREBASE_SERVICE_ACCOUNT — nie ma czym się uwierzytelnić.');
  process.exit(1);
}

let credentials;
try {
  credentials = JSON.parse(raw);
} catch {
  console.error('FIREBASE_SERVICE_ACCOUNT nie jest poprawnym JSON-em.');
  process.exit(1);
}

initializeApp({ credential: cert(credentials) });
const auth = getAuth();
const db = getFirestore();

// Bez zapytania po `doneAt`: Firestore pomija dokumenty, które tego pola NIE
// MAJĄ — a panel tworzy zlecenia właśnie bez niego. Zapytanie kończyło się
// więc powodzeniem i pustą listą, przez co skrypt raportował „brak zleceń",
// choć czekały. Bierzemy wszystkie i filtrujemy u siebie; zleceń są jednostki.
const snapshot = await db.collection('accountRemovals').get();
const todo = snapshot.docs.filter((doc) => !doc.data().doneAt);

if (todo.length === 0) {
  console.log('Brak zleceń do wykonania.');
  process.exit(0);
}

console.log(`Zleceń do wykonania: ${todo.length}`);

for (const doc of todo) {
  const { uid, email } = doc.data();
  if (!uid) {
    await doc.ref.update({ doneAt: new Date().toISOString(), error: 'Brak uid.' });
    continue;
  }

  try {
    await auth.deleteUser(uid);
    console.log(`✓ usunięto konto ${email || uid}`);
  } catch (error) {
    // Konto mogło już nie istnieć (skasowane ręcznie w konsoli) — to nie błąd,
    // zlecenie i tak jest wykonane.
    const code = error?.errorInfo?.code ?? '';
    if (code === 'auth/user-not-found') {
      console.log(`• konto ${email || uid} już nie istniało`);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✗ ${email || uid}: ${message}`);
      await doc.ref.update({ doneAt: new Date().toISOString(), error: message });
      continue;
    }
  }

  // Wpis roli znika razem z kontem — inaczej zespół pokazywałby kogoś,
  // kto już nie istnieje.
  await db.collection('roles').doc(uid).delete().catch(() => {});
  await doc.ref.update({ doneAt: new Date().toISOString() });
}

console.log('Gotowe.');
