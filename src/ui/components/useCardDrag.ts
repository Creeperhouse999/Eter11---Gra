import { useCallback, useEffect, useRef, useState } from 'react';

/** Odległość w pikselach, po której ruch palca liczy się jako przeciąganie. */
const DRAG_THRESHOLD = 8;

export interface DragPayload<T> {
  data: T;
  /** Nazwa karty — pokazywana w duchu podczas przeciągania. */
  label: string;
}

interface DragState<T> {
  payload: DragPayload<T>;
  x: number;
  y: number;
  /** Identyfikator celu pod kursorem, ustawiany przez strefy upuszczenia. */
  overId: string | null;
}

/**
 * Przeciąganie kart — mysz, rysik i dotyk jednym kodem.
 *
 * Pointer Events obsługują wszystkie te wejścia bez rozgałęzień, a
 * `setPointerCapture` sprawia, że karta nie gubi gestu, gdy kursor wyjdzie
 * poza jej obszar.
 *
 * Przeciąganie zaczyna się dopiero po przesunięciu o `DRAG_THRESHOLD` —
 * bez tego progu przewijanie listy kart palcem podnosiłoby kartę
 * przy każdym dotknięciu.
 *
 * Cel upuszczenia wyszukiwany jest przez `elementFromPoint`, a nie przez
 * zdarzenia `pointerenter` na strefach: przy dotyku zdarzenia trafiają
 * wyłącznie do elementu, który przechwycił wskaźnik.
 */
export function useCardDrag<T>() {
  const [drag, setDrag] = useState<DragState<T> | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const pending = useRef<DragPayload<T> | null>(null);
  /** Czy próg został przekroczony. W ref, bo czytamy go w tym samym zdarzeniu. */
  const active = useRef(false);
  const dropHandler = useRef<((targetId: string, data: T) => void) | null>(null);

  const registerDrop = useCallback((handler: (targetId: string, data: T) => void) => {
    dropHandler.current = handler;
  }, []);

  const findTarget = (x: number, y: number): string | null => {
    const element = document.elementFromPoint(x, y);
    return element?.closest<HTMLElement>('[data-drop-target]')?.dataset.dropTarget ?? null;
  };

  /** Podpinane do karty: rozpoczyna śledzenie wskaźnika. */
  const dragHandlers = useCallback(
    (payload: DragPayload<T>) => ({
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        // Wyłącznie główny przycisk. Dotyk i rysik też raportują button 0.
        // Sprawdzamy przez `> 0`, bo część środowisk nie ustawia tego pola
        // wcale — brak wartości traktujemy jak główny przycisk.
        if (event.button > 0) return;
        startPoint.current = { x: event.clientX, y: event.clientY };
        pending.current = payload;
        active.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      },

      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        if (!startPoint.current || !pending.current) return;

        const dx = event.clientX - startPoint.current.x;
        const dy = event.clientY - startPoint.current.y;

        // Próg liczony przez ref, nie przez stan: `drag` w domknięciu jest
        // nieaktualny do czasu ponownego renderu, więc pierwszy drobny ruch
        // podnosiłby kartę mimo progu.
        if (!active.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        active.current = true;

        setDrag({
          payload: pending.current,
          x: event.clientX,
          y: event.clientY,
          overId: findTarget(event.clientX, event.clientY),
        });
      },

      onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
        const wasDragging = active.current;
        const payloadData = pending.current?.data;

        startPoint.current = null;
        pending.current = null;
        active.current = false;
        setDrag(null);

        if (!wasDragging || payloadData === undefined) return;

        // Upuszczenie liczy się tylko nad strefą; poza nią karta wraca na rękę.
        const targetId = findTarget(event.clientX, event.clientY);
        if (targetId) dropHandler.current?.(targetId, payloadData);
      },

      onPointerCancel: () => {
        startPoint.current = null;
        pending.current = null;
        active.current = false;
        setDrag(null);
      },
    }),
    [],
  );

  /** Podpinane do strefy upuszczenia. */
  const dropTargetProps = useCallback(
    (targetId: string) => ({
      'data-drop-target': targetId,
      'data-drag-over': drag?.overId === targetId ? 'true' : undefined,
    }),
    [drag?.overId],
  );

  // Przeciąganie blokuje zaznaczanie tekstu — bez tego dotyk zaznacza opisy kart.
  useEffect(() => {
    if (!drag) return;
    const previous = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.userSelect = previous;
    };
  }, [drag]);

  return {
    /** Aktywne przeciąganie albo null. */
    drag,
    dragHandlers,
    dropTargetProps,
    registerDrop,
    isDragging: drag !== null,
  };
}
