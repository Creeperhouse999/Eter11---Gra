import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Role } from '../firebase/roles';

/**
 * Rola w panelu: okno „nieznane" i kolejność odczytów.
 *
 * (b) Rola startuje jako najniższa (viewer) do czasu odczytu — wcześniej
 * startowała jako coworker, więc konto viewer PRZED rozwiązaniem loadRole miało
 * prawa coworkera (Zapisz, Ctrl+S, Dyskusja).
 * (a) Wynik loadRole starego konta, rozwiązany po przelogowaniu, nie może
 * nadpisać roli nowego (błąd uprawnień).
 */

let authCb: ((u: unknown) => void) | null = null;
const onAuthStateChanged = vi.fn((_auth: unknown, cb: (u: unknown) => void) => {
  authCb = cb;
  return vi.fn();
});

const roleResolvers: Record<string, (r: Role) => void> = {};
const loadRole = vi.fn(
  (uid: string, _email?: string | null) =>
    new Promise<Role>((resolve) => { roleResolvers[uid] = resolve; }),
);

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...a: unknown[]) =>
    (onAuthStateChanged as unknown as (...x: unknown[]) => () => void)(...a),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock('../firebase/client', () => ({ auth: {} }));
vi.mock('../firebase/roles', () => ({
  loadRole: (uid: string, email: string | null) => loadRole(uid, email),
  DEFAULT_ROLE: 'coworker',
}));

const { useAdminAuth } = await import('./useAdminAuth');

beforeEach(() => {
  authCb = null;
  onAuthStateChanged.mockClear();
  loadRole.mockClear();
  for (const k of Object.keys(roleResolvers)) delete roleResolvers[k];
});

describe('useAdminAuth — rola', () => {
  it('przed rozwiązaniem loadRole rola jest najniższa (viewer), nie coworker', async () => {
    const { result } = renderHook(() => useAdminAuth());

    act(() => authCb!({ uid: 'u1', email: 'a@x' }));
    // loadRole jeszcze nie rozwiązane → guardy muszą odmawiać.
    expect(result.current.role).toBe('viewer');

    await act(async () => {
      roleResolvers['u1']('admin');
    });
    expect(result.current.role).toBe('admin');
  });

  it('wolniejszy odczyt starego konta nie nadpisuje roli nowego', async () => {
    const { result } = renderHook(() => useAdminAuth());

    act(() => authCb!({ uid: 'A', email: 'a@x' })); // konto A
    act(() => authCb!({ uid: 'B', email: 'b@x' })); // przelogowanie na B

    // B rozwiązuje się pierwsze.
    await act(async () => {
      roleResolvers['B']('co-admin');
    });
    expect(result.current.role).toBe('co-admin');

    // Stare A rozwiązuje się PÓŹNIEJ — nie może cofnąć roli B.
    await act(async () => {
      roleResolvers['A']('admin');
    });
    expect(result.current.role).toBe('co-admin');
  });

  /**
   * `roleReady` odróżnia „naprawdę viewer" od „jeszcze nie wiadomo" — bez
   * tego AdminApp nie umiał odróżnić tych dwóch stanów i cofał deep-linki do
   * zakładek wymagających roli (Zespół/Dyskusja/Historia) na przegląd nawet
   * dla użytkowników, którzy mieli do nich prawo — patrz
   * adminAppRestrictedTabGuard.test.tsx.
   */
  it('roleReady: fałsz do czasu odczytu roli, prawda po jej ustaleniu', async () => {
    const { result } = renderHook(() => useAdminAuth());
    expect(result.current.roleReady).toBe(false);

    act(() => authCb!({ uid: 'u1', email: 'a@x' }));
    // Zalogowano, ale loadRole jeszcze nie rozwiązane.
    expect(result.current.roleReady).toBe(false);

    await act(async () => {
      roleResolvers['u1']('admin');
    });
    expect(result.current.roleReady).toBe(true);
  });

  it('roleReady: prawda od razu, gdy nikt nie jest zalogowany — nie ma czego wczytywać', () => {
    const { result } = renderHook(() => useAdminAuth());

    act(() => authCb!(null));

    expect(result.current.roleReady).toBe(true);
    expect(result.current.role).toBe('viewer');
  });
});
