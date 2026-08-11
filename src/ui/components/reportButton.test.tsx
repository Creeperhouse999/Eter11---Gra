import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportButton } from './ReportButton';
import { ToastProvider } from '../controls/Toast';

/**
 * Regresja: `fixed bottom-3 left-3` siedziało na samym `<button>`, a Tooltip
 * mierzy pozycję swojej owijki (`wrapRef`), nie dziecka. Element `position:
 * fixed` wypada z przepływu i nie wnosi rozmiaru do rodzica — owijka
 * zapadała się do zera i `getBoundingClientRect()` mierzył jej miejsce w
 * drzewie DOM, a nie realną, przypiętą do rogu ekranu pozycję przycisku.
 * Dymek „Zgłoś błąd" renderował się wysoko nad przyciskiem zamiast tuż przy
 * nim (zgłoszenie: „hover w grze jest dużo nad przyciskiem").
 *
 * Fix: pozycjonowanie `fixed` musi siedzieć na owijce Tooltip, nie na
 * dziecku, żeby to właśnie ta mierzona owijka miała realny rozmiar i pozycję
 * na ekranie.
 */
describe('ReportButton — pozycjonowanie owijki Tooltip', () => {
  it('fixed bottom-3 left-3 siedzi na owijce Tooltip, nie na przycisku', () => {
    render(
      <ToastProvider>
        <ReportButton />
      </ToastProvider>,
    );

    const btn = screen.getByRole('button', { name: /zgłoś błąd/i });
    const wrap = btn.closest('span')!;

    expect(wrap.className).toMatch(/\bfixed\b/);
    expect(wrap.className).toMatch(/\bbottom-3\b/);
    expect(wrap.className).toMatch(/\bleft-3\b/);
    // Bez fixu: `fixed` siedziało na przycisku, a mierzona owijka nie miała
    // pozycjonowania — dymek liczył się z jej zapadniętego miejsca w DOM.
    expect(btn.className).not.toMatch(/\bfixed\b/);
  });
});
