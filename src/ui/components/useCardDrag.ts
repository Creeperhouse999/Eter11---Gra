import type { MutableRefObject } from 'react';
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
  /**
   * Identyfikator celu pod kursorem, ustawiany przez strefy upuszczenia.
   *
   * Bez współrzędnych: te zmieniają się przy każdym ruchu palca i trafiają
   * prosto do stylu ducha (`ghostRef`). W stanie siedzi wyłącznie to, co
   * realnie zmienia wygląd planszy.
   */
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
  /**
   * Bieżąca pozycja palca.
   *
   * Celowo w ref, a nie w stanie: `pointermove` sypie zdarzeniami ~120 razy
   * na sekundę, a jedynym elementem, który zna te współrzędne, jest duch
   * karty. Trzymanie ich w stanie przerysowywało przy każdym pikselu całą
   * planszę — kilkaset elementów — żeby przesunąć jeden element.
   * `ghostRef` zapisuje pozycję prosto do stylu, z pominięciem Reacta.
   */
  const point = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const ghostRef: MutableRefObject<HTMLElement | null> = useRef<HTMLElement | null>(null);
  const pending = useRef<DragPayload<T> | null>(null);
  /** Czy próg został przekroczony. W ref, bo czytamy go w tym samym zdarzeniu. */
  const active = useRef(false);
  /**
   * Wskaźnik, który zaczął gest. Gest należy tylko do niego.
   *
   * Gra chodzi głównie na tabletach dzieci — drugi palec w trakcie
   * przeciągania jest normą. Bez tego identyfikatora nasłuch na oknie reagował
   * na KAŻDY wskaźnik: drugi `pointerdown` podmieniał kartę pod ręką pierwszego
   * palca (upuszczenie złej karty), a drugi `pointerup` wołał `reset` i gasił
   * ducha w połowie gestu. `null` = żaden gest nie trwa.
   */
  const activePointerId = useRef<number | null>(null);
  const dropHandler = useRef<((targetId: string, data: T) => void) | null>(null);

  /**
   * Podpięcie funkcji wykonującej upuszczenie.
   *
   * Wywoływane w trakcie renderu wywołującego, więc handler trafia najpierw
   * do pola tymczasowego, a do `dropHandler` dopiero po zatwierdzeniu renderu.
   * React 18 potrafi porzucić rozpoczęty render — bez tego kroku porzucona
   * wersja zostawiłaby handler domknięty na stanie, który nigdy nie wszedł
   * w życie, i upuszczenie karty zadziałałoby na nieaktualnych danych.
   */
  const nextHandler = useRef<((targetId: string, data: T) => void) | null>(null);

  const registerDrop = useCallback((handler: (targetId: string, data: T) => void) => {
    nextHandler.current = handler;
  }, []);

  useEffect(() => {
    dropHandler.current = nextHandler.current;
  });

  const findTarget = (x: number, y: number): string | null => {
    const element = document.elementFromPoint(x, y);
    return element?.closest<HTMLElement>('[data-drop-target]')?.dataset.dropTarget ?? null;
  };

  /** Sprząta stan gestu. Wywoływane przy każdym zakończeniu, także awaryjnym. */
  const reset = useCallback(() => {
    startPoint.current = null;
    pending.current = null;
    active.current = false;
    activePointerId.current = null;
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
      // Tylko wskaźnik, który zaczął gest — drugi palec nie rusza ducha.
      if (event.pointerId !== activePointerId.current) return;
      if (!startPoint.current || !pending.current) return;

      const dx = event.clientX - startPoint.current.x;
      const dy = event.clientY - startPoint.current.y;

      if (!active.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      active.current = true;

      point.current = { x: event.clientX, y: event.clientY };
      // Ruch ducha z pominięciem renderu — to zwykłe przesunięcie warstwy.
      if (ghostRef.current) {
        ghostRef.current.style.left = `${event.clientX}px`;
        ghostRef.current.style.top = `${event.clientY}px`;
      }

      const overId = findTarget(event.clientX, event.clientY);
      // Render tylko przy wejściu nad inną ściankę: to zmienia wygląd
      // (obramowanie, podświetlenie strefy), a zdarza się kilka razy na gest,
      // nie kilkaset.
      setDrag((prev) => {
        if (!pending.current) return prev;
        if (prev && prev.overId === overId) return prev;
        return { payload: pending.current, overId };
      });
    };

    const onUp = (event: PointerEvent) => {
      // Puszczenie innego palca nie kończy cudzego gestu.
      if (event.pointerId !== activePointerId.current) return;
      const wasDragging = active.current;
      const payloadData = pending.current?.data;
      reset();

      if (!wasDragging || payloadData === undefined) return;

      // Upuszczenie liczy się tylko nad strefą; poza nią karta wraca na rękę.
      const targetId = findTarget(event.clientX, event.clientY);
      if (targetId) dropHandler.current?.(targetId, payloadData);
    };

    // System przejął gest (np. gest krawędziowy) — ale tylko dla wskaźnika,
    // który go prowadził; anulowanie drugiego palca nie ma nic przerywać.
    const onCancel = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current) return;
      reset();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    // Utrata fokusu okna kończy gest: przeglądarka przestanie wtedy
    // wysyłać zdarzenia wskaźnika, a duch zostałby wiszący.
    window.addEventListener('blur', reset);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
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
        // Gest już trwa (pierwszy palec) — drugi dotyk go nie przejmuje.
        if (activePointerId.current !== null) return;

        activePointerId.current = event.pointerId;
        startPoint.current = { x: event.clientX, y: event.clientY };
        // Duch pojawia się dopiero po przekroczeniu progu, ale ma wtedy stanąć
        // na palcu, a nie w rogu ekranu — pierwszy `pointermove` może przyjść
        // po renderze.
        point.current = { x: event.clientX, y: event.clientY };
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
    /**
     * Podpięcie ducha karty. Ruch zapisujemy prosto do jego stylu, więc
     * przesunięcie palca nie przerysowuje planszy.
     */
    ghostRef,
    /** Pozycja startowa — duch musi stanąć na palcu jeszcze przed ruchem. */
    startPoint: point,
    isDragging: drag !== null,
  };
}
