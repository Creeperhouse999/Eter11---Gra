import { describe, it, expect, vi } from 'vitest';

/**
 * Kto może ruszyć wypowiedź w dyskusji.
 *
 * Właściciela poznajemy po koncie (`authorUid`), NIE po widocznym podpisie.
 * Imię bywa takie samo u dwóch osób i da się je zmienić w zakładce Admin, więc
 * jako dowód własności się nie nadaje — inaczej wystarczyłoby ustawić sobie
 * cudze imię, żeby przejąć jego wpisy.
 *
 * Wypowiedzi sprzed wprowadzenia `authorUid` nie mają czym się wylegitymować.
 * Ruszyć je może wyłącznie admin — cicha zgoda dla „autora po imieniu"
 * otwierałaby dokładnie tę furtkę.
 */

vi.mock('./client', () => ({ db: {}, auth: {} }));
vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  doc: () => ({}),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: () => () => {},
  orderBy: () => ({}),
  query: () => ({}),
  runTransaction: vi.fn(),
  updateDoc: vi.fn(),
}));

const { canEditMessage } = await import('./discussions');

const wypowiedz = (patch: Record<string, unknown> = {}) =>
  ({ author: 'Marcin', authorUid: 'u-marcin', text: 'treść', at: '2026-08-12T10:00:00.000Z', ...patch }) as never;

describe('canEditMessage — własność wypowiedzi', () => {
  it('autor rusza swoją wypowiedź', () => {
    expect(canEditMessage(wypowiedz(), 'u-marcin', false)).toBe(true);
  });

  it('ktoś inny nie rusza cudzej', () => {
    expect(canEditMessage(wypowiedz(), 'u-joanna', false)).toBe(false);
  });

  it('admin rusza każdą — po to jest adminem', () => {
    expect(canEditMessage(wypowiedz(), 'u-alan', true)).toBe(true);
  });

  it('sam podpis NIE wystarcza — liczy się konto', () => {
    // Sedno: gdyby sprawdzać po widocznym imieniu, wystarczyłoby ustawić sobie
    // w zakładce Zespół cudze imię, żeby przejąć jego wypowiedzi. Dlatego
    // porównujemy z uid, a nie z podpisem — ten test pada, gdy ktoś wróci do
    // porównywania po imieniu.
    const cudza = wypowiedz({ author: 'Joanna', authorUid: 'u-joanna' });

    expect(canEditMessage(cudza, 'Joanna', false)).toBe(false);
  });

  it('stara wypowiedź bez konta autora: tylko admin', () => {
    const stara = wypowiedz({ authorUid: undefined });

    expect(canEditMessage(stara, 'u-marcin', false)).toBe(false);
    expect(canEditMessage(stara, 'u-alan', true)).toBe(true);
  });

  it('pusty uid patrzącego nie otwiera starych wypowiedzi', () => {
    // Bez tego `undefined === undefined` przepuszczałoby każdego niezalogowanego.
    expect(canEditMessage(wypowiedz({ authorUid: undefined }), '', false)).toBe(false);
  });
});
