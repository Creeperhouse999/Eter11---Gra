import { describe, it, expect } from 'vitest';
import { wgRecznejKolejnosci, poPrzesunieciu } from './reorderQueue';

/**
 * Adam: „zrób, abym mógł zarówno »w kolejce«, jak i »lista kolejnych zadań«
 * zmieniać kolejność, przesuwając dane ramki w górę i w dół".
 *
 * Automatyczna kolejność (pilność, potem wiek) to tylko domysł. Dotąd jedynym
 * sposobem powiedzenia „weź to najpierw" było podbicie pilności — czyli
 * skłamanie o tym, jak bardzo coś płonie.
 */

const z = (id: string, queueRank?: number) => ({ id, queueRank });

describe('ręczna kolejność kolejki', () => {
  it('bez rang zostaje kolejność automatyczna', () => {
    const lista = [z('a'), z('b'), z('c')];
    expect(wgRecznejKolejnosci(lista).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('pozycje z rangą idą przed tymi bez', () => {
    const lista = [z('bez1'), z('bez2'), z('reczne', 0)];
    expect(wgRecznejKolejnosci(lista).map((r) => r.id)).toEqual([
      'reczne',
      'bez1',
      'bez2',
    ]);
  });

  it('rangi decydują między sobą', () => {
    const lista = [z('drugi', 5), z('pierwszy', 1)];
    expect(wgRecznejKolejnosci(lista).map((r) => r.id)).toEqual(['pierwszy', 'drugi']);
  });

  it('przesunięcie w górę zamienia z sąsiadem', () => {
    const lista = [z('a'), z('b'), z('c')];
    const wynik = poPrzesunieciu(lista, 'b', 'gora')!;
    expect(wynik.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('przesunięcie w dół zamienia z sąsiadem', () => {
    const lista = [z('a'), z('b'), z('c')];
    expect(poPrzesunieciu(lista, 'a', 'dol')!.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  /**
   * Sedno: zapisujemy rangi CAŁEJ listy, nie tylko przesuwanego wpisu.
   * Gdyby rangę dostawał jeden element, reszta zostałaby bez niej i kolejność
   * zależałaby od tego, w jakiej kolejności ktoś klikał — a nie od tego, jak
   * lista wygląda na ekranie.
   */
  it('każda pozycja dostaje rangę, kolejne liczby od zera', () => {
    const wynik = poPrzesunieciu([z('a'), z('b'), z('c')], 'c', 'gora')!;
    expect(wynik).toEqual([
      { id: 'a', queueRank: 0 },
      { id: 'c', queueRank: 1 },
      { id: 'b', queueRank: 2 },
    ]);
  });

  it('pierwszego nie da się przesunąć wyżej, ostatniego niżej', () => {
    const lista = [z('a'), z('b')];
    expect(poPrzesunieciu(lista, 'a', 'gora')).toBeNull();
    expect(poPrzesunieciu(lista, 'b', 'dol')).toBeNull();
  });

  it('nieznane zgłoszenie niczego nie rusza', () => {
    expect(poPrzesunieciu([z('a')], 'nie-ma', 'gora')).toBeNull();
  });

  it('przesunięcia składają się w oczekiwaną kolejność', () => {
    let lista = [z('a'), z('b'), z('c'), z('d')];
    for (const krok of ['gora', 'gora', 'gora'] as const) {
      const rangi = poPrzesunieciu(lista, 'd', krok)!;
      const mapa = new Map(rangi.map((r) => [r.id, r.queueRank]));
      lista = lista.map((r) => ({ ...r, queueRank: mapa.get(r.id) }));
    }
    expect(wgRecznejKolejnosci(lista).map((r) => r.id)).toEqual(['d', 'a', 'b', 'c']);
  });
});
