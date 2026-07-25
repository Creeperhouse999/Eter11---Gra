import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spotlight } from './Spotlight';

/**
 * Zasłona samouczka bez celu (kroki narracyjne) musi przyciemniać spójnie z
 * krokami gry — ciemnym scrimem, nie `bg-bg/70`. `--eter-bg` w motywie jasnym
 * to prawie biel, więc `bg-bg/70` ledwo przyciemniało, a kroki gry mają ciemny
 * scrim z maski SVG. To błąd czysto stylowy — asercja pilnuje ciemnego tła.
 */
describe('Spotlight — spójny scrim bez celu', () => {
  it('overlay bez celu ma ciemny scrim, nie klasę bg-bg', () => {
    const { container } = render(<Spotlight target={null} />);
    const overlay = container.querySelector('div[aria-hidden="true"]') as HTMLElement;

    expect(overlay).not.toBeNull();
    // Bez fixu: className zawierało `bg-bg/70` (jasny w light theme).
    expect(overlay.className).not.toMatch(/bg-bg/);
    // Z fixem: ciemny scrim niezależny od motywu.
    expect(overlay.style.background).toContain('rgba(10, 16, 32');
  });
});
