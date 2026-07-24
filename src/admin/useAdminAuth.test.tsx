import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * Bezpiecznik logowania na telefonie.
 *
 * Na mobile z zablokowanym magazynem (prywatna karta iOS, ITP) `onAuthStateChanged`
 * potrafi nigdy nie zawołać callbacku. `checking` schodzi z `true` tylko w tym
 * callbacku, więc panel wisiał na zawsze na „Sprawdzanie sesji…" (zgłosił Adam).
 * Bezpiecznik: po 8 s przestajemy czekać i pokazujemy ekran logowania.
 */

// onAuthStateChanged, który NIGDY nie woła callbacku — symuluje zawieszony
// magazyn na telefonie. Zwraca funkcję odsubskrybowania, jak prawdziwy.
const onAuthStateChanged = vi.fn(() => vi.fn());

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) =>
    (onAuthStateChanged as unknown as (...a: unknown[]) => () => void)(...args),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock('../firebase/client', () => ({ auth: {} }));
vi.mock('../firebase/roles', () => ({
  loadRole: vi.fn().mockResolvedValue('viewer'),
  DEFAULT_ROLE: 'viewer',
}));

const { useAdminAuth } = await import('./useAdminAuth');

beforeEach(() => {
  vi.useFakeTimers();
  onAuthStateChanged.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAdminAuth — bezpiecznik na zawieszony magazyn', () => {
  it('kończy „Sprawdzanie sesji" po timeoucie, gdy onAuthStateChanged milczy', async () => {
    const { result } = renderHook(() => useAdminAuth());

    // Callback nigdy nie przyszedł — na starcie wciąż sprawdzamy.
    expect(result.current.checking).toBe(true);

    // Po bezpieczniku (8 s) przestajemy czekać — pokaże się ekran logowania.
    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(result.current.checking).toBe(false);
    // Brak usera — bo nikt się nie zalogował; panel pokaże formularz.
    expect(result.current.user).toBeNull();
  });
});
