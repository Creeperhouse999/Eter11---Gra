import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { Report } from '../firebase/reports';
import type { Discussion } from '../firebase/discussions';

/**
 * Aktywność — Adam uprościł do dwóch kategorii plus nowa trzecia:
 * „W robocie", „W kolejce" (zgłoszenia nowe/wróciły ORAZ dyskusje, na które
 * czekam z odpowiedzią) i „Do sprawdzenia" (zrobione, czeka na potwierdzenie).
 * Wcześniejszy podział „W kolejce" / „Lista kolejnych zadań" zniknął — to
 * jedna wspólna lista.
 */

let reports: Report[] = [];
let discussions: Discussion[] = [];

vi.mock('../firebase/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/reports')>();
  return {
    ...actual,
    watchReports: (cb: (r: Report[]) => void) => {
      cb(reports);
      return () => {};
    },
    setQueueOrder: vi.fn(),
  };
});

vi.mock('../firebase/discussions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/discussions')>();
  return {
    ...actual,
    watchDiscussions: (cb: (d: Discussion[]) => void) => {
      cb(discussions);
      return () => {};
    },
  };
});

const { ActivityPanel } = await import('./ActivityPanel');

const zgloszenie = (patch: Partial<Report>): Report => ({
  id: 'r1',
  kind: 'bug',
  title: 'Zgłoszenie',
  description: '',
  status: 'new',
  createdAt: '2026-09-04T10:00:00.000Z',
  ...patch,
});

const watek = (patch: Partial<Discussion>): Discussion => ({
  id: 'w1',
  title: 'Wątek',
  description: '',
  author: 'Adam',
  createdAt: '2026-09-04T10:00:00.000Z',
  messages: [],
  ...patch,
});

describe('ActivityPanel — trzy kategorie', () => {
  it('dyskusja czekająca na odpowiedź trafia do „W kolejce" razem ze zgłoszeniami', () => {
    reports = [zgloszenie({ id: 'nowe', title: 'Nowy błąd', status: 'new' })];
    discussions = [watek({ id: 'pytanie', title: 'Pytanie od zespołu' })];

    render(<ActivityPanel onOpen={vi.fn()} />);

    const sekcjaKolejka = screen.getByText('Nowy błąd').closest('section') ?? document.body;
    expect(within(sekcjaKolejka as HTMLElement).getByText('Pytanie od zespołu')).toBeTruthy();
  });

  it('zgłoszenie „fixed" trafia do „Do sprawdzenia", nie do „W kolejce"', () => {
    reports = [zgloszenie({ id: 'zrobione', title: 'Zrobiony fix', status: 'fixed' })];
    discussions = [];

    render(<ActivityPanel onOpen={vi.fn()} />);

    expect(screen.getByText('Zrobiony fix')).toBeTruthy();
    // Plakietka przy pozycji nosi ten sam napis co nagłówek sekcji — stąd
    // dwa trafienia, gdy pozycja naprawdę wylądowała w tej kategorii.
    expect(screen.getAllByText('Do sprawdzenia')).toHaveLength(2);
  });

  it('dyskusja w kolejce nie ma strzałek do przesuwania — queueRank żyje na zgłoszeniach', () => {
    reports = [];
    discussions = [watek({ id: 'w1', title: 'Sam wątek w kolejce' })];

    render(<ActivityPanel onOpen={vi.fn()} />);

    expect(screen.getByText('Sam wątek w kolejce')).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /w górę|w dół/ })).toHaveLength(0);
  });

  it('kliknięcie dyskusji prowadzi do zakładki dyskusji, nie zgłoszeń', () => {
    reports = [];
    discussions = [watek({ id: 'w42', title: 'Kliknij mnie' })];
    const onOpen = vi.fn();

    render(<ActivityPanel onOpen={onOpen} />);
    screen.getByText('Kliknij mnie').closest('button')!.click();

    expect(onOpen).toHaveBeenCalledWith('/admin/discussions?open=w42');
  });
});
