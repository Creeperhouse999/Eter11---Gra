import { describe, it, expect } from 'vitest';
import { przesiej, filtrAktywny, PUSTY_FILTR } from './reportFilter';
import type { Report } from './reports';

/**
 * Alan poprosił o filtry w zgłoszeniach. Powód widać w liczbach: zgłoszeń jest
 * ponad osiemdziesiąt, a w samych „Potwierdzonych" leży siedemdziesiąt — sama
 * zakładka statusu przestała wystarczać, gdy szuka się jednej sprawy.
 */

function zgloszenie(over: Partial<Report>): Report {
  return {
    id: 'x',
    title: 'Tytuł',
    description: 'Opis',
    author: 'Adam',
    kind: 'bug',
    status: 'new',
    createdAt: '2026-09-01T10:00:00.000Z',
    notes: [],
    ...over,
  } as Report;
}

const lista: Report[] = [
  zgloszenie({ id: 'blad-ultra', kind: 'bug', priority: 'ultra', title: 'Gra stoi' }),
  zgloszenie({ id: 'pomysl', kind: 'idea', priority: 'low', title: 'Nowa misja' }),
  zgloszenie({
    id: 'pytanie',
    kind: 'question',
    title: 'Jak działa mata',
    description: 'Nie mogę przekazać karty koledze',
  }),
  zgloszenie({ id: 'inny-status', status: 'done', title: 'Gra stoi też' }),
];

describe('filtry zgłoszeń', () => {
  it('bez filtrów widać wszystko z danej zakładki', () => {
    expect(przesiej(lista, 'new').map((r) => r.id)).toEqual([
      'blad-ultra',
      'pytanie',
      'pomysl',
    ]);
  });

  it('zakładka statusu obowiązuje zawsze', () => {
    expect(przesiej(lista, 'done').map((r) => r.id)).toEqual(['inny-status']);
  });

  it('filtr rodzaju zostawia jeden rodzaj', () => {
    const wynik = przesiej(lista, 'new', { ...PUSTY_FILTR, kind: 'question' });
    expect(wynik.map((r) => r.id)).toEqual(['pytanie']);
  });

  it('filtr pilności liczy brak pilności jako zwykłą', () => {
    const wynik = przesiej(lista, 'new', { ...PUSTY_FILTR, priority: 'medium' });
    expect(wynik.map((r) => r.id)).toEqual(['pytanie']);
  });

  it('szukanie działa też po treści, nie tylko po tytule', () => {
    const wynik = przesiej(lista, 'new', { ...PUSTY_FILTR, szukaj: 'przekazać karty' });
    expect(wynik.map((r) => r.id)).toEqual(['pytanie']);
  });

  it('szukanie nie patrzy na wielkość liter ani na spacje wokół', () => {
    const wynik = przesiej(lista, 'new', { ...PUSTY_FILTR, szukaj: '  GRA STOI ' });
    expect(wynik.map((r) => r.id)).toEqual(['blad-ultra']);
  });

  it('filtry się sumują', () => {
    const wynik = przesiej(lista, 'new', { kind: 'idea', priority: 'ultra', szukaj: '' });
    expect(wynik).toEqual([]);
  });

  it('kolejność zostaje taka, jak kolejność brania', () => {
    const wDwoch = [
      zgloszenie({ id: 'stary-wysoki', priority: 'high', createdAt: '2026-08-01T10:00:00.000Z' }),
      zgloszenie({ id: 'nowy-wysoki', priority: 'high', createdAt: '2026-09-01T10:00:00.000Z' }),
      zgloszenie({ id: 'krytyczny', priority: 'ultra', createdAt: '2026-07-01T10:00:00.000Z' }),
    ];
    expect(przesiej(wDwoch, 'new').map((r) => r.id)).toEqual([
      'krytyczny',
      'nowy-wysoki',
      'stary-wysoki',
    ]);
  });

  it('wie, kiedy coś jest odsiane', () => {
    expect(filtrAktywny(PUSTY_FILTR)).toBe(false);
    expect(filtrAktywny({ ...PUSTY_FILTR, szukaj: '   ' })).toBe(false);
    expect(filtrAktywny({ ...PUSTY_FILTR, kind: 'bug' })).toBe(true);
    expect(filtrAktywny({ ...PUSTY_FILTR, szukaj: 'x' })).toBe(true);
  });
});
