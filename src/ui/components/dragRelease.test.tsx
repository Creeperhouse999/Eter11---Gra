import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useState } from 'react';
import { useCardDrag } from './useCardDrag';

/**
 * Regresja: duch zostawał na ekranie po puszczeniu karty.
 *
 * Przyczyną było poleganie na tym, że `pointerup` trafi do elementu karty.
 * Gdy karta zniknie z drzewa w trakcie gestu — a znika, bo po zagraniu
 * wychodzi z ręki — przechwycenie wskaźnika przepada razem z nią
 * i zdarzenie nie dociera nigdzie.
 */

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'mouse';
  }
}

beforeEach(() => {
  window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  document.elementFromPoint = () => null;
});

const fire = (target: EventTarget, type: string, init: PointerEventInit = {}) =>
  act(() => {
    target.dispatchEvent(new TestPointerEvent(type, { bubbles: true, pointerId: 1, ...init }));
  });

/** Karta znika z drzewa po rozpoczęciu przeciągania — jak po zagraniu. */
function VanishingCard() {
  const { drag, dragHandlers } = useCardDrag<{ id: string }>();
  const [visible, setVisible] = useState(true);

  return (
    <>
      {visible && (
        <button
          data-testid="karta"
          {...dragHandlers({ data: { id: 'c1' }, label: 'Karta' })}
        />
      )}
      <button data-testid="usun" onClick={() => setVisible(false)}>
        Usuń kartę
      </button>
      <span data-testid="stan">{drag ? 'przeciąga' : 'spoczywa'}</span>
    </>
  );
}

describe('puszczenie karty', () => {
  it('kończy przeciąganie, nawet gdy karta zniknęła z drzewa', () => {
    render(<VanishingCard />);
    const card = screen.getByTestId('karta');

    fire(card, 'pointerdown', { clientX: 100, clientY: 100, button: 0 });
    fire(card, 'pointermove', { clientX: 200, clientY: 200 });
    expect(screen.getByTestId('stan').textContent).toBe('przeciąga');

    // Karta wypada z drzewa — dokładnie to dzieje się po zagraniu jej na ściankę.
    act(() => {
      screen.getByTestId('usun').click();
    });

    // Gracz puszcza przycisk. Zdarzenie trafia w okno, nie w kartę.
    fire(window, 'pointerup', { clientX: 200, clientY: 200 });

    expect(screen.getByTestId('stan').textContent).toBe('spoczywa');
  });

  it('kończy przeciąganie, gdy wskaźnik puszczono poza oknem', () => {
    render(<VanishingCard />);
    const card = screen.getByTestId('karta');

    fire(card, 'pointerdown', { clientX: 100, clientY: 100, button: 0 });
    fire(card, 'pointermove', { clientX: 200, clientY: 200 });

    // Przeglądarka wysyła pointercancel, gdy gest przejmie system
    // (np. gest cofania na krawędzi ekranu w telefonie).
    fire(window, 'pointercancel', {});

    expect(screen.getByTestId('stan').textContent).toBe('spoczywa');
  });

  it('kończy przeciąganie po utracie fokusu okna', () => {
    render(<VanishingCard />);
    const card = screen.getByTestId('karta');

    fire(card, 'pointerdown', { clientX: 100, clientY: 100, button: 0 });
    fire(card, 'pointermove', { clientX: 200, clientY: 200 });

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    expect(screen.getByTestId('stan').textContent).toBe('spoczywa');
  });
});
