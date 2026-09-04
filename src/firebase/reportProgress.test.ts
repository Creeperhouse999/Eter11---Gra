import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Postęp prac nad zgłoszeniem.
 *
 * Alan poprosił, żeby na zgłoszeniu było widać, że programista je zauważył —
 * „in progress / finished / starting / queued", zanim jeszcze cokolwiek jest
 * naprawione. Adam siada do pracy i chce wiedzieć, czy jego zgłoszenie leży
 * nietknięte, czy ktoś już przy nim siedzi.
 *
 * Sedno: to OSOBNE pole od `status`. Status to obieg zgłoszenia i należy do
 * zgłaszającego (`done` stawia tylko on). Postęp należy do wykonawcy. Gdyby
 * dzielić jedno pole, ustawienie „pracuję" kasowałoby informację, że ktoś
 * wcześniej zgłoszenie zaakceptował — i odwrotnie.
 */

const updateDoc = vi.fn<(ref: unknown, data: Record<string, unknown>) => Promise<void>>(
  async () => undefined,
);

vi.mock('./client', () => ({ db: {}, auth: {} }));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  arrayUnion: (x: unknown) => x,
  collection: () => ({}),
  deleteDoc: vi.fn(),
  doc: (_db: unknown, _c: string, id: string) => ({ id }),
  getDocs: vi.fn(),
  onSnapshot: () => () => {},
  orderBy: () => ({}),
  query: () => ({}),
  updateDoc: (ref: unknown, data: Record<string, unknown>) => updateDoc(ref, data),
}));

const { setReportProgress, PROGRESS_LABELS, toReport } = await import('./reports');

beforeEach(() => updateDoc.mockClear());

describe('postęp prac nad zgłoszeniem', () => {
  it('zapisuje sam postęp, nie rusza statusu', async () => {
    await setReportProgress('r1', 'working');

    const zapis = updateDoc.mock.calls[0][1];
    // Sedno: status zostaje, gdzie był. Programista mówi „pracuję", a nie
    // „zaakceptowane" ani „naprawione" — te decyzje należą do kogo innego.
    expect(zapis.progress).toBe('working');
    expect(zapis).not.toHaveProperty('status');
  });

  it('zapisuje też, kiedy postęp się zmienił — inaczej „pracuję" sprzed tygodnia wygląda jak świeże', async () => {
    await setReportProgress('r1', 'working');

    const zapis = updateDoc.mock.calls[0][1];
    expect(typeof zapis.progressAt).toBe('string');
    expect(Number.isNaN(Date.parse(zapis.progressAt as string))).toBe(false);
  });

  it('„nie zaczęte" czyści pole zamiast zapisywać pustą wartość', async () => {
    // Cofnięcie ma zostawić zgłoszenie takie, jakby nikt go nie tknął —
    // inaczej lista pokazywałaby pustą plakietkę przy każdym zgłoszeniu.
    await setReportProgress('r1', null);

    const zapis = updateDoc.mock.calls[0][1];
    expect(zapis.progress).toBeNull();
  });

  it('każdy postęp ma etykietę po polsku — plakietka bez napisu nic nie mówi', () => {
    for (const klucz of ['queued', 'working', 'testing', 'finished'] as const) {
      expect(PROGRESS_LABELS[klucz].length).toBeGreaterThan(0);
    }
  });

  it('zgłoszenie sprzed tej zmiany nie ma postępu i to nie jest błąd', () => {
    const stare = toReport('r0', {
      kind: 'bug',
      title: 'Stare',
      description: '',
      status: 'new',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(stare.progress).toBeUndefined();
  });

  it('nieznany postęp z bazy jest pomijany, a nie pokazywany jako surowy tekst', () => {
    // Ktoś mógłby wpisać cokolwiek przez REST; panel ma to zignorować,
    // zamiast rysować plakietkę z przypadkowym napisem.
    const dziwne = toReport('r0', {
      kind: 'bug',
      title: 'Dziwne',
      description: '',
      status: 'new',
      createdAt: '2026-01-01T00:00:00.000Z',
      progress: 'DROP TABLE',
    });

    expect(dziwne.progress).toBeUndefined();
  });
});
