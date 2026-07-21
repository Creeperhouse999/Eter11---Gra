import { beforeAll, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useCardDrag } from './useCardDrag';

/**
 * Zdarzenie wskaźnika w jsdom.
 *
 * `PointerEvent` nie istnieje tam natywnie, a hook czyta `clientX`/`clientY`
 * i `button`, więc wystarczy `MouseEvent` z tymi polami.
 */
function pointer(type: string, x: number, y: number): Event {
  return new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0 });
}

/** Ile razy komponent się przerysował — licznik poza Reactem, bez efektów. */
function Probe({ renders }: { renders: { count: number } }) {
  const { drag, dragHandlers, ghostRef, startPoint } = useCardDrag<string>();
  renders.count += 1;

  return (
    <div>
      <button data-testid="card" {...dragHandlers({ label: 'karta', data: 'card-1' })}>
        karta
      </button>
      {drag && (
        <div
          data-testid="ghost"
          ref={(node) => {
            ghostRef.current = node;
          }}
          style={{ left: startPoint.current.x, top: startPoint.current.y }}
        />
      )}
    </div>
  );
}

describe('useCardDrag', () => {
  // jsdom nie implementuje `elementFromPoint`, a hook szuka nim strefy pod
  // palcem. Tu żadna strefa nie istnieje, więc zwracamy null — to odpowiada
  // przeciąganiu nad pustym tłem, czyli dokładnie temu, co te testy mierzą.
  beforeAll(() => {
    if (!document.elementFromPoint) {
      document.elementFromPoint = () => null;
    }
  });

  it('nie przerysowuje planszy przy każdym ruchu palca', () => {
    const renders = { count: 0 };
    render(<Probe renders={renders} />);

    const card = screen.getByTestId('card');
    act(() => {
      card.dispatchEvent(pointer('pointerdown', 100, 100));
    });

    // Dwa pierwsze ruchy renderują z konieczności: pierwszy przekracza próg
    // i wstawia ducha do drzewa, drugi jest pierwszym, który zastaje już
    // podpięty `ghostRef`. Dalej gest ma iść bez renderów.
    act(() => {
      window.dispatchEvent(pointer('pointermove', 140, 140));
    });
    act(() => {
      window.dispatchEvent(pointer('pointermove', 141, 141));
    });

    const afterFirstMove = renders.count;

    // Kolejne 30 ruchów nad tym samym tłem. Duch ma jechać za palcem,
    // ale plansza nie ma powodu się przerysowywać.
    act(() => {
      for (let i = 0; i < 30; i += 1) {
        window.dispatchEvent(pointer('pointermove', 141 + i, 141 + i));
      }
    });

    expect(renders.count).toBe(afterFirstMove);
  });

  it('przesuwa ducha mimo braku renderu', () => {
    const renders = { count: 0 };
    render(<Probe renders={renders} />);

    const card = screen.getByTestId('card');
    act(() => {
      card.dispatchEvent(pointer('pointerdown', 100, 100));
    });
    act(() => {
      window.dispatchEvent(pointer('pointermove', 140, 140));
    });

    act(() => {
      window.dispatchEvent(pointer('pointermove', 260, 310));
    });

    const ghost = screen.getByTestId('ghost');
    expect(ghost.style.left).toBe('260px');
    expect(ghost.style.top).toBe('310px');
  });

  it('duch staje na palcu, zanim przyjdzie pierwszy ruch', () => {
    const renders = { count: 0 };
    render(<Probe renders={renders} />);

    const card = screen.getByTestId('card');
    act(() => {
      card.dispatchEvent(pointer('pointerdown', 220, 480));
    });
    // Osobny akt: React grupuje zdarzenia w obrębie jednego `act`, a duch ma
    // trafić do drzewa właśnie tym ruchem. Renderuje się z `startPoint`, bo
    // własnego zapisu do stylu jeszcze nie dostał — `ghostRef` podpina się
    // dopiero po tym renderze.
    act(() => {
      window.dispatchEvent(pointer('pointermove', 250, 510));
    });

    const ghost = screen.getByTestId('ghost');
    // Nie 0,0: karta ma wystartować pod palcem, a nie w rogu ekranu.
    expect(ghost.style.left).toBe('250px');
    expect(ghost.style.top).toBe('510px');
  });
});
