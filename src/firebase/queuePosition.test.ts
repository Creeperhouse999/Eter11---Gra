import { describe, it, expect } from 'vitest';
import { kolejka, pozycjaWKolejce, doZdjeciaZRoboty } from './queuePosition';
import type { Report } from './reports';

/**
 * Alan prosił o numer w kolejce wiele razy: „miało być, zapominałeś, że
 * w kolejce nr X, nie po prostu w kolejce". Sama plakietka „W kolejce" nie
 * mówi nic o tym, kiedy sprawa ruszy.
 *
 * I druga rzecz z tej samej rozmowy: „jest status, że się robi u dwóch naraz,
 * sprawdzam wiele naraz". Robić mogę jedną rzecz — dwa „Robi się" to
 * nieprawda na ekranie.
 */

function zgloszenie(over: Partial<Report>): Report {
  return {
    id: 'x',
    title: 't',
    description: 'd',
    author: 'Adam',
    kind: 'bug',
    status: 'new',
    createdAt: '2026-09-01T10:00:00.000Z',
    notes: [],
    ...over,
  } as Report;
}

describe('kolejka zgłoszeń', () => {
  it('pilniejsze stoi wyżej', () => {
    const lista = [
      zgloszenie({ id: 'niski', priority: 'low' }),
      zgloszenie({ id: 'krytyczny', priority: 'ultra' }),
      zgloszenie({ id: 'zwykly', priority: 'medium' }),
    ];
    expect(kolejka(lista).map((r) => r.id)).toEqual(['krytyczny', 'zwykly', 'niski']);
  });

  it('przy równej pilności starsze idzie pierwsze', () => {
    const lista = [
      zgloszenie({ id: 'nowsze', createdAt: '2026-09-03T10:00:00.000Z' }),
      zgloszenie({ id: 'starsze', createdAt: '2026-09-01T10:00:00.000Z' }),
    ];
    expect(kolejka(lista).map((r) => r.id)).toEqual(['starsze', 'nowsze']);
  });

  it('brak pilności liczy się jak zwykła', () => {
    const lista = [
      zgloszenie({ id: 'bez' }),
      zgloszenie({ id: 'wysoki', priority: 'high' }),
      zgloszenie({ id: 'niski', priority: 'low' }),
    ];
    expect(kolejka(lista).map((r) => r.id)).toEqual(['wysoki', 'bez', 'niski']);
  });

  it('zgłoszenia w robocie i sprawdzane nie stoją w kolejce', () => {
    const lista = [
      zgloszenie({ id: 'czeka' }),
      zgloszenie({ id: 'robi', progress: 'working' }),
      zgloszenie({ id: 'sprawdzam', progress: 'testing' }),
      zgloszenie({ id: 'zrobione', progress: 'finished' }),
    ];
    expect(kolejka(lista).map((r) => r.id)).toEqual(['czeka']);
  });

  it('zamknięte i czekające na akceptację nie liczą się do kolejki', () => {
    const lista = [
      zgloszenie({ id: 'nowe', status: 'new' }),
      zgloszenie({ id: 'wrocilo', status: 'reopened' }),
      zgloszenie({ id: 'gotowe', status: 'done' }),
      zgloszenie({ id: 'odrzucone', status: 'dismissed' }),
      zgloszenie({ id: 'dosprawdzenia', status: 'fixed' }),
      zgloszenie({ id: 'akceptacja', status: 'pending' }),
    ];
    expect(kolejka(lista).map((r) => r.id).sort()).toEqual(['nowe', 'wrocilo']);
  });

  it('numer liczy się od 1', () => {
    const lista = [
      zgloszenie({ id: 'a', priority: 'ultra' }),
      zgloszenie({ id: 'b', priority: 'high' }),
      zgloszenie({ id: 'c', priority: 'low' }),
    ];
    expect(pozycjaWKolejce(lista, 'a')).toBe(1);
    expect(pozycjaWKolejce(lista, 'b')).toBe(2);
    expect(pozycjaWKolejce(lista, 'c')).toBe(3);
  });

  it('zgłoszenie spoza kolejki nie ma numeru', () => {
    const lista = [zgloszenie({ id: 'robi', progress: 'working' })];
    expect(pozycjaWKolejce(lista, 'robi')).toBeNull();
    expect(pozycjaWKolejce(lista, 'nieistnieje')).toBeNull();
  });
});

describe('tylko jedno „Robi się" naraz', () => {
  it('branie nowego zdejmuje robotę z pozostałych', () => {
    const lista = [
      zgloszenie({ id: 'stare1', progress: 'working' }),
      zgloszenie({ id: 'stare2', progress: 'working' }),
      zgloszenie({ id: 'biore' }),
    ];
    expect(doZdjeciaZRoboty(lista, 'biore').sort()).toEqual(['stare1', 'stare2']);
  });

  it('nie zdejmuje samego siebie', () => {
    const lista = [zgloszenie({ id: 'to-samo', progress: 'working' })];
    expect(doZdjeciaZRoboty(lista, 'to-samo')).toEqual([]);
  });

  it('„Sprawdzam" zostaje na wielu — to czeka na zespół, nie na mnie', () => {
    const lista = [
      zgloszenie({ id: 's1', progress: 'testing' }),
      zgloszenie({ id: 's2', progress: 'testing' }),
    ];
    expect(doZdjeciaZRoboty(lista, 'inne')).toEqual([]);
  });
});
