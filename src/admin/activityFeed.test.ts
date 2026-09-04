import { describe, it, expect } from 'vitest';
import { buildActivity } from './activityFeed';
import type { Report } from '../firebase/reports';

/**
 * Zakładka „Aktywność" — co się teraz dzieje.
 *
 * Adam poprosił: „pokazuj, nad czym w tym momencie pracujesz, a co jest
 * w kolejce. Każde zadanie niech się klika i przenosi do danego wątku
 * w zgłoszeniu albo dyskusji. Chcę widzieć live aktualne Twoje działania".
 *
 * Dane już są — pole `progress` na zgłoszeniach ustawiam przy każdym kroku
 * pracy. Ta zakładka tylko układa je w jedną listę: najpierw to, co się dzieje
 * teraz, potem kolejka. Bez tego trzeba przeklikać sześć pod-zakładek, żeby
 * zobaczyć jedną rzecz.
 */

const zgloszenie = (patch: Partial<Report>): Report => ({
  id: 'r1',
  kind: 'bug',
  title: 'Coś nie działa',
  description: '',
  status: 'new',
  createdAt: '2026-09-04T10:00:00.000Z',
  ...patch,
});

describe('lista aktywności', () => {
  it('to, nad czym trwa praca, jest na samej górze', () => {
    const lista = buildActivity([
      zgloszenie({ id: 'a', title: 'W kolejce', progress: 'queued' }),
      zgloszenie({ id: 'b', title: 'Robi się', progress: 'working' }),
      zgloszenie({ id: 'c', title: 'Nietknięte' }),
    ]);

    expect(lista[0].id).toBe('b');
  });

  it('kolejność oddaje bieg pracy: robi się, sprawdzam, w kolejce, reszta', () => {
    const lista = buildActivity([
      zgloszenie({ id: 'd', title: 'Nietknięte' }),
      zgloszenie({ id: 'c', title: 'W kolejce', progress: 'queued' }),
      zgloszenie({ id: 'b', title: 'Sprawdzam', progress: 'testing' }),
      zgloszenie({ id: 'a', title: 'Robi się', progress: 'working' }),
    ]);

    expect(lista.map((w) => w.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('skończone i zamknięte znikają — to już nie jest aktywność', () => {
    const lista = buildActivity([
      zgloszenie({ id: 'a', status: 'done', progress: 'finished' }),
      zgloszenie({ id: 'b', status: 'dismissed' }),
      zgloszenie({ id: 'c', title: 'Otwarte' }),
    ]);

    expect(lista.map((w) => w.id)).toEqual(['c']);
  });

  it('każdy wpis niesie link do swojego zgłoszenia', () => {
    // Adam: „każde zadanie niech się klika i przenosi do danego wątku".
    const lista = buildActivity([zgloszenie({ id: 'xyz', status: 'reopened' })]);

    expect(lista[0].link).toBe('/admin/reports/reopened?open=xyz');
  });

  it('mówi, co się z tym dzieje, słowami — nie samym kolorem', () => {
    const lista = buildActivity([
      zgloszenie({ id: 'a', progress: 'working' }),
      zgloszenie({ id: 'b' }),
    ]);

    expect(lista[0].stan).toMatch(/robi się/i);
    // Nietknięte też ma podpis: pusty wygląda jak usterka listy.
    expect(lista[1].stan.length).toBeGreaterThan(0);
  });

  it('przy równym stanie pilniejsze idzie wyżej', () => {
    const lista = buildActivity([
      zgloszenie({ id: 'zwykle', priority: 'medium' }),
      zgloszenie({ id: 'pilne', priority: 'ultra' }),
    ]);

    expect(lista[0].id).toBe('pilne');
  });

  it('pusta lista nie wywraca widoku', () => {
    expect(buildActivity([])).toEqual([]);
  });
});
