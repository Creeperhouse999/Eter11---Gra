import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { Role } from '../firebase/roles';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { ToastProvider } from '../ui/controls/Toast';

/**
 * Znalezione przy adwersaryjnym przeglądzie uprawnień: `NotificationBell`
 * montuje się w AdminApp BEZ ŻADNEGO warunku roli — inaczej niż każdy inny
 * panel/zakładka w tym pliku (wszystkie gated `canEdit`/`canDiscuss`/…).
 * `watchMine` czyta `notifications/{item}` z regułą
 * `allow read: if mozeEdytowac() && resource.data.uid == request.auth.uid`
 * (firestore.rules), a `mozeEdytowac()` wyklucza `viewer`.
 *
 * Konto może być `viewer` i MIEĆ powiadomienia z czasów, gdy miało wyższą
 * rolę (np. zgłosiło coś jako coworker, potem zostało zdegradowane, a admin
 * dopiero teraz odrzuca/naprawia to zgłoszenie — `notify()` dobiera adresata
 * po autorze zgłoszenia, niezależnie od aktualnej roli). Taki viewer widzi
 * dzwonek, który przy KAŻDYM odczycie/oznaczeniu dostaje odmowę z bazy —
 * `watchMine` łapie błąd i cicho woła `onChange([])`, więc nie ma nawet
 * tosta: dzwonek na zawsze pokazuje „Nic nowego", a użytkownik traci
 * powiadomienia bez śladu, że coś nie działa.
 */

let authCb: ((u: unknown) => void) | null = null;
const onAuthStateChanged = vi.fn((_auth: unknown, cb: (u: unknown) => void) => {
  authCb = cb;
  return vi.fn();
});

const roleResolvers: Record<string, (r: Role) => void> = {};
const loadAccount = vi.fn(
  (uid: string, _email?: string | null) =>
    new Promise<{ role: Role }>((resolve) => {
      roleResolvers[uid] = (role: Role) => resolve({ role });
    }),
);

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...a: unknown[]) =>
    (onAuthStateChanged as unknown as (...x: unknown[]) => () => void)(...a),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));

const watchMine = vi.fn((_uid: string, cb: (items: unknown[]) => void) => {
  cb([]);
  return () => {};
});
vi.mock('../firebase/notifications', () => ({
  watchMine: (uid: string, cb: (items: unknown[]) => void) => watchMine(uid, cb),
  notify: vi.fn(async () => {}),
  uidsForAuthor: () => [],
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  removeNotification: vi.fn(),
  removeAllMine: vi.fn(),
}));
vi.mock('../firebase/roles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/roles')>();
  return {
    ...actual,
    loadAccount: (uid: string, email: string | null) => loadAccount(uid, email),
    watchTeam: (cb: (m: unknown[]) => void) => {
      cb([]);
      return () => {};
    },
  };
});
vi.mock('../firebase/content', () => ({
  loadContent: vi.fn(
    async () => ({ content: BUILTIN_CONTENT, source: 'builtin', reason: 'empty' }) as const,
  ),
  saveContent: vi.fn(),
}));
vi.mock('../firebase/upload', () => ({ uploadImage: vi.fn() }));
vi.mock('../firebase/presets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/presets')>();
  return {
    ...actual,
    watchPresets: (cb: (p: unknown[]) => void) => {
      cb([]);
      return () => {};
    },
    watchBundles: (cb: (b: unknown[]) => void) => {
      cb([]);
      return () => {};
    },
  };
});

const { AdminApp } = await import('./AdminApp');

beforeEach(() => {
  authCb = null;
  onAuthStateChanged.mockClear();
  loadAccount.mockClear();
  watchMine.mockClear();
  for (const k of Object.keys(roleResolvers)) delete roleResolvers[k];
});

const login = async (role: Role) => {
  render(
    <ToastProvider>
      <AdminApp />
    </ToastProvider>,
  );
  act(() => authCb!({ uid: 'me', email: 'a@x' }));
  await act(async () => {
    roleResolvers['me'](role);
  });
};

describe('AdminApp — dzwonek powiadomień a rola viewer', () => {
  it('viewer NIE dostaje dzwonka — reguła i tak odrzuciłaby każdy jego odczyt', async () => {
    await login('viewer');
    expect(screen.queryByLabelText(/Powiadomienia/)).toBeNull();
    expect(watchMine).not.toHaveBeenCalled();
  });

  it('coworker (może edytować) nadal widzi dzwonek', async () => {
    await login('coworker');
    expect(screen.getByLabelText(/Powiadomienia/)).toBeTruthy();
  });
});
