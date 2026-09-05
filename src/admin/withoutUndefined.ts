/**
 * Kopia obiektu BEZ pól, których wartość jest `undefined`.
 *
 * Adam zgłosił: „gdy chcę skasować dodaną grafikę do karty, pojawia się błąd
 * »Function Transaction.set() called with invalid data. Unsupported field
 * value: undefined (found in document content/game)«".
 *
 * W JavaScripcie `{ ...card, image: undefined }` to naturalny sposób
 * powiedzenia „ta karta nie ma już grafiki" — i tak było to napisane. Ale
 * Firestore odrzuca CAŁY zapis, gdy natrafi gdziekolwiek w dokumencie na
 * `undefined`: dla niego to nie „brak wartości", tylko wartość, której nie
 * umie zapisać. Karta zostawała z grafiką, a redaktor dostawał komunikat
 * o wygasłej sesji, choć z logowaniem nie miało to nic wspólnego.
 *
 * Pole trzeba więc USUNĄĆ z obiektu, a nie ustawić na `undefined`. Typy
 * zostają te same, bo wszystkie te pola są opcjonalne — brak klucza i klucz
 * o wartości `undefined` znaczą w TypeScripcie to samo, a w Firestore już nie.
 */
export function bezPustych<T extends object>(obiekt: T): T {
  const wynik = {} as T;
  for (const [klucz, wartosc] of Object.entries(obiekt)) {
    if (wartosc !== undefined) {
      (wynik as Record<string, unknown>)[klucz] = wartosc;
    }
  }
  return wynik;
}
