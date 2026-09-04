import { describe, it, expect } from 'vitest';
import { pierwszaWolnaPostac } from './freeCharacter';
import type { RoomPlayer } from './types';

/**
 * Dołączający dostaje postać, której nikt jeszcze nie ma.
 *
 * Adam zgłosił: „nie mogę kontynuować gry 2 graczy, bo wybiera się ta sama
 * postać (…) gdy dołącza kolejny gracz, automatycznie przypisz mu inną, ale
 * daj możliwość zmiany na taką, która nie jest zajęta".
 *
 * Wcześniej każdy wchodził z `ALL_CHARACTERS[0]`, więc przy dwóch graczach
 * obaj mieli tę samą postać, a start gry słusznie tego nie przepuszczał —
 * partia stała, zanim się zaczęła.
 */

const gracz = (uid: string, characterId: string): RoomPlayer => ({
  uid,
  name: uid,
  characterId,
  online: true,
  ready: false,
  joinedAt: 1,
});

const postacie = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('wybór wolnej postaci przy dołączaniu', () => {
  it('pusty pokój — bierze pierwszą z listy', () => {
    expect(pierwszaWolnaPostac({}, postacie)).toBe('a');
  });

  it('gdy pierwsza jest zajęta, bierze następną', () => {
    // Dokładnie przypadek Adama: gospodarz ma „a", gość dostaje „b".
    const zajete = { u1: gracz('u1', 'a') };

    expect(pierwszaWolnaPostac(zajete, postacie)).toBe('b');
  });

  it('pomija wszystkie zajęte, nie tylko pierwszą', () => {
    const zajete = { u1: gracz('u1', 'a'), u2: gracz('u2', 'b') };

    expect(pierwszaWolnaPostac(zajete, postacie)).toBe('c');
  });

  it('gdy wszystkie zajęte, wraca do pierwszej zamiast zwracać pustkę', () => {
    // Pokój ma limit czterech graczy, a postaci jest więcej — ten przypadek
    // nie powinien się zdarzyć. Ale pusty identyfikator wywróciłby start gry,
    // więc lepiej powtórzyć postać niż zostawić gracza bez niej.
    const zajete = {
      u1: gracz('u1', 'a'),
      u2: gracz('u2', 'b'),
      u3: gracz('u3', 'c'),
    };

    expect(pierwszaWolnaPostac(zajete, postacie)).toBe('a');
  });

  it('gracz wracający do pokoju nie blokuje sam sobie postaci', () => {
    // Po rozłączeniu wraca ten sam uid — ma dostać z powrotem swoją postać,
    // a nie kolejną wolną.
    const zajete = { u1: gracz('u1', 'b') };

    expect(pierwszaWolnaPostac(zajete, postacie, 'u1')).toBe('b');
  });

  it('pusta lista postaci nie wywraca dołączania', () => {
    expect(pierwszaWolnaPostac({}, [])).toBe('');
  });
});
