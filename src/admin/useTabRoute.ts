import { useEffect, useRef } from 'react';

/**
 * Synchronizacja zakładki z adresem URL.
 *
 * Bez tego panel miał jeden adres `/admin` na wszystko — nie dało się wysłać
 * komuś linku wprost do dyskusji ani wrócić strzałką przeglądarki do
 * poprzedniej zakładki. Teraz każda zakładka ma własny adres
 * (`/admin/reports`, `/admin/discussions`…), a przycisk wstecz działa.
 *
 * Zakładki są typem zamkniętym, więc slug w adresie to po prostu klucz
 * zakładki — jeden zestaw nazw, bez osobnej mapy do utrzymania.
 *
 * @param tab   aktywna zakładka
 * @param setTab ustawia zakładkę (wywoływane przy „wstecz" i wejściu z adresu)
 * @param isValid czy dany slug jest znaną zakładką
 */
export function useTabRoute<T extends string>(
  tab: T,
  setTab: (tab: T) => void,
  isValid: (value: string) => value is T,
): void {
  // Callbacki w ref, nie w zależnościach efektu.
  //
  // `setTab` i `isValid` są tworzone na nowo przy każdym renderze panelu, więc
  // wpisane w zależności odpalałyby efekt „adres → zakładka" po KAŻDYM
  // renderze. A ten efekt czyta bieżący adres — który przy kliknięciu nowej
  // zakładki jest jeszcze STARY (adres zmienia dopiero drugi efekt). Skutek:
  // kliknięcie zakładki natychmiast cofało się do poprzedniej i panel
  // wyglądał, jakby nie dało się przełączyć zakładki. Ref utrzymuje aktualne
  // funkcje, a efekt biegnie tylko na montowaniu i „wstecz".
  const setTabRef = useRef(setTab);
  const isValidRef = useRef(isValid);
  setTabRef.current = setTab;
  isValidRef.current = isValid;

  // Adres → zakładka: na pierwszym renderze i przy „wstecz"/„naprzód".
  useEffect(() => {
    const apply = () => {
      const slug = window.location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
      if (slug && isValidRef.current(slug)) setTabRef.current(slug);
    };

    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
  }, []);

  // Zakładka → adres. Nowy wpis w historii, żeby „wstecz" wracał do
  // poprzedniej zakładki, a nie wychodził z panelu.
  const first = useRef(true);
  useEffect(() => {
    const target = `/admin/${tab}`;
    if (window.location.pathname === target) {
      first.current = false;
      return;
    }

    // Pierwsze wyrównanie zastępuje adres, nie dopisuje go.
    //
    // Wejście na goły `/admin` ustawia zakładkę „overview" i musi poprawić
    // adres na `/admin/overview`. Gdyby to był `pushState`, „wstecz" wróciłby
    // na `/admin`, co natychmiast znów dopisałoby `/admin/overview` — przycisk
    // wstecz utknąłby w pętli. `replaceState` przy pierwszym wyrównaniu tego
    // nie robi; kolejne przełączenia zakładek dopisują wpisy normalnie.
    if (first.current) {
      window.history.replaceState(null, '', target);
    } else {
      window.history.pushState(null, '', target);
    }
    first.current = false;
  }, [tab]);
}
