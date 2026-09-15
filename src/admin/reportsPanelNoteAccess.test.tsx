import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';

/**
 * `hasActions` (pasek akcji pod zgłoszeniem) liczył się wyłącznie z flag
 * dostępnych moderatorowi (status/usuwanie/edycja) — coworker i editor,
 * którym reguły Firestore (`mozeEdytowac()`) i `mozeDopisacUwage()` pozwalają
 * dopisać notatkę, nie widzieli w ogóle paska akcji, więc przycisk „Dopisz
 * uwagę" nigdy się nie renderował. Zgłaszający coworker/editor nie mógł
 * odpowiedzieć na własne zgłoszenie.
 */
vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));
vi.mock('../firebase/upload', () => ({ uploadImage: vi.fn() }));

vi.mock('../firebase/roles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/roles')>();
  return { ...actual, watchTeam: (cb: (m: unknown[]) => void) => { cb([]); return () => {}; } };
});
vi.mock('../firebase/notifications', () => ({
  notify: vi.fn(async () => {}),
  uidsForAuthor: () => [],
}));
vi.mock('../firebase/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/reports')>();
  return { ...actual, watchReports: vi.fn() };
});

import { ReportsPanel } from './ReportsPanel';
import { watchReports, type Report } from '../firebase/reports';

const report: Report = {
  id: 'r1',
  kind: 'bug',
  title: 'Zgłoszenie testowe',
  description: 'opis',
  status: 'new',
  createdAt: '2026-07-24T10:00:00.000Z',
  notes: [],
};

describe('ReportsPanel — coworker/editor widzą „Dopisz uwagę"', () => {
  it('coworker widzi przycisk dopisania uwagi na zgłoszeniu `new`', async () => {
    vi.mocked(watchReports).mockImplementation((onChange) => {
      onChange([report]);
      return () => {};
    });

    render(
      <ToastProvider>
        <ReportsPanel author="Kolega" role="coworker" statusTab="new" />
      </ToastProvider>,
    );

    fireEvent.click((await screen.findByText('Zgłoszenie testowe')).closest('button')!);

    expect(await screen.findByRole('button', { name: /Dopisz uwagę/ })).toBeTruthy();
  });
});
