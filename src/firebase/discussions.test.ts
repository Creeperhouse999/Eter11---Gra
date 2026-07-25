import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Discussion, DiscussionMessage } from './discussions';

/**
 * Dopisywanie wypowiedzi do wątku.
 *
 * Reguły Firestore dopuszczają tylko dopisanie na końcu SERWEROWEJ listy
 * (stara lista z bazy + jedna wypowiedź). Regresja: `addMessage` składał listę
 * z nieaktualnej kopii gracza, więc gdy ktoś dopisał w międzyczasie, zapis nie
 * pasował do reguły i wypowiedź przepadała z błędem. Teraz odczyt i dopisanie
 * biegną w JEDNEJ transakcji na świeżym stanie — mock oddaje ten kształt.
 */

// Sterowany stan „listy wypowiedzi w bazie".
let serverMessages: DiscussionMessage[] | undefined;
const updateMock = vi.fn((_ref: unknown, _data: { messages: DiscussionMessage[] }) => {});

const runTransactionMock = vi.fn(
  async (_db: unknown, updater: (tx: unknown) => Promise<unknown>) =>
    updater({
      get: async () => ({
        exists: () => serverMessages !== undefined,
        data: () => ({ messages: serverMessages }),
      }),
      update: (ref: unknown, data: unknown) =>
        updateMock(ref, data as { messages: DiscussionMessage[] }),
    }),
);

vi.mock('./client', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  collection: () => ({}),
  addDoc: async () => ({}),
  deleteDoc: async () => {},
  getDocs: async () => ({ docs: [] }),
  onSnapshot: () => () => {},
  orderBy: () => ({}),
  query: () => ({}),
  updateDoc: async () => {},
  runTransaction: (db: unknown, updater: (tx: unknown) => Promise<unknown>) =>
    runTransactionMock(db, updater),
}));

const { addMessage, MAX_MESSAGES } = await import('./discussions');

const msg = (author: string): DiscussionMessage => ({ author, text: `hi ${author}`, at: 'y' });
const disc = (messages: DiscussionMessage[]): Discussion => ({
  id: 'd1',
  title: 't',
  description: '',
  author: 'a',
  createdAt: 'x',
  messages,
});

beforeEach(() => {
  updateMock.mockClear();
  runTransactionMock.mockClear();
  serverMessages = undefined;
});

describe('addMessage — dopisywanie w transakcji', () => {
  it('dopisuje na SERWEROWEJ liście, nie na nieaktualnej kopii gracza', async () => {
    // Serwer ma już [A, B] (ktoś dopisał B), a klient wciąż trzyma tylko [A].
    serverMessages = [msg('A'), msg('B')];

    const res = await addMessage(disc([msg('A')]), { author: 'C', text: 'trzeci' });

    expect(res.ok).toBe(true);
    const written = updateMock.mock.calls[0][1].messages;
    // Bez fixu: [A, C] (gubi B, i tak odrzucone przez reguły). Z fixem: [A, B, C].
    expect(written.map((m) => m.author)).toEqual(['A', 'B', 'C']);
  });

  it('odrzuca, gdy serwerowa lista osiągnęła limit', async () => {
    serverMessages = Array.from({ length: MAX_MESSAGES }, (_, i) => msg(`m${i}`));

    const res = await addMessage(disc([]), { author: 'C', text: 'x' });

    expect(res.ok).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('odrzuca pustą wypowiedź bez obrazu — nawet nie otwiera transakcji', async () => {
    serverMessages = [];

    const res = await addMessage(disc([]), { author: 'C', text: '   ' });

    expect(res.ok).toBe(false);
    expect(runTransactionMock).not.toHaveBeenCalled();
  });

  it('sam obraz bez słowa jest dozwoloną wypowiedzią', async () => {
    serverMessages = [msg('A')];

    const res = await addMessage(disc([msg('A')]), {
      author: 'C',
      text: '',
      image: 'data:image/png;base64,xxx',
    });

    expect(res.ok).toBe(true);
    const written = updateMock.mock.calls[0][1].messages;
    expect(written).toHaveLength(2);
    expect(written[1].image).toBe('data:image/png;base64,xxx');
  });
});
