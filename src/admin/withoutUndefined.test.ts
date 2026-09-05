import { describe, it, expect } from 'vitest';
import { bezPustych } from './withoutUndefined';

/**
 * Adam: „gdy chcę skasować dodaną grafikę do karty, pojawia się błąd
 * »Unsupported field value: undefined (found in document content/game)«.
 * Napraw to".
 *
 * Firestore odrzuca cały zapis, gdy gdziekolwiek w dokumencie stoi
 * `undefined` — nie traktuje tego jako „brak wartości", tylko jako wartość
 * nie do zapisania. Kasowanie grafiki było napisane jako
 * `{ ...card, image: undefined }`, czyli po JavaScriptowemu poprawnie
 * i po Firestore'owemu błędnie.
 */

describe('usuwanie pustych pól przed zapisem', () => {
  it('wyrzuca klucz o wartości undefined', () => {
    const wynik = bezPustych({ id: 'k1', name: 'Odwaga', image: undefined });
    expect('image' in wynik).toBe(false);
    expect(wynik).toEqual({ id: 'k1', name: 'Odwaga' });
  });

  it('zostawia wszystko inne, łącznie z fałszywymi wartościami', () => {
    const wynik = bezPustych({
      zero: 0,
      pusty: '',
      falsz: false,
      nic: null,
      brak: undefined,
    });
    expect(wynik).toEqual({ zero: 0, pusty: '', falsz: false, nic: null });
  });

  it('nie rusza obiektu wejściowego', () => {
    const karta = { id: 'k', image: undefined };
    bezPustych(karta);
    expect('image' in karta).toBe(true);
  });

  it('obiekt bez pustych pól zostaje taki sam', () => {
    const karta = { id: 'k', image: 'https://x/y.png' };
    expect(bezPustych(karta)).toEqual(karta);
  });
});
