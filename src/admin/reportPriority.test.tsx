import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import type { Report } from '../firebase/reports';

/**
 * Pilność zgłoszenia — po to, żeby wiedzieć, co brać najpierw.
 *
 * Sama etykieta nic nie daje: przy kilkudziesięciu zgłoszeniach krytyczne
 * ginęłoby w środku listy ułożonej po dacie. Dlatego lista sortuje po
 * pilności, a dopiero potem po czasie.
 *
 * Zgłoszenia sprzed wprowadzenia tego pola nie mają pilności — czytamy je jako
 * „zwykłe", żeby nie wypychały nowych na dół ani nie skakały na samą górę.
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {} }));
vi.mock('../firebase/upload', () => ({ uploadImage: vi.fn() }));
vi.mock('../firebase/roles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/roles')>();
  return { ...actual, watchTeam: (cb: (m: unknown[]) => void) => { cb([]); return () => {}; } };
});
vi.mock('../firebase/notifications', () => ({ notify: vi.fn(), uidsForAuthor: () => [] }));
vi.mock('../firebase/discussions', () => ({ addDiscussion: vi.fn() }));

const addReport = vi.fn(async (_input: unknown) => ({ ok: true as boolean }));
let lista: Report[] = [];

vi.mock('../firebase/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/reports')>();
  return {
    ...actual,
    watchReports: (cb: (r: Report[]) => void) => {
      cb(lista);
      return () => {};
    },
    addReport: (input: unknown) => addReport(input),
    setReportStatus: vi.fn(),
    updateReport: vi.fn(),
    deleteReport: vi.fn(),
  };
});

const { ReportsPanel } = await import('./ReportsPanel');

const zgloszenie = (patch: Partial<Report>): Report => ({
  id: 'r1',
  kind: 'bug',
  title: 'Coś',
  description: '',
  status: 'new',
  createdAt: '2026-08-01T10:00:00.000Z',
  ...patch,
});

const renderPanel = () =>
  render(
    <ToastProvider>
      <ReportsPanel author="Alan" role="admin" currentUid="me" statusTab="new" />
    </ToastProvider>,
  );

describe('pilność zgłoszeń', () => {
  it('krytyczne trafia nad zwykłe, choć jest starsze', () => {
    lista = [
      zgloszenie({ id: 'nowe-zwykle', title: 'Literówka w opisie', createdAt: '2026-08-10T10:00:00.000Z' }),
      zgloszenie({ id: 'stare-krytyczne', title: 'Gra się nie uruchamia', priority: 'ultra', createdAt: '2026-08-01T10:00:00.000Z' }),
    ];
    renderPanel();

    const tytuly = screen.getAllByText(/Literówka w opisie|Gra się nie uruchamia/);
    expect(tytuly[0].textContent).toContain('Gra się nie uruchamia');
  });

  it('przy równej pilności decyduje czas — najnowsze wyżej', () => {
    lista = [
      zgloszenie({ id: 'starsze', title: 'Starsze zgłoszenie', createdAt: '2026-08-01T10:00:00.000Z' }),
      zgloszenie({ id: 'nowsze', title: 'Nowsze zgłoszenie', createdAt: '2026-08-11T10:00:00.000Z' }),
    ];
    renderPanel();

    const tytuly = screen.getAllByText(/Starsze zgłoszenie|Nowsze zgłoszenie/);
    expect(tytuly[0].textContent).toContain('Nowsze zgłoszenie');
  });

  it('zgłoszenie bez pilności liczy się jako zwykłe, nie spada na dół', () => {
    lista = [
      zgloszenie({ id: 'niski', title: 'Mało ważne', priority: 'low', createdAt: '2026-08-11T10:00:00.000Z' }),
      zgloszenie({ id: 'stare-bez', title: 'Sprzed zmiany', createdAt: '2026-08-01T10:00:00.000Z' }),
    ];
    renderPanel();

    // Stare bez pola stoi WYŻEJ niż świeże oznaczone jako mało ważne.
    const tytuly = screen.getAllByText(/Mało ważne|Sprzed zmiany/);
    expect(tytuly[0].textContent).toContain('Sprzed zmiany');
  });

  it('odznakę widać przy pilnych, nie przy każdym', () => {
    lista = [
      zgloszenie({ id: 'ultra', title: 'Pilne', priority: 'ultra' }),
      zgloszenie({ id: 'zwykle', title: 'Zwykłe', priority: 'medium' }),
    ];
    renderPanel();

    // Pilność stoi w szarej linii pod tytułem (patrz „bałagan" na liście —
    // ramki przy tytule zniknęły), więc szukamy jej we wspólnym wierszu,
    // a nie wewnątrz samego tytułu.
    const wierszPilnego = screen.getByText('Pilne').closest('button')!;
    expect(within(wierszPilnego).getByText('krytyczny')).toBeTruthy();

    // Przy zwykłym pilności nie pokazujemy wcale: to większość zgłoszeń,
    // więc znacznik przy każdym byłby szumem, nie informacją.
    const wierszZwyklego = screen.getByText('Zwykłe').closest('button')!;
    expect(within(wierszZwyklego).queryByText(/zwykły/i)).toBeNull();
  });

  it('nowe zgłoszenie niesie wybraną pilność', async () => {
    lista = [];
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Pilność' }));
    const lista_opcji = screen.getByRole('listbox', { name: 'Pilność' });
    fireEvent.click(within(lista_opcji).getByRole('option', { name: 'Krytyczny' }));

    fireEvent.change(screen.getByLabelText('Tytuł'), { target: { value: 'Gra stoi' } });
    fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }));

    await screen.findByText(/Zgłoszenie zapisane/i);
    const wyslane = addReport.mock.calls[0][0] as { priority: string };
    expect(wyslane.priority).toBe('ultra');
  });
});
