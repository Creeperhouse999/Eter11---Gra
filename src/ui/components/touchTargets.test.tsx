import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportButton } from './ReportButton';
import { ScrollHint } from './ScrollHint';
import { ToastProvider } from '../controls/Toast';

/**
 * `Button.tsx` dokumentuje `min-h-11` (44px) jako najmniejszy cel dotyku, w
 * który ośmiolatek trafia palcem bez pudłowania — ale przycisk zgłoszenia
 * błędu i podpowiedź przewijania to surowe `<button>`, nie `Button`, i obie
 * wypadały poniżej tego rozmiaru (odpowiednio ~36px kwadrat i ~28px wysokości
 * pigułki).
 */
describe('cele dotyku pływających przycisków', () => {
  it('ReportButton ma pełny 44px cel dotyku (h-11 w-11)', () => {
    render(
      <ToastProvider>
        <ReportButton />
      </ToastProvider>,
    );
    const btn = screen.getByRole('button', { name: /zgłoś błąd/i });
    expect(btn.className).toMatch(/\bh-11\b/);
    expect(btn.className).toMatch(/\bw-11\b/);
  });

  describe('ScrollHint', () => {
    afterEach(() => {
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        configurable: true,
        value: 0,
      });
      Object.defineProperty(document.documentElement, 'clientHeight', {
        configurable: true,
        value: 0,
      });
      window.scrollY = 0;
    });

    it('ma min-h-11, gdy widoczna (strona nie mieści się na ekranie)', () => {
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        configurable: true,
        value: 900,
      });
      Object.defineProperty(document.documentElement, 'clientHeight', {
        configurable: true,
        value: 600,
      });
      window.scrollY = 0;

      render(<ScrollHint />);

      const btn = screen.getByRole('button', { name: /niżej jest więcej/i });
      expect(btn.className).toMatch(/\bmin-h-11\b/);
    });
  });
});
