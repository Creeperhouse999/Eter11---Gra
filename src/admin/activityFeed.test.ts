import { describe, it, expect } from 'vitest';
import { buildActivity, buildAwaitingReview, buildDiscussionQueue } from './activityFeed';
import type { Report } from '../firebase/reports';
import type { Discussion } from '../firebase/discussions';

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

  it('niesie czas rozpoczęcia bieżącego etapu — Adam poprosił o niego wprost', () => {
    const lista = buildActivity([
      zgloszenie({ id: 'a', progress: 'working', progressAt: '2026-09-04T20:05:00.000Z' }),
    ]);

    expect(lista[0].progressAt).toBe('2026-09-04T20:05:00.000Z');
  });

  it('zgłoszenie bez zmiany etapu nie ma czasu rozpoczęcia — nic nie kłamie', () => {
    const lista = buildActivity([zgloszenie({ id: 'a' })]);

    expect(lista[0].progressAt).toBeUndefined();
  });
});

describe('zgłoszenie odesłane do poprawki (reopened) po tym, jak było „Zrobione”', () => {
  // Adam: „w liście kolejnych zadań powinny być wszystkie zadania — łącznie
  // z (…) tymi, które wróciły do poprawy". Regresja: `progress` zostaje na
  // zgłoszeniu z POPRZEDNIEGO okrążenia; gdy zgłaszający odsyła je z powrotem
  // (`reopened`), stare `finished` samo nie znika — a `finished` był
  // warunkiem WYRZUCENIA z całej listy aktywności. Zgłoszenie, nad którym
  // znowu trzeba pracować, znikało więc bez śladu.

  it('nie znika z listy — to znowu aktywna praca, nie historia', () => {
    const lista = buildActivity([
      zgloszenie({ id: 'a', status: 'reopened', progress: 'finished' }),
    ]);

    expect(lista.map((w) => w.id)).toEqual(['a']);
  });

  it('wraca do kolejki, nie chwali się starym „Zrobione”', () => {
    const lista = buildActivity([
      zgloszenie({ id: 'a', status: 'reopened', progress: 'finished' }),
    ]);

    expect(lista[0].progress).toBeUndefined();
    expect(lista[0].stan).toBe('Czeka w kolejce');
  });

  it('nie niesie czasu rozpoczęcia z zamkniętego, poprzedniego okrążenia', () => {
    const lista = buildActivity([
      zgloszenie({
        id: 'a',
        status: 'reopened',
        progress: 'finished',
        progressAt: '2026-09-01T10:00:00.000Z',
      }),
    ]);

    expect(lista[0].progressAt).toBeUndefined();
  });

  it('zgłoszenie SKOŃCZONE, ale nie odesłane do poprawki, dalej znika — to naprawdę historia', () => {
    const lista = buildActivity([
      zgloszenie({ id: 'a', status: 'fixed', progress: 'finished' }),
    ]);

    expect(lista).toEqual([]);
  });

  it('status „fixed" znika z listy, nawet gdy `progress` nie zdążył się jeszcze zresetować', () => {
    // `status` i `progress` bywają ustawiane OSOBNYMI wywołaniami (trailer
    // `Report-Fixed` w Actions rusza tylko `status`) — zgłoszenie potrafi więc
    // mieć `status: 'fixed'` przy `progress` wciąż na „working" czy w ogóle
    // bez wartości. Bez tego wisiałoby jednocześnie tutaj I w „Do sprawdzenia".
    const lista = buildActivity([
      zgloszenie({ id: 'a', status: 'fixed', progress: 'working' }),
      zgloszenie({ id: 'b', status: 'fixed' }),
    ]);

    expect(lista).toEqual([]);
  });
});

/**
 * „Do sprawdzenia" — Adam poprosił o tę kategorię wprost: zadania zrobione
 * przeze mnie, czekające na potwierdzenie zgłaszającego albo admina.
 * `buildActivity` te same zgłoszenia świadomie wyrzuca (to już nie AKTYWNA
 * praca z mojej strony) — ta funkcja pokazuje dokładnie odwrotną stronę tej
 * samej monety.
 */
describe('do sprawdzenia', () => {
  it('bierze zgłoszenia oznaczone jako naprawione, nic więcej', () => {
    const lista = buildAwaitingReview([
      zgloszenie({ id: 'zrobione', status: 'fixed' }),
      zgloszenie({ id: 'nowe', status: 'new' }),
      zgloszenie({ id: 'zamkniete', status: 'done' }),
    ]);

    expect(lista.map((w) => w.id)).toEqual(['zrobione']);
  });

  it('najstarsze zrobione jest pierwsze', () => {
    const lista = buildAwaitingReview([
      zgloszenie({ id: 'nowsze', status: 'fixed', createdAt: '2026-09-05T10:00:00.000Z' }),
      zgloszenie({ id: 'starsze', status: 'fixed', createdAt: '2026-09-01T10:00:00.000Z' }),
    ]);

    expect(lista.map((w) => w.id)).toEqual(['starsze', 'nowsze']);
  });
});

/**
 * Kolejka z dyskusji — Adam: „w kolejce niech będą wszystkie zadania
 * zgłoszone w dyskusji". `stanWatku` już wie, po czyjej stronie jest piłka;
 * tu tylko wybieramy wątki, gdzie to moja.
 */
describe('kolejka z dyskusji', () => {
  const watek = (patch: Partial<Discussion>): Discussion => ({
    id: 'w1',
    title: 'Wątek',
    description: 'Pytanie',
    author: 'Adam',
    createdAt: '2026-09-04T10:00:00.000Z',
    messages: [],
    ...patch,
  });

  it('wątek bez odpowiedzi czeka na mnie — autor to nie ja', () => {
    const lista = buildDiscussionQueue([watek({ id: 'w1' })], 'Claude');
    expect(lista.map((w) => w.id)).toEqual(['w1']);
  });

  it('wątek, w którym ostatnie słowo należy do mnie, nie jest w kolejce', () => {
    const lista = buildDiscussionQueue(
      [
        watek({
          id: 'w1',
          messages: [{ author: 'Claude', text: 'Odpowiedziałem.', at: '2026-09-04T12:00:00.000Z' }],
        }),
      ],
      'Claude',
    );
    expect(lista).toEqual([]);
  });

  it('wątek ustalony (closed) nie wchodzi do kolejki mimo braku mojej odpowiedzi', () => {
    const lista = buildDiscussionQueue([watek({ id: 'w1', closed: true })], 'Claude');
    expect(lista).toEqual([]);
  });

  it('link prowadzi do zakładki dyskusji, nie zgłoszeń', () => {
    const lista = buildDiscussionQueue([watek({ id: 'w9' })], 'Claude');
    expect(lista[0].link).toBe('/admin/discussions?open=w9');
  });

  it('pilniejszy wątek idzie pierwszy, tak jak zgłoszenia', () => {
    const lista = buildDiscussionQueue(
      [
        watek({ id: 'zwykly', priority: 'low' }),
        watek({ id: 'pilny', priority: 'ultra' }),
      ],
      'Claude',
    );
    expect(lista.map((w) => w.id)).toEqual(['pilny', 'zwykly']);
  });
});
