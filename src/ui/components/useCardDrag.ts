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
 * Karta **rozpoczyna** gest, ale dalsze śledzenie odbywa się na oknie.
 * To rozróżnienie jest kluczowe: zagrana karta znika z ręki, więc jej element
 * wypada z drzewa w trakcie gestu. Gdyby `pointerup` wisiał na karcie,
 * zdarzenie nie miałoby gdzie trafić i duch zostawałby na ekranie na zawsze.
 * Okno jest zawsze na miejscu, więc gest zawsze da się domknąć.
 *
 * Z tego samego powodu obsługujemy `pointercancel` (system przejął gest,
 * np. gestem cofania na krawędzi ekranu) i utratę fokusu okna.
 *
 * Przeciąganie zaczyna się dopiero po przesunięciu o `DRAG_THRESHOLD` —
 * bez tego progu przewijanie listy kart palcem podnosiłoby kartę
 * przy każdym dotknięciu.
 *
 * Cel upuszczenia wyszukiwany jest przez `elementFromPoint`, a nie przez
 * zdarzenia `pointerenter` na strefach: przy dotyku zdarzenia trafiają
 * wyłącznie do elementu, w którym gest się zaczął.
 */
export function useCardDrag<T>() {
  const [drag, setDrag] = useState<DragState<T> | null>(null);
  /** Wskaźnik wciśnięty — nasłuch na oknie ma być aktywny. */
  const [tracking, setTracking] = useState(false);

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

  /** Sprząta stan gestu. Wywoływane przy każdym zakończeniu, także awaryjnym. */
  const reset = useCallback(() => {
    startPoint.current = null;
    pending.current = null;
    active.current = false;
    setDrag(null);
    setTracking(false);
  }, []);

  /**
   * Nasłuch na oknie żyje tylko w trakcie gestu.
   * Rejestrowany dopiero po wciśnięciu, więc poza przeciąganiem nie
   * kosztuje nic.
   */
  useEffect(() => {
    if (!tracking) return;

    const onMove = (event: PointerEvent) => {
      if (!startPoint.current || !pending.current) return;

      const dx = event.clientX - startPoint.current.x;
      const dy = event.clientY - startPoint.current.y;

      if (!active.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      active.current = true;

      setDrag({
        payload: pending.current,
        x: event.clientX,
        y: event.clientY,
        overId: findTarget(event.clientX, event.clientY),
      });
    };

    const onUp = (event: PointerEvent) => {
      const wasDragging = active.current;
      const payloadData = pending.current?.data;
      reset();

      if (!wasDragging || payloadData === undefined) return;

      // Upuszczenie liczy się tylko nad strefą; poza nią karta wraca na rękę.
      const targetId = findTarget(event.clientX, event.clientY);
      if (targetId) dropHandler.current?.(targetId, payloadData);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', reset);
    // Utrata fokusu okna kończy gest: przeglądarka przestanie wtedy
    // wysyłać zdarzenia wskaźnika, a duch zostałby wiszący.
    window.addEventListener('blur', reset);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', reset);
      window.removeEventListener('blur', reset);
    };
  }, [tracking, reset]);

  /** Podpinane do karty: rozpoczyna gest. Resztą zajmuje się okno. */
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

        setTracking(true);
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
