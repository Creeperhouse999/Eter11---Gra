import { describe, it, expect } from 'vitest';
import { pokazacPostep, etykietaStanu, type Report } from './reports';

/**
 * Adam: „w zakładce np. »do sprawdzenia« są na ramkach dwa statusy. Np.
 * Zrobione oraz Ponownie zrobione sprawdź. Popraw, aby był zawsze jeden
 * aktualny status".
 *
 * Miał rację: przy zgłoszeniu naprawionym pokazywaliśmy naraz etykietę
 * ze STATUSU („Do sprawdzenia" / „Ponownie zrobione — sprawdź") i plakietkę
 * POSTĘPU („Zrobione"). Oba mówią dokładnie to samo — że skończyłem robotę
 * i czekam na sprawdzenie — tylko innymi słowami, więc wiersz wyglądał, jakby
 * zgłoszenie było w dwóch stanach naraz.
 *
 * Zasada: gdy status niesie już pełną informację, postęp milczy.
 */

function zgloszenie(over: Partial<Report>): Report {
  return {
    id: 'r',
    title: 't',
    description: '',
    author: 'Adam',
    kind: 'bug',
    status: 'new',
    createdAt: '2026-09-01T10:00:00.000Z',
    notes: [],
    ...over,
  } as Report;
}

/** Ile napisów o stanie zobaczy człowiek w jednym wierszu. */
function ileNapisow(report: Report): number {
  return (etykietaStanu(report) ? 1 : 0) + (pokazacPostep(report) && report.progress ? 1 : 0);
}

describe('jeden aktualny status na wierszu', () => {
  it('naprawione i skończone daje JEDEN napis, nie dwa', () => {
    const report = zgloszenie({ status: 'fixed', progress: 'finished' });
    expect(ileNapisow(report)).toBe(1);
    expect(etykietaStanu(report)).toBe('Do sprawdzenia');
  });

  it('to samo po powrocie zgłoszenia — nadal jeden napis', () => {
    const report = zgloszenie({
      status: 'fixed',
      progress: 'finished',
      notes: [{ from: 'reporter', text: 'nie działa', at: '2026-09-02T10:00:00.000Z' }],
    });
    expect(ileNapisow(report)).toBe(1);
    expect(etykietaStanu(report)).toBe('Ponownie zrobione — sprawdź');
  });

  /**
   * Wcześniejsze etapy zostają: „robi się" przy naprawionym zgłoszeniu nie
   * powtarza statusu, tylko dokłada informację, że wróciłem do tematu.
   */
  it('etap w toku wolno pokazać obok statusu', () => {
    const report = zgloszenie({ status: 'fixed', progress: 'working' });
    expect(pokazacPostep(report)).toBe(true);
  });

  it('odesłane do poprawki nie chwali się „Zrobione"', () => {
    expect(pokazacPostep(zgloszenie({ status: 'reopened', progress: 'finished' }))).toBe(false);
  });

  it('nowe zgłoszenie ma sam postęp, bez etykiety statusu', () => {
    const report = zgloszenie({ status: 'new', progress: 'queued' });
    expect(etykietaStanu(report)).toBeNull();
    expect(ileNapisow(report)).toBe(1);
  });

  it('zamknięte nie pokazuje żadnego postępu', () => {
    expect(pokazacPostep(zgloszenie({ status: 'done', progress: 'finished' }))).toBe(false);
    expect(pokazacPostep(zgloszenie({ status: 'dismissed', progress: 'finished' }))).toBe(false);
  });
});
