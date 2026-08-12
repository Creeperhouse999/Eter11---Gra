import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Pamięć zespołu — wpis, który nie ma prawa dolecieć do bazy.
 *
 * Reguły Firestore są tu twarde: pusty tekst, tekst dłuższy niż limit albo
 * zapis bez zalogowania kończą się odrzuceniem po stronie serwera. Gdyby panel
 * puszczał takie wpisy dalej, użytkownik zobaczyłby tylko cichą porażkę —
 * kliknął „Zapisz", nic się nie stało i nic nie wyjaśniło dlaczego. Dlatego
 * te przypadki mają być wyłapane JESZCZE PRZED wysyłką, z komunikatem po
 * ludzku, i te testy pilnują, że atrapa zapisu naprawdę nie została ruszona.
 *
 * Druga rzecz, której pilnujemy: odrzucony zapis (brak sieci, brak uprawnień)
 * nie może wyrzucić wyjątku na zewnątrz. Panel go nie łapie — wywróciłby całą
 * zakładkę zamiast pokazać jedno zdanie o błędzie.
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
  id: 'nowy-wpis',
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

const { addNote, editNote, removeNote, watchNotes, MAX_LENGTH } = await import('./memory');

/** Dane wpisu, które przechodzą walidację — testy podmieniają tylko to, co badają. */
const poprawnyWpis = {
  text: 'Gramy dla dzieci 8–13 lat.',
  author: 'Alan',
  authorUid: 'u-alan',
};

beforeEach(() => {
  addDocMock.mockClear();
  addDocMock.mockImplementation(async () => ({ id: 'nowy-wpis' }));
  updateDocMock.mockClear();
  updateDocMock.mockImplementation(async () => {});
  deleteDocMock.mockClear();
  deleteDocMock.mockImplementation(async () => {});
  onSnapshotMock.mockClear();
  // Moduł loguje surowy błąd do konsoli — w teście to tylko szum.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('addNote — nowy wpis w pamięci', () => {
  it('pusty wpis nie trafia do bazy', async () => {
    const wynik = await addNote({ ...poprawnyWpis, text: '' });

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toBeTruthy();
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('wpis z samych spacji i enterów też nie trafia do bazy', async () => {
    // Klasyk: ktoś nacisnął spację, pole „nie jest puste", a baza i tak odrzuca.
    const wynik = await addNote({ ...poprawnyWpis, text: '   \n\t  ' });

    expect(wynik.ok).toBe(false);
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('za długie zdanie zostaje odrzucone, a komunikat mówi ile znaków się mieści', async () => {
    const zaDlugie = 'x'.repeat(MAX_LENGTH + 1);

    const wynik = await addNote({ ...poprawnyWpis, text: zaDlugie });

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toContain(String(MAX_LENGTH));
    expect(wynik.error).toContain(String(MAX_LENGTH + 1));
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('zdanie dokładnie na granicy limitu jeszcze przechodzi', async () => {
    // Granica bywa mylona o jeden znak — wtedy panel odrzuca wpis, który baza przyjmuje.
    const wynik = await addNote({ ...poprawnyWpis, text: 'x'.repeat(MAX_LENGTH) });

    expect(wynik.ok).toBe(true);
    expect(addDocMock).toHaveBeenCalledTimes(1);
  });

  it('bez zalogowania odmawia zapisu i tłumaczy dlaczego', async () => {
    const wynik = await addNote({ ...poprawnyWpis, authorUid: '' });

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toBe('Nie jesteś zalogowany.');
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('bez imienia autora nie zapisuje — spod wpisu nie dałoby się poznać, kto go dodał', async () => {
    const wynik = await addNote({ ...poprawnyWpis, author: '   ' });

    expect(wynik.ok).toBe(false);
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('poprawny wpis zapisuje treść, autora i jego konto', async () => {
    const wynik = await addNote({
      text: '  Adam odpowiada za merytorykę kart.  ',
      author: '  Adam  ',
      authorUid: 'u-adam',
    });

    expect(wynik.ok).toBe(true);
    expect(addDocMock).toHaveBeenCalledTimes(1);
    const zapisane = addDocMock.mock.calls[0][1];
    // Spacje wokół obcinamy — inaczej lista pamięci ma dziury w wyrównaniu.
    expect(zapisane.text).toBe('Adam odpowiada za merytorykę kart.');
    expect(zapisane.author).toBe('Adam');
    // Bez uid reguły nie poznają właściciela wpisu i nie pozwolą go poprawić.
    expect(zapisane.authorUid).toBe('u-adam');
    expect(typeof zapisane.createdAt).toBe('string');
    expect(Number.isNaN(Date.parse(zapisane.createdAt as string))).toBe(false);
  });

  it('odrzucony zapis kończy się komunikatem, a nie wywróceniem zakładki', async () => {
    addDocMock.mockImplementation(async () => {
      throw new Error('permission-denied');
    });

    const wynik = await addNote(poprawnyWpis);

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toBe('Nie udało się zapisać. Spróbuj jeszcze raz.');
  });
});

describe('editNote — poprawka własnego wpisu', () => {
  it('wyczyszczenie treści nie kasuje wpisu po cichu — odmawia zapisu', async () => {
    const wynik = await editNote('w1', '   ');

    expect(wynik.ok).toBe(false);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('poprawka dłuższa niż limit nie leci do bazy', async () => {
    const wynik = await editNote('w1', 'x'.repeat(MAX_LENGTH + 5));

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toContain(String(MAX_LENGTH));
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('poprawka zapisuje nową treść i znacznik zmiany — stąd „(poprawione)" pod wpisem', async () => {
    const wynik = await editNote('w1', '  Marcin nie lubi żółtego na kartach.  ');

    expect(wynik.ok).toBe(true);
    const [ref, dane] = updateDocMock.mock.calls[0];
    expect(ref.id).toBe('w1');
    expect(dane.text).toBe('Marcin nie lubi żółtego na kartach.');
    expect(typeof dane.editedAt).toBe('string');
    // Data zapisu zostaje nietknięta, inaczej wpis skoczyłby na górę listy.
    expect(dane).not.toHaveProperty('createdAt');
  });

  it('odrzucona poprawka wraca jako komunikat, nie jako wyjątek', async () => {
    updateDocMock.mockImplementation(async () => {
      throw new Error('permission-denied');
    });

    const wynik = await editNote('w1', 'Nowa treść.');

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toBe('Nie udało się zapisać poprawki.');
  });
});

describe('removeNote — kasowanie wpisu', () => {
  it('kasuje wskazany wpis', async () => {
    const wynik = await removeNote('w7');

    expect(wynik.ok).toBe(true);
    const [ref] = deleteDocMock.mock.calls[0];
    expect(ref.id).toBe('w7');
  });

  it('odmowa kasowania (cudzy wpis) wraca jako komunikat, nie jako wyjątek', async () => {
    deleteDocMock.mockImplementation(async () => {
      throw new Error('permission-denied');
    });

    const wynik = await removeNote('w7');

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toBe('Nie udało się usunąć wpisu.');
  });
});

/** Buduje atrapę dokumentu Firestore tak, jak widzi go `onSnapshot`. */
const dokument = (id: string, data: Record<string, unknown>) => ({
  id,
  data: () => data,
});

describe('watchNotes — podgląd listy na żywo', () => {
  it('pokazuje wpisy z bazy z uzupełnionymi brakami', async () => {
    let odebrane: unknown[] = [];
    watchNotes((notes) => {
      odebrane = notes;
    });
    const [, next] = onSnapshotMock.mock.calls[0];

    next({
      docs: [
        dokument('a', {
          text: 'Pierwsze zdanie.',
          author: 'Alan',
          createdAt: '2026-08-01T10:00:00.000Z',
          authorUid: 'u-alan',
          editedAt: '2026-08-02T10:00:00.000Z',
        }),
        // Stary wpis sprzed pola `authorUid` — nie może wywalić listy.
        dokument('b', { text: 'Stare zdanie.', author: 'Adam', createdAt: '2026-07-01T10:00:00.000Z' }),
      ],
    });

    expect(odebrane).toEqual([
      {
        id: 'a',
        text: 'Pierwsze zdanie.',
        author: 'Alan',
        createdAt: '2026-08-01T10:00:00.000Z',
        authorUid: 'u-alan',
        editedAt: '2026-08-02T10:00:00.000Z',
      },
      { id: 'b', text: 'Stare zdanie.', author: 'Adam', createdAt: '2026-07-01T10:00:00.000Z' },
    ]);
  });

  it('uszkodzony wpis bez treści nie wywraca listy — pokazuje puste pola', async () => {
    let odebrane: unknown[] = [];
    watchNotes((notes) => {
      odebrane = notes;
    });
    const [, next] = onSnapshotMock.mock.calls[0];

    next({ docs: [dokument('c', {})] });

    expect(odebrane).toEqual([{ id: 'c', text: '', author: '', createdAt: '' }]);
  });

  it('brak uprawnień albo brak sieci daje pustą listę zamiast wywrócenia panelu', async () => {
    let odebrane: unknown[] | null = null;
    watchNotes((notes) => {
      odebrane = notes;
    });
    const [, , onError] = onSnapshotMock.mock.calls[0];

    onError(new Error('permission-denied'));

    expect(odebrane).toEqual([]);
  });
});
