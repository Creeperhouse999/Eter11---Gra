import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';

/**
 * Usuwanie dołączonego zrzutu ekranu nie może zależeć od hover.
 *
 * Zgłoszenie „Hover ma mobile średnio działa": przycisk usuwania miniatury
 * był `opacity-0` na stałe i pokazywał się dopiero `group-hover:opacity-100`
 * — na dotyku hover w ogóle nie istnieje (część elementów NIE POKAZYWAŁA SIĘ
 * WCALE), a przeglądarki, które symulują hover na dotknięcie, gasiły go po
 * ułamku sekundy (BŁYSK ikony). W obu przypadkach nie da się trafić palcem
 * w coś, co jest niewidoczne. Fix: znaczek usuwania jest zawsze widoczny —
 * identyczny myszą i dotykiem, żadnej symulacji hover do naprawiania.
 */
vi.mock('../firebase/upload', () => ({ uploadImage: vi.fn() }));

import { ImageUpload } from './ImageUpload';

describe('ImageUpload — usuwanie miniatury bez zależności od hover', () => {
  it('przycisk usuwania jest zawsze widoczny, nie tylko po najechaniu myszą', () => {
    render(
      <ToastProvider>
        <ImageUpload
          value={['https://example.com/zrzut.png']}
          onChange={vi.fn()}
          folder="reports"
          max={5}
          namePrefix="report-test"
        />
      </ToastProvider>,
    );

    const removeButton = screen.getByRole('button', { name: 'Usuń obraz' });
    // Bez fixu: `opacity-0` (niewidoczny, dopóki `group-hover` go nie odkryje —
    // czego dotyk nigdy nie wywoła). Z fixem: żadnej klasy chowającej za hover.
    expect(removeButton.className).not.toMatch(/\bopacity-0\b/);
    expect(removeButton.className).not.toMatch(/group-hover/);
  });

  it('kliknięcie (i dotknięcie — to samo zdarzenie) usuwa obraz bez najeżdżania', () => {
    const onChange = vi.fn();
    render(
      <ToastProvider>
        <ImageUpload
          value={['https://example.com/zrzut.png']}
          onChange={onChange}
          folder="reports"
          max={5}
          namePrefix="report-test"
        />
      </ToastProvider>,
    );

    // Świadomie BEZ pointerEnter/mouseOver — dotyk nigdy by go nie wysłał.
    fireEvent.click(screen.getByRole('button', { name: 'Usuń obraz' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
