import { useCallback, useEffect, useRef } from 'react';

/** Ile trzeba trzymać, żeby to było przytrzymanie, a nie kliknięcie. */
const HOLD_MS = 400;

/**
 * O ile palec może się przesunąć, zanim uznamy, że to przeciąganie.
 *
 * Odrobinę mniej niż próg przeciągania (8 px), żeby gest przeciągnięcia
 * nigdy nie odpalił jednocześnie powiększenia.
 */
const MOVE_TOLERANCE = 6;

/**
 * Przytrzymanie elementu — bez psucia kliknięcia i przeciągania.
 *
 * Karta reaguje już na kliknięcie (wybór) i podwójne kliknięcie (zagranie),
 * a do tego bywa przeciągana. Przytrzymanie jest jedynym wolnym gestem, ale
 * dzieli początek ze wszystkimi pozostałymi — dlatego odliczanie przerywa
 * zarówno puszczenie palca, jak i jego ruch.
 *
 * Zwracane właściwości dokładają się do istniejących: wywołujący scala je
 * z uchwytami przeciągania, zamiast je zastępować.
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }, []);

  // Odliczanie nie może przeżyć zniknięcia karty — zagrana karta wypada
  // z drzewa w trakcie gestu, a powiększenie otworzyłoby się na czymś,
  // czego już nie ma na stole.
  useEffect(() => cancel, [cancel]);

  return {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      // Tylko główny przycisk; dotyk i rysik też raportują 0.
      if (event.button > 0) return;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        onLongPress();
      }, HOLD_MS);
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      const start = origin.current;
      if (!start) return;
      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved > MOVE_TOLERANCE) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    // Menu kontekstowe przeglądarki wchodzi na telefonie dokładnie w tym
    // samym geście i przykryłoby powiększenie własnym.
    onContextMenu: (event: React.MouseEvent<HTMLElement>) => event.preventDefault(),
  };
}
