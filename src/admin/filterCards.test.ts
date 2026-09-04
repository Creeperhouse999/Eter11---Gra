import { describe, it, expect } from 'vitest';
import { filtrujKarty } from './filterCards';
import { ALL_CARDS } from '../data/cards';
import type { Card } from '../engine/types';

/**
 * Filtrowanie kart w edytorze.
 *
 * Ten test istnieje w tej formie z powodu, który warto zapisać: poprzedni
 * montował CAŁY `CardEditor` z sześćdziesięcioma kilkoma kartami i klikał
 * w listę rozwijaną, żeby sprawdzić jednego `if`-a. Trwał sekundy i przy
 * rosnącej suicie zaczął wysypywać się na timeout — czerwone światło mówiło
 * wtedy o wolnym renderze, nie o usterce w filtrowaniu. Podnoszenie limitu
 * czasu leczyłoby objaw; sito wyjęte z komponentu leczy przyczynę.
 */

function karta(over: Partial<Card>): Card {
  return {
    id: 'k',
    name: 'Karta',
    category: 'psychological',
    description: '',
    icon: 'star',
    ...over,
  };
}

const PUSTY = { category: 'all', family: 'all', szukaj: '' } as const;

describe('filtrowanie kart w edytorze', () => {
  it('bez filtrów przechodzą wszystkie', () => {
    expect(filtrujKarty(ALL_CARDS, PUSTY, 'order')).toHaveLength(ALL_CARDS.length);
  });

  it('kategoria zostawia tylko swoje karty', () => {
    const mentorow = ALL_CARDS.filter((c) => c.category === 'mentor').length;
    const wynik = filtrujKarty(ALL_CARDS, { ...PUSTY, category: 'mentor' }, 'order');
    expect(wynik).toHaveLength(mentorow);
    expect(wynik.every((c) => c.category === 'mentor')).toBe(true);
  });

  it('rodzina i kategoria działają razem', () => {
    const lista = [
      karta({ id: 'a', category: 'mentor', family: 'red' }),
      karta({ id: 'b', category: 'mentor', family: 'blue' }),
      karta({ id: 'c', category: 'digital', family: 'red' }),
    ];
    const wynik = filtrujKarty(lista, { category: 'mentor', family: 'red', szukaj: '' }, 'order');
    expect(wynik.map((c) => c.id)).toEqual(['a']);
  });

  it('szuka po nazwie, opisie i nazwie kategorii', () => {
    const lista = [
      karta({ id: 'nazwa', name: 'Odwaga' }),
      karta({ id: 'opis', name: 'Inna', description: 'wymaga odwagi' }),
      karta({ id: 'kategoria', name: 'Trzecia', category: 'mentor' }),
    ];
    expect(filtrujKarty(lista, { ...PUSTY, szukaj: 'odwag' }, 'order').map((c) => c.id)).toEqual([
      'nazwa',
      'opis',
    ]);
    expect(
      filtrujKarty(lista, { ...PUSTY, szukaj: 'mentor' }, 'order').map((c) => c.id),
    ).toEqual(['kategoria']);
  });

  it('wszystkie słowa muszą wystąpić, kolejność nieważna', () => {
    const lista = [
      karta({ id: 'oba', name: 'Spokój i cierpliwość' }),
      karta({ id: 'jedno', name: 'Spokój' }),
    ];
    const wynik = filtrujKarty(lista, { ...PUSTY, szukaj: 'cierpliwość spokój' }, 'order');
    expect(wynik.map((c) => c.id)).toEqual(['oba']);
  });

  it('sortowanie po nazwie używa polskiego alfabetu', () => {
    const lista = [karta({ id: 'z', name: 'Zaufanie' }), karta({ id: 'l', name: 'Łagodność' })];
    expect(filtrujKarty(lista, PUSTY, 'name').map((c) => c.id)).toEqual(['l', 'z']);
  });

  it('„order" zostawia kolejność z talii', () => {
    const lista = [karta({ id: 'b', name: 'B' }), karta({ id: 'a', name: 'A' })];
    expect(filtrujKarty(lista, PUSTY, 'order').map((c) => c.id)).toEqual(['b', 'a']);
  });
});
