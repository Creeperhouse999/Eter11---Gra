import { describe, it, expect } from 'vitest';
import {
  kategoriaWatku,
  widoczneWatki,
  type Discussion,
  type DiscussionCategory,
} from './discussions';

/**
 * Adam: „aby w dyskusjach był podział: 1. dyskusje z AI, 2. dyskusje
 * z twórcami". Wątki leżały na jednej liście, więc pytanie skierowane do
 * zespołu ginęło między prośbami do mnie — nikt nie wiedział, czy ktoś na nie
 * w ogóle czeka.
 *
 * Pułapka jest w wątkach sprzed podziału: nie mają pola `category`. Gdyby
 * przepadały przy każdym filtrze, podział skasowałby z widoku całą dotychczasową
 * historię rozmów. Liczą się jako `ai`, bo takie właśnie były.
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

describe('kategorie dyskusji', () => {
  it('wątek bez kategorii liczy się jako rozmowa z AI', () => {
    expect(kategoriaWatku(watek({}))).toBe('ai');
  });

  it('zapisana kategoria ma pierwszeństwo', () => {
    expect(kategoriaWatku(watek({ category: 'zespol' }))).toBe('zespol');
  });

  it.each<[DiscussionCategory, string[]]>([
    ['ai', ['stary', 'do-ai']],
    ['zespol', ['do-zespolu']],
  ])('filtr „%s" pokazuje właściwe wątki', (category, oczekiwane) => {
    const lista = [
      watek({ id: 'stary' }),
      watek({ id: 'do-ai', category: 'ai' }),
      watek({ id: 'do-zespolu', category: 'zespol' }),
    ];
    expect(widoczneWatki(lista, { closed: false, category }).map((d) => d.id)).toEqual(
      oczekiwane,
    );
  });

  it('bez wybranej kategorii widać wszystkie otwarte', () => {
    const lista = [
      watek({ id: 'a', category: 'ai' }),
      watek({ id: 'b', category: 'zespol' }),
      watek({ id: 'c' }),
    ];
    expect(widoczneWatki(lista, { closed: false, category: null })).toHaveLength(3);
  });

  it('ustalone i otwarte nie mieszają się', () => {
    const lista = [
      watek({ id: 'otwarty', category: 'zespol' }),
      watek({ id: 'ustalony', category: 'zespol', closed: true }),
    ];
    expect(
      widoczneWatki(lista, { closed: true, category: 'zespol' }).map((d) => d.id),
    ).toEqual(['ustalony']);
  });
});
