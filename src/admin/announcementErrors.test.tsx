import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import type { Announcement } from '../firebase/announcements';

/**
 * Nieudany zapis w ogłoszeniach nie może kończyć się ciszą.
 *
 * `removeAnnouncement` i `setPinned` łykały wyjątek u siebie i zwracały `void`,
 * a panel nie pokazywał ŻADNEGO komunikatu — ani sukcesu, ani błędu. Przy
 * odrzuconym zapisie (wygasła sesja, reguły, brak sieci) ogłoszenie zostawało
 * na liście, gwiazdka nie zmieniała stanu i nic nie tłumaczyło dlaczego, więc
 * admin klikał w kółko, sądząc, że przycisk jest zawieszony.
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));
vi.mock('../firebase/roles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/roles')>();
  return { ...actual, watchTeam: (cb: (m: unknown[]) => void) => { cb([]); return () => {}; } };
});
vi.mock('../firebase/notifications', () => ({
  notify: vi.fn(async () => {}),
  uidsForAuthor: () => [],
}));

const removeAnnouncement = vi.fn(async (_id: string) => ({ ok: true, error: undefined } as {
  ok: boolean;
  error?: string;
}));
const setPinned = vi.fn(async (_id: string, _pinned: boolean) => ({ ok: true, error: undefined } as {
  ok: boolean;
  error?: string;
}));

const item: Announcement = {
  id: 'a1',
  title: 'Zebranie w czwartek',
  body: 'O 17:00 na kanale zespołu.',
  author: 'Alan',
  createdAt: '2026-08-01T10:00:00.000Z',
  pinned: false,
};

vi.mock('../firebase/announcements', () => ({
  watchAnnouncements: (cb: (a: Announcement[]) => void) => {
    cb([item]);
    return () => {};
  },
  addAnnouncement: vi.fn(async () => ({ ok: true })),
  MAX_TITLE: 120,
  MAX_BODY: 2000,
  removeAnnouncement: (id: string) => removeAnnouncement(id),
  setPinned: (id: string, pinned: boolean) => setPinned(id, pinned),
}));

const { AnnouncementsPanel } = await import('./AnnouncementsPanel');

const renderPanel = () =>
  render(
    <ToastProvider>
      <AnnouncementsPanel role="admin" author="Alan" currentUid="me" />
    </ToastProvider>,
  );

beforeEach(() => {
  removeAnnouncement.mockClear();
  setPinned.mockClear();
});

describe('AnnouncementsPanel — nieudany zapis mówi dlaczego', () => {
  it('odrzucone usunięcie pokazuje komunikat, nie ciszę', async () => {
    removeAnnouncement.mockResolvedValueOnce({ ok: false, error: 'Reguły odrzuciły zapis.' });
    renderPanel();

    fireEvent.click(screen.getByLabelText(/Usuń ogłoszenie/i));
    fireEvent.click(await screen.findByRole('button', { name: 'Usuń' }));

    expect(await screen.findByText('Reguły odrzuciły zapis.')).toBeTruthy();
  });

  it('odrzucone wyróżnienie pokazuje komunikat, nie ciszę', async () => {
    setPinned.mockResolvedValueOnce({ ok: false, error: 'Sesja wygasła.' });
    renderPanel();

    fireEvent.click(screen.getByLabelText('Wyróżnij'));

    expect(await screen.findByText('Sesja wygasła.')).toBeTruthy();
  });
});
