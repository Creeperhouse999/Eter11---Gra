import { describe, it, expect, beforeEach } from 'vitest';
import { familyLabel, setFamilyNames } from './categoryStyles';
import type { FamilyMap } from '../../data/families';

/**
 * Nazwy rodzin wpisane przez zespół pokazują się w grze.
 *
 * Zakładka „Rodziny" pozwala nazwać każdą z dwudziestu par kategoria×kolor —
 * czerwona w kategorii psychologicznej to „Siła wewnętrzna", a w cyfrowej coś
 * innego. Do tej pory gra tego nie czytała: w jedenastu miejscach pokazywała
 * zaszyte „Czerwona / Niebieska / Żółta / Zielona", więc formularz działał
 * w próżnię. Adam wybrał podłączenie tych nazw (wątek w dyskusjach).
 *
 * Nazwa zależy od PARY, nie od samego koloru — stąd drugi argument. Bez niego
 * (albo przy pustym polu) wracamy do koloru: dopasowanie karty do ścianki i tak
 * idzie po kluczu, ale dziecko musi widzieć jakąś nazwę.
 */

const nazwy = {
  psychological: [
    { id: 'red', name: 'Siła wewnętrzna', icon: 'star', description: '' },
    { id: 'blue', name: '', icon: 'star', description: '' },
  ],
  digital: [{ id: 'red', name: 'Porządek w danych', icon: 'star', description: '' }],
} as unknown as FamilyMap;

beforeEach(() => {
  setFamilyNames(undefined);
});

describe('familyLabel — nazwa rodziny w grze', () => {
  it('pokazuje nazwę wpisaną przez zespół', () => {
    setFamilyNames(nazwy);

    expect(familyLabel('red', 'psychological')).toBe('Siła wewnętrzna');
  });

  it('ten sam kolor w innej kategorii ma własną nazwę', () => {
    // Sedno całej funkcji: czerwony znaczy co innego w psychologii, co innego
    // w cyfrówce. Gdyby nazwa szła od samego koloru, ta różnica by zniknęła.
    setFamilyNames(nazwy);

    expect(familyLabel('red', 'digital')).toBe('Porządek w danych');
  });

  it('puste pole zostawia nazwę koloru', () => {
    setFamilyNames(nazwy);

    expect(familyLabel('blue', 'psychological')).toBe('Niebieska');
  });

  it('nienazwana para też wraca do koloru', () => {
    setFamilyNames(nazwy);

    expect(familyLabel('green', 'psychological')).toBe('Zielona');
  });

  it('bez kategorii pokazuje kolor — nie ma po czym rozpoznać pary', () => {
    setFamilyNames(nazwy);

    expect(familyLabel('red')).toBe('Czerwona');
  });

  it('zanim baza odpowie, gra pokazuje kolory zamiast pustki', () => {
    // Rejestr startuje pusty: treść z Firestore dochodzi po pierwszym renderze.
    expect(familyLabel('red', 'psychological')).toBe('Czerwona');
  });
});
