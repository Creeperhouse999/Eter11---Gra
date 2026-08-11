import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';

// Klient Firebase inicjalizuje się przy imporcie (initializeApp/getDatabase);
// w teście podstawiamy atrapy, żeby panel dało się wyrenderować bez sieci.
vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));
// upload.ts woła getStorage(app) przy imporcie — na atrapie by się wywróciło.
vi.mock('../firebase/upload', () => ({ uploadImage: vi.fn() }));

// Prawdziwy moduł (z atrapą klienta) minus watchReports — to podstawiamy sami.
// Panel czyta listę na żywo przez nasłuch, więc atrapa od razu woła callback
// z podstawionymi zgłoszeniami i zwraca no-op odpinający.
vi.mock('../firebase/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/reports')>();
  return { ...actual, watchReports: vi.fn() };
});

import { ReportsPanel } from './ReportsPanel';
import { watchReports, type Report } from '../firebase/reports';

const reportWithNotes = (count: number): Report => ({
  id: 'r1',
  kind: 'bug',
  title: 'Tytuł testowy',
  description: 'opis',
  status: 'new',
  createdAt: '2026-07-24T10:00:00.000Z',
  notes: Array.from({ length: count }, (_, i) => ({
    from: 'dev' as const,
    text: `nota ${i}`,
    at: '2026-07-24T10:00:00.000Z',
  })),
});

/**
 * Lista zgłoszeń podpisuje, ile jest wpisów w rozmowie. Polska odmiana ma
 * trzy formy, nie dwie — 5 to „wpisów", nie „wpisy". Binarny warunek pisał
 * dziecku (i redaktorowi) „5 wpisy", czyli niegramatycznie.
 */
describe('ReportsPanel — odmiana liczby wpisów', () => {
  it('pięć wpisów to „wpisów", nie „wpisy"', async () => {
    vi.mocked(watchReports).mockImplementation((onChange) => {
      onChange([reportWithNotes(5)]);
      return () => {};
    });

    render(
      <ToastProvider>
        <ReportsPanel author="Tester" role="admin" statusTab="new" />
      </ToastProvider>,
    );

    const title = await screen.findByText('Tytuł testowy');
    const row = title.closest('li');
    expect(row?.textContent).toContain('5 wpisów');
    // Bez fixu: „5 wpisy" — regresja odmiany.
    expect(row?.textContent).not.toContain('5 wpisy');
  });
});

/**
 * Podpis notatki bierze imię autora, gdy je zapisano.
 *
 * Regresja: notatka od zespołu (`from: 'dev'`) ZAWSZE wyświetlała się jako
 * „programista", nawet gdy pisał ją co-admin albo admin, który programistą nie
 * jest. Teraz, gdy notatka niesie `author`, podpis bierze się z niego; stara
 * notatka bez `author` dalej spada do generycznej etykiety strony obiegu.
 */
describe('ReportsPanel — podpis autora notatki', () => {
  const openReport = () =>
    fireEvent.click(screen.getByText('Tytuł testowy').closest('button')!);

  it('notatka z autorem podpisuje się imieniem, nie „programista"', async () => {
    const report: Report = {
      id: 'r1',
      kind: 'bug',
      title: 'Tytuł testowy',
      description: 'opis',
      status: 'dismissed',
      createdAt: '2026-07-24T10:00:00.000Z',
      notes: [
        {
          from: 'dev',
          text: 'Odrzucam — działa zgodnie z zasadami.',
          at: '2026-07-24T10:00:00.000Z',
          author: 'Kasia (co-admin)',
        },
      ],
    };
    vi.mocked(watchReports).mockImplementation((onChange) => {
      onChange([report]);
      return () => {};
    });

    render(
      <ToastProvider>
        <ReportsPanel author="Kasia (co-admin)" role="co-admin" statusTab="dismissed" />
      </ToastProvider>,
    );

    openReport();
    const note = (await screen.findByText('Odrzucam — działa zgodnie z zasadami.')).closest('div')!;
    expect(within(note.parentElement!).getByText('Kasia (co-admin)')).toBeTruthy();
    // Bez fixu: podpis „Programista", choć pisze co-admin.
    expect(within(note.parentElement!).queryByText('Programista')).toBeNull();
  });

  it('stara notatka bez autora dalej pokazuje etykietę strony obiegu', async () => {
    const report: Report = {
      id: 'r1',
      kind: 'bug',
      title: 'Tytuł testowy',
      description: 'opis',
      status: 'fixed',
      createdAt: '2026-07-24T10:00:00.000Z',
      notes: [{ from: 'dev', text: 'Naprawione.', at: '2026-07-24T10:00:00.000Z' }],
    };
    vi.mocked(watchReports).mockImplementation((onChange) => {
      onChange([report]);
      return () => {};
    });

    render(
      <ToastProvider>
        <ReportsPanel author="Dev" role="admin" statusTab="fixed" />
      </ToastProvider>,
    );

    openReport();
    // Etykieta strony obiegu pisana wielką literą, jak inne role (Admin, Co-admin…).
    expect(await screen.findByText('Programista')).toBeTruthy();
  });
});

/**
 * Podpowiedzi w formularzu nowego zgłoszenia zależą od rodzaju.
 *
 * Regresja: pola „Tytuł" i „Opis" miały te same podpowiedzi dla błędu i
 * pomysłu — językiem naprawiania czegoś zepsutego („co się dzieje", „co
 * powinno się wydarzyć zamiast tego"), które dla propozycji nie mają sensu.
 */
describe('ReportsPanel — podpowiedzi formularza zależne od rodzaju', () => {
  it('zmiana rodzaju na Pomysł zmienia podpowiedzi pól', async () => {
    vi.mocked(watchReports).mockImplementation((onChange) => {
      onChange([]);
      return () => {};
    });

    render(
      <ToastProvider>
        <ReportsPanel author="Tester" role="admin" statusTab="new" />
      </ToastProvider>,
    );

    const title = await screen.findByLabelText('Tytuł');
    // Domyślnie „Błąd" — podpowiedź w języku naprawiania.
    expect(title.getAttribute('placeholder')).toMatch(/co się dzieje/i);

    fireEvent.click(screen.getByRole('button', { name: 'Rodzaj' }));
    fireEvent.click(screen.getByRole('option', { name: 'Pomysł' }));

    // Bez fixu: podpowiedź zostaje ta sama, choć rodzaj to już „Pomysł".
    expect(title.getAttribute('placeholder')).not.toMatch(/co się dzieje/i);
    expect(title.getAttribute('placeholder')).toMatch(/co warto dodać/i);

    const description = screen.getByLabelText('Opis');
    expect(description.getAttribute('placeholder')).toMatch(/proponujesz/i);
  });
});
