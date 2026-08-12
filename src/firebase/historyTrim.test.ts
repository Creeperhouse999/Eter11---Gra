import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BUILTIN_CONTENT } from '../data/builtinContent';

/**
 * Nieudane przycięcie historii nie może wywrócić zapisu treści.
 *
 * Historia chroni przed nieodwracalnym nadpisaniem, więc kasować z niej stare
 * wersje może wyłącznie admin. Ale przycinanie odpala się przy KAŻDYM zapisie
 * treści — także wtedy, gdy zapisuje redaktor bez tego prawa (coworker, czyli
 * u nas Marcin i Joanna).
 *
 * Odmowa wracała wtedy jako niewyłapane odrzucenie obietnicy, choć treść
 * zapisała się poprawnie: w przeglądarce lądował błąd, a redaktor nie miał
 * pojęcia, czy jego praca weszła. Przycinanie jest sprzątaniem — najwyżej
 * zostanie kilka wersji za dużo, a usunie je następny zapis admina.
 */

const setDocMock = vi.fn(async () => {});
const deleteDocMock = vi.fn(async () => {});
const getDocsMock = vi.fn(async () => ({
  // Więcej niż limit, żeby przycinanie miało co kasować.
  docs: Array.from({ length: 15 }, (_, i) => ({ ref: { id: `stara-${i}` } })),
}));

vi.mock('./client', () => ({ db: {}, auth: {} }));
vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  doc: () => ({}),
  deleteDoc: () => deleteDocMock(),
  getDocs: () => getDocsMock(),
  onSnapshot: () => () => {},
  setDoc: () => setDocMock(),
  addDoc: async () => ({ id: 'x' }),
  orderBy: () => ({}),
  query: () => ({}),
  limit: () => ({}),
}));

const { recordVersion } = await import('./history');

beforeEach(() => {
  setDocMock.mockClear();
  deleteDocMock.mockClear();
  deleteDocMock.mockImplementation(async () => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const wersja = {
  at: '2026-08-12T10:00:00.000Z',
  author: 'Marcin',
  content: BUILTIN_CONTENT,
  previous: undefined,
};

describe('recordVersion — przycinanie historii', () => {
  it('zapisuje wersję i kasuje nadmiarowe', async () => {
    await recordVersion(wersja);

    expect(setDocMock).toHaveBeenCalledTimes(1);
    // Piętnaście wersji, limit dziesięć — pięć do skasowania.
    expect(deleteDocMock).toHaveBeenCalledTimes(5);
  });

  it('odmowa kasowania NIE wywraca zapisu', async () => {
    deleteDocMock.mockImplementation(async () => {
      throw new Error('permission-denied');
    });

    // Sedno: brak wyjątku na zewnątrz. Redaktor bez prawa kasowania i tak
    // zapisuje treść — historia zostaje po prostu dłuższa.
    await expect(recordVersion(wersja)).resolves.toBeUndefined();
    expect(setDocMock).toHaveBeenCalledTimes(1);
  });

  it('gdy sam odczyt historii się nie powiedzie, zapis też stoi', async () => {
    getDocsMock.mockImplementationOnce(async () => {
      throw new Error('permission-denied');
    });

    await expect(recordVersion(wersja)).resolves.toBeUndefined();
    expect(setDocMock).toHaveBeenCalledTimes(1);
  });
});
