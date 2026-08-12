import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Announcement } from './announcements';

/**
 * Ogłoszenia dla zespołu — jedna wiadomość od admina do wszystkich.
 *
 * Dwie rzeczy potrafią tu zawieść po cichu i obie kosztują zaufanie do panelu:
 *
 * 1. Ogłoszenie bez tytułu albo z tytułem dłuższym niż limit zostaje odrzucone
 *    przez reguły bazy. Jeśli panel puści je dalej, admin klika „Wyślij", nic
 *    się nie dzieje i nikt nie dostaje ogłoszenia — a on jest przekonany, że
 *    wysłał. Dlatego takie wejście ma zostać zatrzymane PRZED wysyłką, z
 *    komunikatem, a atrapa zapisu ma zostać nietknięta.
 *
 * 2. Kolejność listy. Przypięte ogłoszenie ma trzymać się góry — po to admin je
 *    przypina. Sortujemy po stronie panelu (Firestore chciałby na to złożonego
 *    indeksu), więc nic w bazie tego nie pilnuje: jedyną ochroną jest ten test.
 *    Do tego przypięte nie mogą gubić kolejności między sobą — najnowsze wciąż
 *    ma być wyżej.
 */

/** Atrapa referencji dokumentu — trzyma id, żeby dało się sprawdzić, co ruszamy. */
type DocRef = { id: string };
/** Kształt danych, które moduł wysyła do bazy. */
type Zapis = Record<string, unknown>;
/** Migawka listy tak, jak widzi ją `onSnapshot`. */
type Migawka = { docs: Array<{ id: string; data: () => Record<string, unknown> }> };

// Typ podany przez `vi.fn<...>`, nie wywnioskowany z implementacji: inaczej
// `mock.calls` gubi arność i odczyt argumentów nie przechodzi kontroli typów.
const addDocMock = vi.fn<(ref: unknown, data: Zapis) => Promise<DocRef>>(async () => ({
  id: 'ogl-1',
}));
const updateDocMock = vi.fn<(ref: DocRef, data: Zapis) => Promise<void>>(async () => {});
const deleteDocMock = vi.fn<(ref: DocRef) => Promise<void>>(async () => {});
const onSnapshotMock = vi.fn<
  (q: unknown, next: (snapshot: Migawka) => void, error: (e: unknown) => void) => () => void
>(() => () => {});

vi.mock('./client', () => ({ db: {}, auth: {} }));
vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  doc: (_db: unknown, _col: string, id: string) => ({ id }),
  addDoc: (ref: unknown, data: Zapis) => addDocMock(ref, data),
  updateDoc: (ref: DocRef, data: Zapis) => updateDocMock(ref, data),
  deleteDoc: (ref: DocRef) => deleteDocMock(ref),
  onSnapshot: (
    q: unknown,
    next: (snapshot: Migawka) => void,
    error: (error: unknown) => void,
  ) => onSnapshotMock(q, next, error),
  orderBy: () => ({}),
  query: () => ({}),
}));

const {
  addAnnouncement,
  setPinned,
  removeAnnouncement,
  watchAnnouncements,
  MAX_TITLE,
  MAX_BODY,
} = await import('./announcements');

beforeEach(() => {
  addDocMock.mockClear();
  addDocMock.mockImplementation(async () => ({ id: 'ogl-1' }));
  updateDocMock.mockClear();
  updateDocMock.mockImplementation(async () => {});
  deleteDocMock.mockClear();
  deleteDocMock.mockImplementation(async () => {});
  onSnapshotMock.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('addAnnouncement — wysyłka ogłoszenia', () => {
  it('ogłoszenie bez tytułu nie trafia do bazy', async () => {
    const wynik = await addAnnouncement({ title: '', body: 'treść', author: 'Alan' });

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toBe('Wpisz tytuł ogłoszenia.');
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('tytuł z samych spacji liczy się jak brak tytułu', async () => {
    const wynik = await addAnnouncement({ title: '   ', body: 'treść', author: 'Alan' });

    expect(wynik.ok).toBe(false);
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('za długi tytuł zostaje odrzucony, a komunikat podaje limit', async () => {
    const wynik = await addAnnouncement({
      title: 'x'.repeat(MAX_TITLE + 1),
      body: 'treść',
      author: 'Alan',
    });

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toContain(String(MAX_TITLE));
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('za długa treść zostaje odrzucona i też nic nie zapisuje', async () => {
    const wynik = await addAnnouncement({
      title: 'Testy w piątek',
      body: 'x'.repeat(MAX_BODY + 1),
      author: 'Alan',
    });

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toContain(String(MAX_BODY));
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('ogłoszenie z samym tytułem jest dozwolone — treść bywa niepotrzebna', async () => {
    const wynik = await addAnnouncement({
      title: 'Nie ruszamy kart do poniedziałku',
      body: '   ',
      author: 'Alan',
    });

    expect(wynik.ok).toBe(true);
    const zapisane = addDocMock.mock.calls[0][1];
    expect(zapisane.body).toBe('');
  });

  it('poprawne ogłoszenie zapisuje tytuł, treść, autora i startuje nieprzypięte', async () => {
    const wynik = await addAnnouncement({
      title: '  W piątek testujemy z dziećmi  ',
      body: '  Przynieście talie.  ',
      author: '  Alan  ',
    });

    expect(wynik.ok).toBe(true);
    expect(wynik.id).toBe('ogl-1');
    const zapisane = addDocMock.mock.calls[0][1];
    expect(zapisane.title).toBe('W piątek testujemy z dziećmi');
    expect(zapisane.body).toBe('Przynieście talie.');
    expect(zapisane.author).toBe('Alan');
    // Nowe ogłoszenie nie jest przypięte — to osobna decyzja admina.
    expect(zapisane.pinned).toBe(false);
    expect(Number.isNaN(Date.parse(zapisane.createdAt as string))).toBe(false);
  });

  it('odrzucony zapis wraca jako komunikat, nie jako wyjątek na zewnątrz', async () => {
    addDocMock.mockImplementation(async () => {
      throw new Error('permission-denied');
    });

    const wynik = await addAnnouncement({ title: 'Tytuł', body: '', author: 'Alan' });

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toBe('Nie udało się wysłać ogłoszenia.');
    expect(wynik.id).toBeUndefined();
  });
});

describe('setPinned — przypinanie i odpinanie', () => {
  it('przypina wskazane ogłoszenie', async () => {
    const wynik = await setPinned('ogl-5', true);

    expect(wynik.ok).toBe(true);
    const [ref, dane] = updateDocMock.mock.calls[0];
    expect(ref.id).toBe('ogl-5');
    expect(dane).toEqual({ pinned: true });
  });

  it('odpina, gdy admin klika gwiazdkę drugi raz', async () => {
    await setPinned('ogl-5', false);

    const [, dane] = updateDocMock.mock.calls[0];
    expect(dane).toEqual({ pinned: false });
  });

  it('odmowa zapisu nie kończy się ciszą — wraca komunikat dla panelu', async () => {
    // Regresja: gwiazdka nie zmieniała stanu i nic nie tłumaczyło dlaczego,
    // więc wyglądało to na zawieszony przycisk.
    updateDocMock.mockImplementation(async () => {
      throw new Error('permission-denied');
    });

    const wynik = await setPinned('ogl-5', true);

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toBe('Nie udało się zmienić wyróżnienia.');
  });
});

describe('removeAnnouncement — kasowanie ogłoszenia', () => {
  it('kasuje wskazane ogłoszenie', async () => {
    const wynik = await removeAnnouncement('ogl-9');

    expect(wynik.ok).toBe(true);
    const [ref] = deleteDocMock.mock.calls[0];
    expect(ref.id).toBe('ogl-9');
  });

  it('odmowa kasowania wraca jako komunikat, nie jako wyjątek', async () => {
    deleteDocMock.mockImplementation(async () => {
      throw new Error('permission-denied');
    });

    const wynik = await removeAnnouncement('ogl-9');

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toBe('Nie udało się usunąć ogłoszenia.');
  });
});

/**
 * Atrapa dokumentu tak, jak widzi go `onSnapshot`. Zapytanie sortuje po
 * `createdAt` malejąco, więc docs przychodzą już od najnowszych — testy
 * kolejności podają je w tej właśnie kolejności.
 */
const dokument = (id: string, data: Record<string, unknown>) => ({
  id,
  data: () => data,
});

/** Uruchamia podgląd i zwraca funkcje sterujące atrapą `onSnapshot`. */
function uruchomPodglad() {
  let odebrane: Announcement[] = [];
  watchAnnouncements((items) => {
    odebrane = items;
  });
  const [, next, onError] = onSnapshotMock.mock.calls[0];
  return {
    wpuscDokumenty: (docs: Migawka['docs']) => next({ docs }),
    zglosBlad: (error: unknown) => onError(error),
    lista: () => odebrane,
  };
}

describe('watchAnnouncements — kolejność listy', () => {
  it('przypięte ogłoszenie trzyma się góry, choć jest najstarsze', async () => {
    const podglad = uruchomPodglad();

    podglad.wpuscDokumenty([
      dokument('nowe', { title: 'Nowe', createdAt: '2026-08-10T10:00:00.000Z' }),
      dokument('srednie', { title: 'Średnie', createdAt: '2026-08-05T10:00:00.000Z' }),
      dokument('stare-przypiete', {
        title: 'Stare, ale ważne',
        createdAt: '2026-07-01T10:00:00.000Z',
        pinned: true,
      }),
    ]);

    expect(podglad.lista().map((a) => a.id)).toEqual(['stare-przypiete', 'nowe', 'srednie']);
  });

  it('kilka przypiętych zachowuje między sobą kolejność od najnowszego', async () => {
    // Sortowanie musi być stabilne — inaczej przypięte skaczą przy każdym odświeżeniu.
    const podglad = uruchomPodglad();

    podglad.wpuscDokumenty([
      dokument('p-nowe', { createdAt: '2026-08-10T10:00:00.000Z', pinned: true }),
      dokument('zwykle', { createdAt: '2026-08-08T10:00:00.000Z' }),
      dokument('p-stare', { createdAt: '2026-08-01T10:00:00.000Z', pinned: true }),
    ]);

    expect(podglad.lista().map((a) => a.id)).toEqual(['p-nowe', 'p-stare', 'zwykle']);
  });

  it('gdy nic nie jest przypięte, lista zostaje od najnowszych', async () => {
    const podglad = uruchomPodglad();

    podglad.wpuscDokumenty([
      dokument('a', { createdAt: '2026-08-10T10:00:00.000Z' }),
      dokument('b', { createdAt: '2026-08-05T10:00:00.000Z' }),
      dokument('c', { createdAt: '2026-08-01T10:00:00.000Z' }),
    ]);

    expect(podglad.lista().map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });

  it('stare ogłoszenie bez pola przypięcia jest traktowane jak nieprzypięte', async () => {
    // `pinned` doszło później — brak pola nie może udawać przypięcia.
    const podglad = uruchomPodglad();

    podglad.wpuscDokumenty([
      dokument('bez-pola', { createdAt: '2026-08-10T10:00:00.000Z' }),
      dokument('przypiete', { createdAt: '2026-07-01T10:00:00.000Z', pinned: true }),
    ]);

    const lista = podglad.lista();
    expect(lista.map((a) => a.id)).toEqual(['przypiete', 'bez-pola']);
    expect(lista[1].pinned).toBe(false);
  });

  it('uszkodzone ogłoszenie bez tytułu i autora nie wywraca listy', async () => {
    const podglad = uruchomPodglad();

    podglad.wpuscDokumenty([dokument('pusty', {})]);

    expect(podglad.lista()).toEqual([
      { id: 'pusty', title: '', body: '', author: '', createdAt: '', pinned: false },
    ]);
  });

  it('brak uprawnień albo brak sieci daje pustą listę zamiast wywrócenia panelu', async () => {
    const podglad = uruchomPodglad();

    podglad.zglosBlad(new Error('permission-denied'));

    expect(podglad.lista()).toEqual([]);
  });
});
