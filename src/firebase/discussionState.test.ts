import { describe, it, expect } from 'vitest';
import { stanWatku, type Discussion } from './discussions';

/**
 * Plakietka stanu na liście wątków.
 *
 * Adam poprosił: „w ramce danej dyskusji zrób napisy — »nowa odpowiedź«,
 * jeśli ktoś odpowiedział na komentarz AI albo innej osoby, oraz »czeka na
 * odp. od AI«, jeśli jeszcze nie odpowiedziałeś na komentarz usera".
 *
 * Sens: po liście wątków nie da się poznać, gdzie coś się ruszyło, a gdzie
 * ktoś czeka. Przy ośmiu wątkach trzeba otwierać każdy po kolei.
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
  it('ostatnie słowo człowieka = czeka na odpowiedź AI', () => {
    expect(stanWatku(watek(['Claude', 'Adam']))).toBe('czeka-na-ai');
  });

  it('ostatnie słowo AI = jest nowa odpowiedź do przeczytania', () => {
    expect(stanWatku(watek(['Adam', 'Claude']))).toBe('nowa-odpowiedz');
  });

  it('wątek bez odpowiedzi czeka na AI — sam opis to pytanie bez reakcji', () => {
    expect(stanWatku(watek([]))).toBe('czeka-na-ai');
  });

  it('wątek ustalony nie ma stanu — nikt na nic nie czeka', () => {
    const zamkniety = { ...watek(['Adam']), closed: true };

    expect(stanWatku(zamkniety)).toBeNull();
  });

  it('rozmowa dwóch osób bez AI też czeka na AI', () => {
    // Nikt z zespołu nie pisze jako „Claude", więc ostatnie słowo należy do
    // człowieka — a to znaczy, że odpowiedzi jeszcze nie było.
    expect(stanWatku(watek(['Adam', 'Marcin']))).toBe('czeka-na-ai');
  });
});
