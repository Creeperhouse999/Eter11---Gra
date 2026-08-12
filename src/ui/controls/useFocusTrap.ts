import { useEffect, useRef, type RefObject } from 'react';

/**
 * Uwięzienie fokusu w nakładce + oddanie go tam, skąd przyszedł.
 *
 * Każda nakładka otwierana w portalu ląduje na końcu `<body>`, więc dla
 * klawiatury i czytnika ekranu jest OSOBNYM miejscem w dokumencie. Bez
 * uwięzienia Tab z ostatniego elementu wychodzi na tło i nie ma jak wrócić,
 * a po zamknięciu fokus spada na `body`: kolejny Tab startuje od góry całej
 * strony. Osoba pracująca na klawiaturze musi wtedy przetabować cały panel,
 * żeby wrócić do miejsca, w którym była.
 *
 * `Modal` ma tę logikę u siebie od dawna — tutaj jest wyciągnięta osobno,
 * żeby pozostałe nakładki (wybór ikony, powiększenie obrazka, kolor, dzwonek)
 * nie musiały jej przepisywać.
 *
 * @param open czy nakładka jest widoczna
 * @param panelRef element nakładki — z niego bierzemy elementy do fokusu
 * @param onClose wołane na Escape
 * @param autoFocus czy ustawić fokus w środku przy otwarciu (domyślnie tak;
 *   `false`, gdy nakładka sama ustawia fokus, np. na polu szukania)
 */
export function useFocusTrap(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  autoFocus = true,
): void {
  // Nakładki podają `onClose` jako świeżą funkcję przy każdym renderze.
  // W referencji zamiast w zależnościach: nasłuch zakładamy raz, a i tak
  // wołamy zawsze aktualną wersję.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;

    if (autoFocus) {
      const panel = panelRef.current;
      const field = panel?.querySelector<HTMLElement>('input, select, textarea');
      if (field) field.focus();
      else panel?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea',
      );
      if (!focusable || focusable.length === 0) return;

      const list = Array.from(focusable);
      const firstEl = list[0];
      const lastEl = list[list.length - 1];

      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Fokus wraca na przycisk, który nakładkę otworzył — inaczej po
      // zamknięciu kolejny Tab zaczyna od początku strony.
      previous?.focus();
    };
  }, [open, autoFocus]);
}
