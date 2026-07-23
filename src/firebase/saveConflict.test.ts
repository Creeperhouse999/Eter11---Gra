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
const setDocMock = vi.fn(async (_ref: unknown, _data: unknown) => {});

vi.mock('./client', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  getDoc: async () => ({
    exists: () => docData !== undefined,
    data: () => docData,
  }),
  setDoc: (ref: unknown, data: unknown) => setDocMock(ref, data),
}));

const { saveContent } = await import('./content');

beforeEach(() => {
  docData = undefined;
  setDocMock.mockClear();
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
});
