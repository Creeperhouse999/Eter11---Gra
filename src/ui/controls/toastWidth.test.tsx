import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ToastProvider } from './Toast';

/**
 * Kontener toastów nie może wypadać za lewą krawędź na telefonie.
 *
 * Regresja: `w-full` (100vw) z `right-4` dawał lewą krawędź = viewportWidth −
 * 16 − 100vw = −16px, więc na ≤384px kolumna była zepchnięta za lewy brzeg, a
 * ikona wiodąca ucięta. Szerokość musi być ograniczona do kadru minus marginesy.
 * To błąd czysto stylowy — asercja pilnuje konkretnej klasy szerokości.
 */
describe('Toast — szerokość kontenera', () => {
  it('nie używa w-full; ogranicza szerokość do kadru minus marginesy', () => {
    const { container } = render(<ToastProvider>{null}</ToastProvider>);
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();

    const className = region!.className;
    // Bez fixu: zawierał `w-full`. Z fixem: szerokość ≤ 100vw − 2rem.
    expect(className).not.toMatch(/\bw-full\b/);
    expect(className).toMatch(/w-\[calc\(100vw-2rem\)\]/);
    // Wyrównanie do prawej zostaje.
    expect(className).toMatch(/\bright-4\b/);
  });
});
