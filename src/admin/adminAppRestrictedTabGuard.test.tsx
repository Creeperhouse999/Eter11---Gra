import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Role } from '../firebase/roles';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { ToastProvider } from '../ui/controls/Toast';

/**
 * Znalezione samodzielnie przy przeglądzie auth/roles, dwa splecione błędy w
 * AdminApp — ten sam błędny fundament: rola do czasu odczytu z Firestore jest
 * `ROLE_UNKNOWN` ('viewer'), nierozróżnialna od „naprawdę viewer".
 *
 * (A) Zakładka Zespół rysuje się `{tab === 'team' && auth.user && <TeamPanel/>}`
 *     — bez `canManageRoles(auth.role)`. TeamPanel pyta o listę kont/ról.
 * (B) Efekt `tabAllowed` cofa na przegląd zakładkę z adresu, gdy bieżąca
 *     (nieustalona jeszcze) rola jej nie dopuszcza — a odpala się na SAMYM
 *     montażu panelu, ZANIM logowanie w ogóle się rozstrzygnie. Efekt:
 *     deep-link `/admin/team` dla PRAWDZIWEGO admina i tak zawsze ląduje na
 *     przeglądzie, bo „jeszcze nie wiadomo" traktowane jest jak „nie wolno".
 *
 * Naprawiając TYLKO (B) (czekać z redirectem, aż rola się ustali) otwiera się
 * okno, w którym `tab` zostaje 'team' i `auth.user` już jest ustawiony, a
 * rola wciąż 'viewer' — i wtedy (A) naprawdę montuje TeamPanel dla kogoś, kto
 * może wcale nie mieć `canManageRoles`. Naprawiając TYLKO (A) samo (B)
 * zostaje: admin nigdy nie doczyta się swojego zespołu z zakładki w adresie.
 * Stąd jeden fix na oba naraz — `roleReady` w useAdminAuth (patrz
 * useAdminAuth.test.ts) plus role-gate w JSX.
 */

let authCb: ((u: unknown) => void) | null = null;
const onAuthStateChanged = vi.fn((_auth: unknown, cb: (u: unknown) => void) => {
  authCb = cb;
  return vi.fn();
});

// Rozwiązywane ręcznie w teście — chodzi o okno, w którym rola jest jeszcze
// nieznana. Hook czyta rolę i imię jednym wywołaniem, więc atrapa oddaje
// obiekt, nie samą rolę.
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
// Dzwonek w nagłówku nasłuchuje powiadomień — bez atrapy sięgnąłby do Firestore.
vi.mock('../firebase/notifications', () => ({
  watchMine: (_uid: string, cb: (items: unknown[]) => void) => { cb([]); return () => {}; },
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
// Pasek presetów/zestawów na przeglądzie sięga do Firestore przez
// watchPresets/watchBundles — bez atrapy uderzyłby w fikcyjne `db: {}` wyżej.
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

/**
 * RTL/React flushuje passive effecty SYNCHRONICZNIE wewnątrz `act()` w
 * środowisku testowym — asercja na finalnym DOM-ie po `act()` nie zobaczy
 * pośredniej klatki, w której TeamPanel zdążyłby się zamontować, zanim coś go
 * cofnęło (obie klatki rozliczają się w jednym act()). Podmieniamy TeamPanel
 * na szpiega: funkcja komponentu jest wywoływana przez Reacta w KAŻDYM
 * renderze, w którym JSX go instancjonuje — nawet jeśli commit z nim nigdy
 * nie trafia do przeglądarki. To jedyny sposób, żeby złapać „zamontował się
 * na chwilę".
 */
const teamPanelMounts = vi.fn();
vi.mock('./TeamPanel', () => ({
  TeamPanel: (props: { currentUid: string }) => {
    teamPanelMounts(props);
    return null;
  },
}));

const { AdminApp } = await import('./AdminApp');

beforeEach(() => {
  authCb = null;
  onAuthStateChanged.mockClear();
  loadAccount.mockClear();
  teamPanelMounts.mockClear();
  for (const k of Object.keys(roleResolvers)) delete roleResolvers[k];
});

describe('AdminApp — zakładka Zespół i deep-link do niej', () => {
  it('deep-link /admin/team NIE montuje TeamPanel ani na chwilę, gdy rola okaże się niedozwolona', async () => {
    window.history.replaceState(null, '', '/admin/team');
    render(
      <ToastProvider>
        <AdminApp />
      </ToastProvider>,
    );

    act(() => authCb!({ uid: 'me', email: 'a@x' }));
    // Logowanie rozwiązane, ale rola jeszcze ROLE_UNKNOWN ('viewer') — okno,
    // w którym stary kod (B) już zdążyłby cofnąć na przegląd niezależnie od
    // prawdziwej roli, i w którym stary kod (A) mógłby zdążyć zamontować
    // TeamPanel, zanim cokolwiek to sprawdzi.
    expect(teamPanelMounts).not.toHaveBeenCalled();
    // Deep-link trzyma się adresu, dopóki rola naprawdę się nie ustali —
    // to jest fix (B). Sprawdzane tu przy okazji, właściwy test niżej.
    expect(window.location.pathname).toBe('/admin/team');

    // Rola rozwiązuje się na 'coworker' — bez prawa do zarządzania zespołem.
    await act(async () => {
      roleResolvers['me']('coworker');
    });

    expect(teamPanelMounts).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/admin/overview');
  });

  it('deep-link /admin/team dla admina NIE cofa na przegląd i montuje TeamPanel', async () => {
    window.history.replaceState(null, '', '/admin/team');
    render(
      <ToastProvider>
        <AdminApp />
      </ToastProvider>,
    );

    act(() => authCb!({ uid: 'me', email: 'a@x' }));
    await act(async () => {
      roleResolvers['me']('admin');
    });

    expect(window.location.pathname).toBe('/admin/team');
    expect(teamPanelMounts).toHaveBeenCalledWith({ currentUid: 'me' });
  });

  it('admin nadal widzi Zespół po kliknięciu zakładki (nawigacja klikiem, bez deep-linku)', async () => {
    window.history.replaceState(null, '', '/admin');
    render(
      <ToastProvider>
        <AdminApp />
      </ToastProvider>,
    );
    act(() => authCb!({ uid: 'me', email: 'a@x' }));
    await act(async () => {
      roleResolvers['me']('admin');
    });

    // Zakładka nazywa się teraz „Admin" (dawniej „Zespół") — zmieniła się sama
    // nazwa, uprawnienia i zawartość zostały te same.
    fireEvent.click(await screen.findByRole('button', { name: /Admin/ }));

    expect(teamPanelMounts).toHaveBeenCalledWith({ currentUid: 'me' });
  });
});
