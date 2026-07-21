import { useEffect, useRef } from 'react';

/**
 * Przeniesienie uwagi na nagłówek nowego ekranu.
 *
 * Gra podmienia całe poddrzewo przy każdej zmianie ekranu, więc focus wraca
 * na `<body>`: osoba korzystająca z czytnika ekranu nie dowiaduje się, że
 * cokolwiek się stało — kliknęła „Odkryj problem" i zapadła cisza.
 *
 * Zwrócony `ref` trzeba wpiąć w nagłówek ekranu. `tabIndex={-1}` dokłada się
 * automatycznie: element ma przyjąć focus programowo, ale nie może wchodzić
 * do kolejki tabulatora, bo nagłówek nie jest kontrolką.
 */
export function useScreenTitle<T extends HTMLElement = HTMLHeadingElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Bez `tabIndex` przeglądarka odmówi focusu na nagłówku.
    if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');

    // `preventScroll`: przeniesienie uwagi nie ma przewijać strony, bo ekran
    // i tak zaczyna się od góry, a skok wyglądałby jak usterka.
    element.focus({ preventScroll: true });
  }, []);

  return ref;
}
