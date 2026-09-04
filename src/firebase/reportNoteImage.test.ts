import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Zrzut ekranu przy odsyłaniu zgłoszenia do poprawki.
 *
 * Adam zgłosił: „gdy klikam »dalej nie działa«, gdy weryfikuję zgłoszenie, to
 * nie mogę dodać załącznika". Zrzut jest tu najważniejszy — pokazuje, co
 * dokładnie nadal nie gra, i oszczędza rundę pytań „a jak to wygląda u Ciebie".
 *
 * Zdjęcie idzie z notatką, nie do zgłoszenia: notatka mówi o KONKRETNEJ próbie
 * naprawy, a zdjęcia zgłoszenia opisują stan pierwotny. Wrzucone razem
 * mieszałyby dwie różne rzeczy w jednej galerii.
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

const { setReportStatus, toReport } = await import('./reports');

beforeEach(() => updateDoc.mockClear());

describe('zrzut przy notatce do zgłoszenia', () => {
  it('zapisuje adres zdjęcia razem z notatką', async () => {
    await setReportStatus('r1', 'reopened', {
      from: 'reporter',
      text: 'Nadal nie działa',
      author: 'Adam',
      images: ['https://storage/zrzut.png'],
    });

    const zapis = updateDoc.mock.calls[0][1];
    const notatki = zapis.notes as { arrayUnion?: unknown } | unknown[];
    expect(JSON.stringify(notatki)).toContain('zrzut.png');
  });

  it('notatka bez zdjęcia zapisuje się jak dotąd', async () => {
    // Większość notatek to sam tekst — puste pole nie może dokładać śmieci.
    await setReportStatus('r1', 'fixed', { from: 'dev', text: 'Poprawione' });

    const zapis = updateDoc.mock.calls[0][1];
    expect(JSON.stringify(zapis.notes)).not.toContain('images');
  });

  it('odczyt starych notatek bez zdjęć nie wywraca się', () => {
    const raport = toReport('r1', {
      kind: 'bug',
      title: 'Stare',
      description: '',
      status: 'new',
      createdAt: '2026-01-01T00:00:00.000Z',
      notes: [{ from: 'dev', text: 'Bez zdjęcia', at: '2026-01-01T00:00:00.000Z' }],
    });

    expect(raport.notes?.[0].images).toBeUndefined();
  });
});
