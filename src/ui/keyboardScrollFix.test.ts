import { describe, it, expect, vi, afterEach } from 'vitest';
import { installKeyboardScrollFix } from './keyboardScrollFix';

/**
 * Naprawa scrolla po klawiaturze nie może się wywalić, gdy `visualViewport`
 * nie istnieje (starsze przeglądarki, jsdom), i musi przyciąć nadmiarowy
 * scroll, gdy widoczny obszar wraca do pełnej wysokości.
 */
describe('installKeyboardScrollFix', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Sprzątamy podstawiony visualViewport.
    delete (window as unknown as { visualViewport?: unknown }).visualViewport;
  });

  it('nie rzuca, gdy brak visualViewport', () => {
    delete (window as unknown as { visualViewport?: unknown }).visualViewport;
    expect(() => installKeyboardScrollFix()).not.toThrow();
  });

  it('przycina scroll, gdy obszar urósł (klawiatura zniknęła)', () => {
    const listeners: Record<string, () => void> = {};
    const vv = {
      height: 500, // z klawiaturą
      addEventListener: (type: string, cb: () => void) => {
        listeners[type] = cb;
      },
    };
    (window as unknown as { visualViewport: unknown }).visualViewport = vv;

    // Strona: content 983, okno 844 → maksymalny scroll 139, a jest 700.
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 983,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
    window.scrollY = 700;
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });

    installKeyboardScrollFix();
    vv.height = 844; // klawiatura znika
    listeners.resize();

    expect(scrollTo).toHaveBeenCalledWith(0, 139);
  });
});
