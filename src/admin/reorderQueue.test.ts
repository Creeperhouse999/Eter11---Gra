import { describe, it, expect } from 'vitest';
import { wgRecznejKolejnosci, poPrzesunieciu, poPrzeciagnieciu } from './reorderQueue';

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

/**
 * Adam po strzałkach: „najlepiej abym mógł przesuwać je ręcznie — bez
 * strzałek. Czyli że łapię i przesuwam". Strzałki przestawiają o jedno
 * miejsce, więc przeniesienie zgłoszenia z końca listy na górę wymagało
 * kilkunastu kliknięć.
 */
describe('przeciąganie pozycji w kolejce', () => {
  it('upuszczenie na górę przenosi na pierwsze miejsce', () => {
    const wynik = poPrzeciagnieciu([z('a'), z('b'), z('c'), z('d')], 'd', 'a')!;
    expect(wynik.map((r) => r.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('upuszczenie na dół przenosi na koniec', () => {
    const wynik = poPrzeciagnieciu([z('a'), z('b'), z('c')], 'a', 'c')!;
    expect(wynik.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('upuszczenie w środek wstawia dokładnie w to miejsce', () => {
    const wynik = poPrzeciagnieciu([z('a'), z('b'), z('c'), z('d')], 'a', 'c')!;
    expect(wynik.map((r) => r.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('upuszczenie na samego siebie niczego nie zmienia', () => {
    expect(poPrzeciagnieciu([z('a'), z('b')], 'a', 'a')).toBeNull();
  });

  it('nieznana pozycja nie rusza listy', () => {
    expect(poPrzeciagnieciu([z('a')], 'a', 'nie-ma')).toBeNull();
    expect(poPrzeciagnieciu([z('a')], 'nie-ma', 'a')).toBeNull();
  });

  it('każda pozycja dostaje kolejną rangę od zera', () => {
    const wynik = poPrzeciagnieciu([z('a'), z('b'), z('c')], 'c', 'a')!;
    expect(wynik).toEqual([
      { id: 'c', queueRank: 0 },
      { id: 'a', queueRank: 1 },
      { id: 'b', queueRank: 2 },
    ]);
  });

  it('przeciąganie liczy się od kolejności WIDOCZNEJ, nie wejściowej', () => {
    // Lista wchodzi nieuporządkowana, ale na ekranie „x" stoi pierwsze.
    const lista = [z('y', 1), z('x', 0), z('z', 2)];
    const wynik = poPrzeciagnieciu(lista, 'z', 'x')!;
    expect(wynik.map((r) => r.id)).toEqual(['z', 'x', 'y']);
  });
});
