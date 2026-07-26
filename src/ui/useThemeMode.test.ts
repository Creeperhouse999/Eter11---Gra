import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeMode } from './useThemeMode';

/**
 * Tryb jasny/ciemny. Kluczowa, świadoma decyzja (patrz komentarz w hooku):
 * bez zapisanego wyboru gra jest ZAWSZE ciemna i NIE sięga po preferencję
 * systemu — inaczej ktoś z jasnym systemem dostałby jasny tryb, którego nie
 * wybrał. Test pilnuje tej decyzji: gdyby ktoś „pomocnie" dołożył
 * `prefers-color-scheme`, ma się to wywalić tutaj.
 */

const KEY = 'eter11:theme-mode';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('useThemeMode', () => {
  it('domyślnie ciemny — nawet gdy system woli jasny', () => {
    // System deklaruje jasny; hook i tak ma zostać przy ciemnym.
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: light)',
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    );
    const { result } = renderHook(() => useThemeMode());
    expect(result.current.mode).toBe('dark');
    vi.unstubAllGlobals();
  });

  it('respektuje zapisany wybór', () => {
    localStorage.setItem(KEY, 'light');
    expect(renderHook(() => useThemeMode()).result.current.mode).toBe('light');

    localStorage.setItem(KEY, 'dark');
    expect(renderHook(() => useThemeMode()).result.current.mode).toBe('dark');
  });

  it('ignoruje śmieciową wartość w zapisie, wraca do ciemnego', () => {
    localStorage.setItem(KEY, 'niebieski');
    expect(renderHook(() => useThemeMode()).result.current.mode).toBe('dark');
  });

  it('toggle przełącza tryb, zapisuje i znaczy <html>', () => {
    const { result } = renderHook(() => useThemeMode());
    expect(result.current.mode).toBe('dark');

    act(() => result.current.toggle());
    expect(result.current.mode).toBe('light');
    expect(localStorage.getItem(KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');

    act(() => result.current.toggle());
    expect(result.current.mode).toBe('dark');
    expect(localStorage.getItem(KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
