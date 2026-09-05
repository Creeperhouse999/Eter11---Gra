import { describe, it, expect } from 'vitest';
import { stanWatku, type Discussion } from './discussions';

/**
 * Plakietka stanu na liście wątków.
 *
 * Pierwsza wersja patrzyła tylko na to, czy ostatnie słowo należy do AI —
 * więc rozmowa dwóch osób z zespołu (bez AI w ogóle) zawsze wisiała jako
 * „czeka na odpowiedź od AI", nawet gdy to WŁAŚNIE druga osoba odpisała.
 * Adam po tym: „powinno być »nowa odpowiedź — sprawdź«, gdy napisał inny
 * user, albo Ty [AI] napisałeś [i ja jako user powinienem odpisać]".
 *
 * Rozstrzyga więc PATRZĄCY na listę, nie AI: piłka jest po jego stronie
 * tylko wtedy, gdy TO ON napisał ostatnie słowo — inaczej jest coś nowego
 * do sprawdzenia, bez znaczenia, czy napisała to AI, czy kolega z zespołu.
 */

const watek = (autorzy: string[]): Discussion =>
  ({
    id: 'w1',
    title: 'Wątek',
    description: 'Opis',
    author: 'Adam',
    createdAt: '2026-09-01T10:00:00.000Z',
    messages: autorzy.map((author, i) => ({
      author,
      text: `wypowiedź ${i}`,
      at: `2026-09-0${i + 1}T10:00:00.000Z`,
    })),
    closed: false,
  }) as Discussion;

describe('stan wątku dyskusji', () => {
  it('ostatnie słowo patrzącego = czeka na odpowiedź', () => {
    expect(stanWatku(watek(['Claude', 'Adam']), 'Adam')).toBe('czeka-na-ai');
  });

  it('ostatnie słowo AI = jest nowa odpowiedź do przeczytania', () => {
    expect(stanWatku(watek(['Adam', 'Claude']), 'Adam')).toBe('nowa-odpowiedz');
  });

  it('wątek bez odpowiedzi: patrzy jego własny autor = czeka na odpowiedź', () => {
    expect(stanWatku(watek([]), 'Adam')).toBe('czeka-na-ai');
  });

  it('wątek ustalony nie ma stanu — nikt na nic nie czeka', () => {
    const zamkniety = { ...watek(['Adam']), closed: true };

    expect(stanWatku(zamkniety, 'Adam')).toBeNull();
  });

  it(
    'inny członek zespołu odpisał jako ostatni — to nowa odpowiedź, ' +
      'nie „czeka na AI" (regresja: pierwsza wersja liczyła KAŻDEGO ' +
      'nie-AI jako „czeka na AI", więc rozmowa Adama z Marcinem bez AI ' +
      'wisiała tak zawsze, nawet gdy to Marcin właśnie odpisał)',
    () => {
      expect(stanWatku(watek(['Adam', 'Marcin']), 'Adam')).toBe('nowa-odpowiedz');
    },
  );

  it('to JA napisałem ostatni do kolegi z zespołu = czeka na odpowiedź', () => {
    expect(stanWatku(watek(['Marcin', 'Adam']), 'Adam')).toBe('czeka-na-ai');
  });

  it('wątek bez odpowiedzi założony przez kogoś innego = nowa odpowiedź', () => {
    // `watek` zawsze ustawia `author: 'Adam'` — patrzy tu Milena, więc
    // niezaczepiony wątek Adama to dla niej coś nowego do sprawdzenia.
    expect(stanWatku(watek([]), 'Milena')).toBe('nowa-odpowiedz');
  });
});
