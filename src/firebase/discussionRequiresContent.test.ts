import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Wątek dyskusji musi mieć temat I treść.
 *
 * Alan zgłosił: „tworzenie dyskusji bez wiadomości startującej robi pustą
 * wiadomość, a powinno nie, plus nie pozwalać tworzenia bez tytułu".
 *
 * Pusty wątek jest gorszy niż brak wątku: na liście widać temat, ktoś go
 * otwiera, a w środku nie ma nic — nie wiadomo, co autor miał na myśli ani
 * czy to pomyłka. Odmowa przy zakładaniu kosztuje jedno kliknięcie, pusty
 * wątek kosztuje cudzy czas i zostaje na liście na zawsze.
 */

const addDoc = vi.fn(async () => ({ id: 'nowy' }));

vi.mock('./client', () => ({ db: {}, auth: {} }));
vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDoc(...(args as [])),
  collection: () => ({}),
  deleteDoc: vi.fn(),
  doc: () => ({}),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: () => () => {},
  orderBy: () => ({}),
  query: () => ({}),
  runTransaction: vi.fn(),
  updateDoc: vi.fn(),
}));

const { addDiscussion } = await import('./discussions');

beforeEach(() => addDoc.mockClear());

describe('zakładanie wątku wymaga treści', () => {
  it('odmawia bez tematu', async () => {
    const wynik = await addDiscussion({ title: '   ', description: 'Coś tam', author: 'Alan' });

    expect(wynik.ok).toBe(false);
    // Nic nie poleciało do bazy — inaczej odmowa byłaby tylko na ekranie.
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('odmawia bez treści — pusty wątek nikomu nic nie mówi', async () => {
    const wynik = await addDiscussion({ title: 'Kolory kart', description: '  ', author: 'Alan' });

    expect(wynik.ok).toBe(false);
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('komunikat mówi, czego brakuje, a nie tylko że się nie udało', async () => {
    const wynik = await addDiscussion({ title: 'Kolory kart', description: '', author: 'Alan' });

    // Bez wskazania pola piszący klika drugi raz to samo i znów dostaje odmowę.
    expect(wynik.error).toMatch(/napisz|treść|czym/i);
  });

  it('wątek z odrzuconego zgłoszenia przechodzi bez własnego opisu', async () => {
    // Taki wątek NIE jest pusty: niesie treść zgłoszenia i komentarz odrzucenia
    // jako pierwsze wypowiedzi. Wymaganie opisu blokowałoby przenoszenie
    // zgłoszeń do dyskusji, czyli działającą dziś ścieżkę.
    const wynik = await addDiscussion({
      title: 'Z odrzuconego zgłoszenia',
      description: '',
      author: 'Alan',
      messages: [
        { author: 'Adam', text: 'Treść zgłoszenia', at: '2026-09-04T10:00:00.000Z' },
      ],
    });

    expect(wynik.ok).toBe(true);
    expect(addDoc).toHaveBeenCalled();
  });

  it('poprawny wątek zapisuje się normalnie', async () => {
    const wynik = await addDiscussion({
      title: 'Kolory kart',
      description: 'Zastanawiam się, czy nie za dużo odcieni.',
      author: 'Alan',
    });

    expect(wynik.ok).toBe(true);
    expect(addDoc).toHaveBeenCalled();
  });
});
