import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useCardDrag } from './useCardDrag';

/**
 * Drugi palec na tablecie nie może przejąć ani zabić trwającego przeciągania.
 *
 * Gra chodzi głównie na tabletach dzieci, gdzie przypadkowy drugi dotyk jest
 * codziennością. Gest śledzimy na oknie, a nasłuch łapał zdarzenia KAŻDEGO
 * wskaźnika — więc drugi `pointerdown`/`pointerup` potrafił podmienić kartę
 * pod ręką pierwszego palca (upuszczenie złej karty) albo wywołać `reset`
 * i zgasić ducha w połowie gestu. Gest musi należeć do palca, który go zaczął.
 */

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'touch';
  }
}

let targetAt: HTMLElement | null = null;

beforeEach(() => {
  targetAt = null;
  window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  document.elementFromPoint = () => targetAt;
});

function fire(
  target: EventTarget,
  type: string,
  init: PointerEventInit & { clientX?: number; clientY?: number },
) {
  act(() => {
    target.dispatchEvent(new TestPointerEvent(type, { bubbles: true, ...init }));
  });
}

function MultiHarness({ onDrop }: { onDrop: (targetId: string, data: { id: string }) => void }) {
  const { drag, dragHandlers, dropTargetProps, registerDrop } = useCardDrag<{ id: string }>();
  registerDrop(onDrop);
  return (
    <>
      <button data-testid="card1" {...dragHandlers({ data: { id: 'c1' }, label: 'C1' })}>C1</button>
      <button data-testid="card2" {...dragHandlers({ data: { id: 'c2' }, label: 'C2' })}>C2</button>
      <div {...dropTargetProps('slot-x')} data-testid="slot">slot</div>
      <span data-testid="stan">{drag ? 'przeciąga' : 'spoczywa'}</span>
    </>
  );
}

describe('useCardDrag — multi-touch', () => {
  it('drugi palec nie podmienia przeciąganej karty (upuszcza właściwą)', () => {
    const onDrop = vi.fn();
    render(<MultiHarness onDrop={onDrop} />);
    const card1 = screen.getByTestId('card1');
    const card2 = screen.getByTestId('card2');
    const slot = screen.getByTestId('slot');

    // Palec 1 chwyta kartę 1 i rusza ponad próg — przeciąga c1.
    fire(card1, 'pointerdown', { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
    fire(window, 'pointermove', { clientX: 130, clientY: 100, pointerId: 1 });

    // Palec 2 dotyka karty 2 w trakcie gestu palca 1.
    fire(card2, 'pointerdown', { clientX: 250, clientY: 250, button: 0, pointerId: 2 });

    // Palec 1 dociąga nad ściankę i puszcza.
    targetAt = slot;
    fire(window, 'pointermove', { clientX: 150, clientY: 150, pointerId: 1 });
    fire(window, 'pointerup', { clientX: 150, clientY: 150, pointerId: 1 });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith('slot-x', { id: 'c1' });
  });

  it('puszczenie drugiego palca nie przerywa przeciągania pierwszego', () => {
    const onDrop = vi.fn();
    render(<MultiHarness onDrop={onDrop} />);
    const card1 = screen.getByTestId('card1');
    const card2 = screen.getByTestId('card2');

    fire(card1, 'pointerdown', { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
    fire(window, 'pointermove', { clientX: 130, clientY: 100, pointerId: 1 });
    expect(screen.getByTestId('stan').textContent).toBe('przeciąga');

    // Drugi palec: krótkie dotknięcie i puszczenie gdzie indziej.
    fire(card2, 'pointerdown', { clientX: 250, clientY: 250, button: 0, pointerId: 2 });
    fire(window, 'pointerup', { clientX: 250, clientY: 250, pointerId: 2 });

    // Gest palca 1 wciąż żyje.
    expect(screen.getByTestId('stan').textContent).toBe('przeciąga');
  });
});
