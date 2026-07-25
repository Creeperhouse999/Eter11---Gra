import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Licznik rozegranych partii. Moduł był bez testów, a niesie realną logikę
 * obronną: zapis przez serwerowy `increment` (żeby równoległe partie się nie
 * nadpisywały), przeliczanie nie-liczbowych pól na 0 przy odczycie (żeby
 * uszkodzone pole nie pokazało „NaN" w panelu zespołu) i celową ciszę przy
 * błędzie zapisu (dziecko kończące grę nie ma prawa zobaczyć błędu statystyki,
 * o której nie wie).
 */

// Sterowany „dokument w bazie" i przechwycony zapis — ten sam wzorzec co
// w saveConflict.test.ts.
let docData: Record<string, unknown> | undefined;
const setDocMock = vi.fn(async (_ref: unknown, _data: unknown, _opts: unknown) => {});

vi.mock('./client', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  getDoc: async () => ({
    exists: () => docData !== undefined,
    data: () => docData,
  }),
  setDoc: (ref: unknown, data: unknown, opts: unknown) => setDocMock(ref, data, opts),
  // Sentinel zamiast prawdziwego FieldValue — pozwala sprawdzić, o ile pole
  // ma wzrosnąć, bez sięgania do serwera.
  increment: (n: number) => ({ __inc: n }),
}));

import {
  recordFinishedGame,
  recordFinishedTutorial,
  loadPlayStats,
  EMPTY_STATS,
} from './playStats';

beforeEach(() => {
  docData = undefined;
  setDocMock.mockClear();
  setDocMock.mockImplementation(async () => {});
});

describe('playStats — zapis zdarzeń', () => {
  it('wygrana zwiększa finished i won o 1 oraz dolicza rozwiązane problemy', async () => {
    await recordFinishedGame({ won: true, missionsSolved: 3 });

    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, data, opts] = setDocMock.mock.calls[0];
    expect(data).toEqual({
      finished: { __inc: 1 },
      won: { __inc: 1 },
      missionsSolved: { __inc: 3 },
    });
    // `merge: true` jest konieczny — bez niego zapis kasowałby pozostałe pola.
    expect(opts).toEqual({ merge: true });
  });

  it('przegrana zwiększa finished, ale won o 0', async () => {
    await recordFinishedGame({ won: false, missionsSolved: 0 });

    const [, data] = setDocMock.mock.calls[0];
    expect(data).toEqual({
      finished: { __inc: 1 },
      won: { __inc: 0 },
      missionsSolved: { __inc: 0 },
    });
  });

  it('ukończony samouczek zwiększa tylko tutorialsFinished', async () => {
    await recordFinishedTutorial();

    const [, data, opts] = setDocMock.mock.calls[0];
    expect(data).toEqual({ tutorialsFinished: { __inc: 1 } });
    expect(opts).toEqual({ merge: true });
  });

  it('błąd zapisu jest połykany po cichu — koniec gry nie wybucha', async () => {
    setDocMock.mockRejectedValueOnce(new Error('offline'));
    await expect(
      recordFinishedGame({ won: true, missionsSolved: 1 }),
    ).resolves.toBeUndefined();
  });
});

describe('playStats — odczyt', () => {
  it('brak dokumentu → EMPTY_STATS', async () => {
    docData = undefined;
    expect(await loadPlayStats()).toEqual(EMPTY_STATS);
  });

  it('pola nie-liczbowe albo brakujące czyta jako 0 (żaden NaN w panelu)', async () => {
    docData = { finished: 10, won: 'oops', missionsSolved: null, tutorialsFinished: 4 };
    expect(await loadPlayStats()).toEqual({
      finished: 10,
      won: 0,
      missionsSolved: 0,
      tutorialsFinished: 4,
    });
  });

  it('komplet liczb czyta wiernie', async () => {
    docData = { finished: 7, won: 3, missionsSolved: 21, tutorialsFinished: 5 };
    expect(await loadPlayStats()).toEqual({
      finished: 7,
      won: 3,
      missionsSolved: 21,
      tutorialsFinished: 5,
    });
  });
});
