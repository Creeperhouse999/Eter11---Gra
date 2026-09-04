import { describe, it, expect } from 'vitest';
import { czyMojaTura } from './turnOwner';
import type { GameState } from '../engine/types';

/**
 * Regresja z tej samej godziny: blokada ruchów poza turą zamknęła grę
 * aktywnemu graczowi. Adam: „wyświetla się informacja, ale teraz gracz 1 nie
 * może dodać karty do problemu pomimo, że pasuje".
 *
 * Powód: dwa różne źródła prawdy o tym, czyja jest tura. Ekran misji bierze
 * aktywnego z `state.players` (silnik), a blokada brała go z listy graczy
 * pokoju. Listy rozjeżdżają się, gdy ktoś wyjdzie z pokoju: jego wpis znika
 * z `room.players`, ale zostaje w `state.players` — i ten sam indeks wskazuje
 * w każdej z nich kogo innego.
 */

function stan(ids: string[], aktywny: number): GameState {
  return {
    activePlayerIndex: aktywny,
    players: ids.map((id) => ({ id })),
  } as unknown as GameState;
}

describe('czyja tura w grze online', () => {
  it('aktywny gracz ma turę', () => {
    expect(czyMojaTura(stan(['a', 'b'], 0), 'a')).toBe(true);
  });

  it('pozostali nie mają', () => {
    expect(czyMojaTura(stan(['a', 'b'], 0), 'b')).toBe(false);
  });

  it('tura idzie za indeksem, nie za miejscem na liście', () => {
    expect(czyMojaTura(stan(['a', 'b', 'c'], 2), 'c')).toBe(true);
  });

  /**
   * Sedno regresji: gracz „b" wyszedł, więc lista POKOJU to ['a','c'] i indeks
   * 1 wskazywałby na „c". W silniku pod indeksem 1 stoi wciąż „b", a ekran
   * misji rysuje właśnie jego rękę. Blokada musi zgadzać się z ekranem —
   * inaczej pokazuje karty komuś, komu ich nie pozwala zagrać.
   */
  it('trzyma się listy silnika, gdy skład pokoju się zmienił', () => {
    const state = stan(['a', 'b', 'c'], 1);
    expect(czyMojaTura(state, 'b')).toBe(true);
    expect(czyMojaTura(state, 'c')).toBe(false);
  });

  it('bez stanu nikt nie ma tury', () => {
    expect(czyMojaTura(undefined, 'a')).toBe(false);
    expect(czyMojaTura(stan([], 0), 'a')).toBe(false);
  });
});
