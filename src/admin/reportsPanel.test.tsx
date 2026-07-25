import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';

// Klient Firebase inicjalizuje się przy imporcie (initializeApp/getDatabase);
// w teście podstawiamy atrapy, żeby panel dało się wyrenderować bez sieci.
vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));
// upload.ts woła getStorage(app) przy imporcie — na atrapie by się wywróciło.
vi.mock('../firebase/upload', () => ({ uploadImage: vi.fn() }));

// Prawdziwy moduł (z atrapą klienta) minus loadReports — to podstawiamy sami.
vi.mock('../firebase/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/reports')>();
  return { ...actual, loadReports: vi.fn() };
});

import { ReportsPanel } from './ReportsPanel';
import { loadReports, type Report } from '../firebase/reports';

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
    vi.mocked(loadReports).mockResolvedValue([reportWithNotes(5)]);

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
