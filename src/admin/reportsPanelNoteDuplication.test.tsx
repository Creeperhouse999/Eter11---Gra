import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';

/**
 * Notatka nie może dodać się dwa razy przy jednym kliknięciu „Odeślij do
 * poprawki" / „Dalej nie działa".
 *
 * Regresja (zgłoszenie „Raz klikam wyślij do poprawki"): `changeStatus`
 * dokładał notatkę do stanu OPTYMISTYCZNIE (`setReports` po `await
 * setReportStatus`), a jednocześnie `watchReports` (onSnapshot) sam
 * odświeża stan, gdy tylko zapis trafi do lokalnego cache Firestore —
 * co dzieje się PRZED rozwiązaniem promise z `updateDoc`. Nasłuch dokładał
 * notatkę raz, a potem ręczny optymistyczny zapis dokładał ją DRUGI raz do
 * (już zaktualizowanego) stanu. W bazie była jedna kopia — stąd „po
 * odświeżeniu jest 1" w opisie zgłoszenia. Fix: nie dublować tego, co i tak
 * robi nasłuch — tak jak DiscussionsPanel.send już to robi.
 */
vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));
vi.mock('../firebase/upload', () => ({ uploadImage: vi.fn() }));

const report: Report = {
  id: 'r1',
  kind: 'bug',
  title: 'Zgłoszenie testowe',
  description: 'opis',
  status: 'fixed',
  createdAt: '2026-07-24T10:00:00.000Z',
  notes: [],
};

let latestOnChange: ((next: Report[]) => void) | null = null;

// Odtwarza realny Firestore: `updateDoc` odkłada zmianę do lokalnego cache
// natychmiast (nasłuch dostaje ją od razu), a promise z `setReportStatus`
// rozwiązuje się DOPIERO potem — dokładnie w tej kolejności, w jakiej dzieje
// się to w przeglądarce.
const setReportStatus = vi.fn(
  (_id: string, status: string, note?: { from: 'dev' | 'reporter'; text: string; author?: string }) =>
    new Promise<void>((resolve) => {
      const next = [
        {
          ...report,
          status: status as Report['status'],
          notes: note
            ? [
                ...(report.notes ?? []),
                {
                  from: note.from,
                  text: note.text,
                  at: '2026-08-05T15:41:00.000Z',
                  ...(note.author ? { author: note.author } : {}),
                },
              ]
            : report.notes,
        },
      ];
      latestOnChange?.(next);
      resolve();
    }),
);

vi.mock('../firebase/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/reports')>();
  return {
    ...actual,
    watchReports: vi.fn(),
    setReportStatus: (...args: unknown[]) =>
      (setReportStatus as unknown as (...a: unknown[]) => Promise<void>)(...args),
  };
});

import { ReportsPanel } from './ReportsPanel';
import { watchReports, type Report } from '../firebase/reports';

describe('ReportsPanel — notatka nie dubluje się przy odesłaniu do poprawki', () => {
  it('jedno kliknięcie „Odeślij do poprawki" zostawia jedną notatkę, nie dwie', async () => {
    vi.mocked(watchReports).mockImplementation((onChange) => {
      latestOnChange = onChange;
      onChange([report]);
      return () => {};
    });

    render(
      <ToastProvider>
        <ReportsPanel author="Alan" role="admin" statusTab="fixed" />
      </ToastProvider>,
    );

    fireEvent.click((await screen.findByText('Zgłoszenie testowe')).closest('button')!);
    fireEvent.click(await screen.findByRole('button', { name: /Dalej nie działa/ }));
    fireEvent.change(await screen.findByLabelText(/Co dokładnie nadal nie działa/), {
      target: { value: 'To nie jest imię gracza; tylko tryb jasny/ciemny' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Odeślij do poprawki/ }));

    // Formularz komentarza zamyka się po udanym zapisie (setCommenting(null)) —
    // czekamy na to, żeby nie złapać przejściowej chwili, w której notatka już
    // doszła z nasłuchu, a textarea z tym samym tekstem jeszcze nie zniknęła.
    // Zgłoszenie mówi o duplikacie, który ZOSTAJE (znika dopiero po odświeżeniu
    // strony), nie o takim, który sam się cofa milisekundę później.
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(/Co dokładnie nadal nie działa/),
    );

    const notes = screen.getAllByText('To nie jest imię gracza; tylko tryb jasny/ciemny');
    // Bez fixu: 2 (nasłuch + ręczny optymistyczny dopisek, trwale). Z fixem: 1.
    expect(notes).toHaveLength(1);
  });
});
