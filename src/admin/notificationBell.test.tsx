import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Notification } from '../firebase/notifications';

/**
 * Dzwonek powiadomień — jedyne miejsce, gdzie zespół dowiaduje się, że coś się
 * wydarzyło.
 *
 * Trzy rzeczy potrafią tu zawieść po cichu:
 * 1. Licznik. Gdy pokazuje zero mimo czekających spraw, nikt ich nie otworzy.
 * 2. Klawiatura. Po zamknięciu listy fokus musi wrócić na dzwonek — inaczej
 *    kolejny Tab startuje od góry strony i osoba pracująca bez myszy tabuje
 *    przez cały panel.
 * 3. Czytnik ekranu. Przeczytane różni się WYŁĄCZNIE przygaszeniem, a licznik
 *    w odznace jest przed czytnikiem ukryty — bez osobnego znacznika wszystkie
 *    wpisy brzmiałyby identycznie.
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {} }));

let items: Notification[] = [];
const markRead = vi.fn(async (_id: string) => {});
const removeNotification = vi.fn(async (_id: string) => {});
const markAllRead = vi.fn(async (_uid: string) => {});
const removeAllMine = vi.fn(async (_uid: string) => {});

vi.mock('../firebase/notifications', () => ({
  watchMine: (_uid: string, cb: (n: Notification[]) => void) => {
    cb(items);
    return () => {};
  },
  markRead: (id: string) => markRead(id),
  markAllRead: (uid: string) => markAllRead(uid),
  removeNotification: (id: string) => removeNotification(id),
  removeAllMine: (uid: string) => removeAllMine(uid),
}));

vi.mock('../firebase/roles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/roles')>();
  return { ...actual, watchTeam: (cb: (m: unknown[]) => void) => { cb([]); return () => {}; } };
});

const { NotificationBell } = await import('./NotificationBell');

const wpis = (patch: Partial<Notification> = {}): Notification => ({
  id: 'n1',
  uid: 'ja',
  kind: 'discussion-reply',
  title: 'Adam odpisał w wątku „Grafiki kart"',
  body: 'Zerknijcie na propozycję',
  from: 'Adam',
  link: '/admin/discussions?open=d1',
  createdAt: '2026-08-01T10:00:00.000Z',
  read: false,
  ...patch,
});

beforeEach(() => {
  items = [];
  markRead.mockClear();
  removeNotification.mockClear();
});

describe('NotificationBell', () => {
  it('licznik pokazuje tylko nieprzeczytane', () => {
    items = [wpis(), wpis({ id: 'n2', read: true }), wpis({ id: 'n3' })];
    render(<NotificationBell uid="ja" onOpen={() => {}} />);

    // Dwa nieprzeczytane z trzech — licznik i etykieta mówią to samo.
    expect(screen.getByLabelText('Powiadomienia: 2 nowe')).toBeTruthy();
  });

  it('bez nowych spraw nie straszy licznikiem', () => {
    items = [wpis({ read: true })];
    render(<NotificationBell uid="ja" onOpen={() => {}} />);

    expect(screen.getByLabelText('Powiadomienia')).toBeTruthy();
  });

  it('pusta skrzynka mówi wprost, że nic nie czeka', () => {
    render(<NotificationBell uid="ja" onOpen={() => {}} />);
    fireEvent.click(screen.getByLabelText('Powiadomienia'));

    expect(screen.getByText('Nic nowego.')).toBeTruthy();
  });

  it('kliknięcie wpisu otwiera miejsce sprawy i oznacza go jako przeczytany', () => {
    items = [wpis()];
    const onOpen = vi.fn();
    render(<NotificationBell uid="ja" onOpen={onOpen} />);
    fireEvent.click(screen.getByLabelText('Powiadomienia: 1 nowe'));

    fireEvent.click(screen.getByText('Adam odpisał w wątku „Grafiki kart"'));

    expect(onOpen).toHaveBeenCalledWith('/admin/discussions?open=d1');
    expect(markRead).toHaveBeenCalledWith('n1');
  });

  it('nieprzeczytane ma znacznik czytelny dla czytnika ekranu', () => {
    items = [wpis()];
    render(<NotificationBell uid="ja" onOpen={() => {}} />);
    fireEvent.click(screen.getByLabelText('Powiadomienia: 1 nowe'));

    // Sedno: przygaszenie widzi tylko oko. Czytnik potrzebuje słowa.
    expect(screen.getByText('Nowe:', { exact: false })).toBeTruthy();
  });

  it('przeczytane NIE ma znacznika „Nowe"', () => {
    items = [wpis({ read: true })];
    render(<NotificationBell uid="ja" onOpen={() => {}} />);
    fireEvent.click(screen.getByLabelText('Powiadomienia'));

    expect(screen.queryByText('Nowe:', { exact: false })).toBeNull();
  });

  it('Escape zamyka listę i oddaje fokus dzwonkowi', () => {
    items = [wpis()];
    render(<NotificationBell uid="ja" onOpen={() => {}} />);
    const dzwonek = screen.getByLabelText('Powiadomienia: 1 nowe');
    fireEvent.click(dzwonek);
    expect(screen.getByText('Powiadomienia')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Nic nowego.')).toBeNull();
    // Bez tego kolejny Tab startuje od góry całej strony.
    expect(document.activeElement).toBe(dzwonek);
  });
});
