import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BUILTIN_CONTENT } from '../data/builtinContent';

/**
 * Wykrywanie konfliktu przy zapisie zawartości.
 *
 * Dwóch redaktorów pracujących naraz nie może po cichu skasować sobie pracy.
 * Regresja: przy PIERWSZYM zapisie (panel nie znał jeszcze wersji bazowej)
 * sprawdzenie było pomijane, więc drugi zapis nadpisywał pierwszy. Test
 * pilnuje wszystkich trzech przypadków.
 */

// Sterowany stan „dokumentu w bazie".
let docData: { updatedAt?: string } | undefined;
const setDocMock = vi.fn((_ref: unknown, _data: unknown) => {});

// Odczyt i zapis biegną w JEDNEJ transakcji — inaczej dwa równoległe zapisy
// oba widziałyby tę samą wersję jako „bez konfliktu" i drugi kasowałby
// pierwszy. Mock oddaje ten kształt: `tx.get` czyta bieżący `docData`
// (autorytatywny odczyt, który Firestore gwarantuje w chwili commitu),
// `tx.set` zapisuje przez ten sam `setDocMock`.
const runTransactionMock = vi.fn(
  async (_db: unknown, updater: (tx: unknown) => Promise<unknown>) =>
    updater({
      get: async () => ({
        exists: () => docData !== undefined,
        data: () => docData,
      }),
      set: (ref: unknown, data: unknown) => setDocMock(ref, data),
    }),
);

vi.mock('./client', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  getDoc: async () => ({
    exists: () => docData !== undefined,
    data: () => docData,
  }),
  runTransaction: (db: unknown, updater: (tx: unknown) => Promise<unknown>) =>
    runTransactionMock(db, updater),
}));

const { saveContent } = await import('./content');

beforeEach(() => {
  docData = undefined;
  setDocMock.mockClear();
  runTransactionMock.mockClear();
});

describe('saveContent — konflikt zapisu', () => {
  it('pierwszy zapis do pustej bazy przechodzi', async () => {
    docData = undefined; // baza pusta
    const result = await saveContent(BUILTIN_CONTENT, undefined);
    expect(result.ok).toBe(true);
    expect(setDocMock).toHaveBeenCalledOnce();
  });

  it('zapis bez wersji bazowej, gdy w bazie już coś jest, to konflikt', async () => {
    // To był bug: pierwszy zapis pomijał sprawdzenie i kasował cudzą pracę.
    docData = { updatedAt: '2026-01-01T00:00:00.000Z' };
    const result = await saveContent(BUILTIN_CONTENT, undefined);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/Ktoś inny zapisał/);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('zapis na aktualnej wersji przechodzi', async () => {
    docData = { updatedAt: 'v1' };
    const result = await saveContent(BUILTIN_CONTENT, 'v1');
    expect(result.ok).toBe(true);
    expect(setDocMock).toHaveBeenCalledOnce();
  });

  it('zapis na nieaktualnej wersji to konflikt', async () => {
    docData = { updatedAt: 'v2' }; // ktoś zapisał w międzyczasie
    const result = await saveContent(BUILTIN_CONTENT, 'v1');
    expect(result.ok).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('odczyt i zapis biegną w jednej transakcji (atomowo)', async () => {
    // Sprawdzenie wersji rozdzielone od zapisu (osobne getDoc + setDoc)
    // zostawiało okno, w którym dwa zapisy naraz kasowały sobie pracę.
    // Ten test pilnuje, że zapis idzie przez transakcję — cofnięcie do
    // nieatomowej wersji je wywala.
    docData = { updatedAt: 'v1' };
    const result = await saveContent(BUILTIN_CONTENT, 'v1');
    expect(result.ok).toBe(true);
    expect(runTransactionMock).toHaveBeenCalledOnce();
    expect(setDocMock).toHaveBeenCalledOnce();
  });

  it('konflikt wykryty na autorytatywnym odczycie transakcji nie nadpisuje', async () => {
    // Redaktor B pracuje na 'v1'. Zanim jego transakcja zdąży zapisać, A
    // zapisuje 'v2'; Firestore ponawia updater, który na świeżym odczycie
    // ('v2') widzi konflikt i nie woła set — praca A zostaje.
    docData = { updatedAt: 'v1' };
    runTransactionMock.mockImplementationOnce(async (_db, updater) => {
      docData = { updatedAt: 'v2' }; // A zapisał tuż przed commitem B
      return updater({
        get: async () => ({ exists: () => true, data: () => docData }),
        set: (ref: unknown, data: unknown) => setDocMock(ref, data),
      });
    });
    const result = await saveContent(BUILTIN_CONTENT, 'v1');
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/Ktoś inny zapisał/);
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
