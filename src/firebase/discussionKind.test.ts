import { describe, it, expect } from 'vitest';
import { rodzajWatku, pilnoscWatku, wgPilnosci, type Discussion } from './discussions';

/**
 * Alan prosił o „typy w dyskusjach oraz pilność w dyskusjach" 1 września —
 * tym samym zgłoszeniem, co typ „pytanie" w zgłoszeniach. Odpisałem wtedy
 * „robię teraz" i nie zrobiłem; przypominał czterokrotnie.
 *
 * Bez pilności o kolejności decydowała sama data, więc wątek blokujący
 * („drukujemy jutro, jak to nazwać?") spadał pod świeżo założone luźne pomysły.
 * Wątki sprzed tej zmiany nie mają obu pól i muszą zachować się rozsądnie,
 * a nie wypaść z listy albo wskoczyć na górę.
 */

function watek(over: Partial<Discussion>): Discussion {
  return {
    id: 'x',
    title: 't',
    description: 'd',
    author: 'Adam',
    createdAt: '2026-09-01T10:00:00.000Z',
    messages: [],
    ...over,
  };
}

describe('rodzaj i pilność wątku', () => {
  it('stary wątek liczy się jak pomysł', () => {
    expect(rodzajWatku(watek({}))).toBe('idea');
  });

  it('zapisany rodzaj ma pierwszeństwo', () => {
    expect(rodzajWatku(watek({ kind: 'question' }))).toBe('question');
  });

  it('brak pilności znaczy zwykła', () => {
    expect(pilnoscWatku(watek({}))).toBe('medium');
    expect(pilnoscWatku(watek({ priority: 'ultra' }))).toBe('ultra');
  });
});

describe('kolejność wątków', () => {
  it('pilniejszy stoi wyżej niż nowszy', () => {
    const lista = [
      watek({ id: 'nowy-luzny', priority: 'low', createdAt: '2026-09-04T10:00:00.000Z' }),
      watek({ id: 'stary-pilny', priority: 'ultra', createdAt: '2026-08-01T10:00:00.000Z' }),
    ];
    expect(wgPilnosci(lista).map((d) => d.id)).toEqual(['stary-pilny', 'nowy-luzny']);
  });

  it('przy równej pilności najnowszy pierwszy', () => {
    const lista = [
      watek({ id: 'starszy', createdAt: '2026-08-01T10:00:00.000Z' }),
      watek({ id: 'nowszy', createdAt: '2026-09-01T10:00:00.000Z' }),
    ];
    expect(wgPilnosci(lista).map((d) => d.id)).toEqual(['nowszy', 'starszy']);
  });

  it('wątek bez pilności ląduje między wysokim a niskim', () => {
    const lista = [
      watek({ id: 'niski', priority: 'low' }),
      watek({ id: 'bez' }),
      watek({ id: 'wysoki', priority: 'high' }),
    ];
    expect(wgPilnosci(lista).map((d) => d.id)).toEqual(['wysoki', 'bez', 'niski']);
  });

  it('nie rusza listy podanej na wejściu', () => {
    const lista = [watek({ id: 'a', priority: 'low' }), watek({ id: 'b', priority: 'ultra' })];
    wgPilnosci(lista);
    expect(lista.map((d) => d.id)).toEqual(['a', 'b']);
  });
});
