import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';

/**
 * Zmiana statusu zgłoszenia nie może zapisać się dwa razy przy dwukliku.
 *
 * Regresja: changeStatus nie miał blokady w locie — dwuklik wołał setReportStatus
 * dwa razy, a przy komentarzu każde dokładało near-duplikat notatki (arrayUnion,
 * inny `at`). Ref-guard (jak inFlight w ReportButton) odrzuca drugie wejście.
 */
vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));
vi.mock('../firebase/upload', () => ({ uploadImage: vi.fn() }));

// setReportStatus zawisa (pending) — pierwsze wywołanie trzyma guard, drugi klik
// (synchroniczny) musi zostać odrzucony.
const setReportStatus = vi.fn(() => new Promise<void>(() => {}));

vi.mock('../firebase/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/reports')>();
  return {
    ...actual,
    loadReports: vi.fn(),
    setReportStatus: (...args: unknown[]) =>
      (setReportStatus as unknown as (...a: unknown[]) => Promise<void>)(...args),
  };
});

import { ReportsPanel } from './ReportsPanel';
import { loadReports, type Report } from '../firebase/reports';

const report: Report = {
  id: 'r1',
  kind: 'bug',
  title: 'Zgłoszenie testowe',
  description: 'opis',
  status: 'new',
  createdAt: '2026-07-24T10:00:00.000Z',
  notes: [],
};

describe('ReportsPanel — blokada dwukliku statusu', () => {
  it('dwuklik „Naprawione" zapisuje status tylko raz', async () => {
    vi.mocked(loadReports).mockResolvedValue([report]);
    setReportStatus.mockClear();

    render(
      <ToastProvider>
        <ReportsPanel author="Dev" role="admin" statusTab="new" />
      </ToastProvider>,
    );

    // Otwórz zgłoszenie — przyciski statusu są w widoku otwartego zgłoszenia.
    fireEvent.click((await screen.findByText('Zgłoszenie testowe')).closest('button')!);

    const button = await screen.findByRole('button', { name: /Naprawione/ });
    fireEvent.click(button);
    fireEvent.click(button);

    // Bez fixu: 2 wywołania (podwójny zapis + duplikat notatki). Z fixem: 1.
    expect(setReportStatus).toHaveBeenCalledTimes(1);
  });
});
