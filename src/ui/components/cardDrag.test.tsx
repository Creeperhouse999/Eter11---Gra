import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useCardDrag } from './useCardDrag';
import { CardView } from './CardView';
import type { Card } from '../../engine/types';

const card: Card = {
  id: 'c1',
  name: 'Odwaga',
  category: 'talent',
  family: 'red',
  description: 'Działa mimo strachu.',
  icon: 'lion',
};

/**
 * jsdom nie implementuje PointerEvent ani przechwytywania wskaźnika.
 * Bez własnej klasy `fireEvent.pointerDown` tworzy goły Event, w którym
 * `button` i `clientX` są nieokreślone, więc żaden gest by nie zadziałał.
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

let targetAt: HTMLElement | null = null;

beforeEach(() => {
  targetAt = null;
  window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  document.elementFromPoint = () => targetAt;
});

function Harness({ onDrop }: { onDrop: (targetId: string, data: { id: string }) => void }) {
  const { drag, dragHandlers, dropTargetProps, registerDrop } = useCardDrag<{ id: string }>();
  registerDrop(onDrop);

  return (
    <>
      <CardView
        card={card}
        dragHandlers={dragHandlers({ data: { id: card.id }, label: card.name })}
        beingDragged={drag !== null}
      />
      <div {...dropTargetProps('prob-1:talent')} data-testid="slot">
        Ścianka
      </div>
      <span data-testid="stan">{drag ? 'przeciąga' : 'spoczywa'}</span>
      <span data-testid="nad">{drag?.overId ?? '—'}</span>
    </>
  );
}

const fire = (
  target: EventTarget,
  type: string,
  init: PointerEventInit & { clientX?: number; clientY?: number },
) =>
  act(() => {
    target.dispatchEvent(
      new TestPointerEvent(type, { bubbles: true, pointerId: 1, ...init }),
    );
  });

const grab = (element: HTMLElement, x = 0, y = 0, extra: PointerEventInit = {}) =>
  fire(element, 'pointerdown', { clientX: x, clientY: y, button: 0, ...extra });

/** Ruch i puszczenie idą do okna — tam żyje nasłuch po rozpoczęciu gestu. */
const move = (_element: HTMLElement, x: number, y: number) =>
  fire(window, 'pointermove', { clientX: x, clientY: y });

const release = (_element: HTMLElement, x: number, y: number) =>
  fire(window, 'pointerup', { clientX: x, clientY: y });

describe('useCardDrag', () => {
  it('krótki ruch nie zaczyna przeciągania', () => {
    render(<Harness onDrop={vi.fn()} />);
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });

    grab(cardEl, 100, 100);
    move(cardEl, 103, 102); // poniżej progu 8 px

    expect(screen.getByTestId('stan').textContent).toBe('spoczywa');
  });

  it('ruch powyżej progu zaczyna przeciąganie', () => {
    render(<Harness onDrop={vi.fn()} />);
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });

    grab(cardEl, 100, 100);
    move(cardEl, 130, 100);

    expect(screen.getByTestId('stan').textContent).toBe('przeciąga');
  });

  it('upuszczenie nad ścianką wywołuje akcję z jej identyfikatorem', () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });

    targetAt = screen.getByTestId('slot');
    grab(cardEl, 100, 100);
    move(cardEl, 200, 200);
    release(cardEl, 200, 200);

    expect(onDrop).toHaveBeenCalledWith('prob-1:talent', { id: 'c1' });
  });

  it('upuszczenie poza ścianką nie zagrywa karty', () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });

    targetAt = null;
    grab(cardEl, 100, 100);
    move(cardEl, 200, 200);
    release(cardEl, 200, 200);

    expect(onDrop).not.toHaveBeenCalled();
  });

  it('kliknięcie bez ruchu nie liczy się jako upuszczenie', () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });

    targetAt = screen.getByTestId('slot');
    grab(cardEl, 100, 100);
    release(cardEl, 100, 100);

    expect(onDrop).not.toHaveBeenCalled();
  });

  it('rozpoznaje ściankę pod kursorem podczas ruchu', () => {
    render(<Harness onDrop={vi.fn()} />);
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });

    targetAt = screen.getByTestId('slot');
    grab(cardEl, 100, 100);
    move(cardEl, 200, 200);

    expect(screen.getByTestId('nad').textContent).toBe('prob-1:talent');
  });

  it('przerwanie gestu porzuca przeciąganie', () => {
    render(<Harness onDrop={vi.fn()} />);
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });

    grab(cardEl, 100, 100);
    move(cardEl, 200, 200);
    fire(window, 'pointercancel', {});

    expect(screen.getByTestId('stan').textContent).toBe('spoczywa');
  });

  it('prawy przycisk myszy nie chwyta karty', () => {
    render(<Harness onDrop={vi.fn()} />);
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });

    grab(cardEl, 100, 100, { button: 2, pointerType: 'mouse' });
    move(cardEl, 200, 200);

    expect(screen.getByTestId('stan').textContent).toBe('spoczywa');
  });

  it('dotyk chwyta kartę mimo braku przycisku', () => {
    render(<Harness onDrop={vi.fn()} />);
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });

    grab(cardEl, 100, 100, { pointerType: 'touch' });
    move(cardEl, 200, 200);

    expect(screen.getByTestId('stan').textContent).toBe('przeciąga');
  });
});

describe('CardView z przeciąganiem', () => {
  it('karta przeciągalna blokuje przewijanie dotykiem', () => {
    render(
      <CardView
        card={card}
        dragHandlers={{ onPointerDown: vi.fn() }}
      />,
    );
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });
    expect(cardEl.style.touchAction).toBe('none');
  });

  it('karta bez przeciągania nie blokuje przewijania', () => {
    render(<CardView card={card} onClick={vi.fn()} />);
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });
    expect(cardEl.style.touchAction).toBe('');
  });

  it('pokazuje kategorię nad nazwą karty', () => {
    render(<CardView card={card} />);
    const cardEl = screen.getByRole('button', { name: /Odwaga/ });
    // Kategoria poprzedza nazwę — mówi, do której ścianki karta należy.
    expect(cardEl.textContent?.indexOf('Talent')).toBeLessThan(
      cardEl.textContent?.indexOf('Odwaga') ?? -1,
    );
  });

  it('klik nadal działa obok przeciągania', () => {
    const onClick = vi.fn();
    render(<CardView card={card} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Odwaga/ }));
    expect(onClick).toHaveBeenCalled();
  });
});
