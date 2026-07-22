import { useEffect } from 'react';

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
 * @param setTab ustawia zakładkę (wywoływane przy wejściu z adresu i wstecz)
 * @param isValid czy dany slug jest znaną zakładką
 */
export function useTabRoute<T extends string>(
  tab: T,
  setTab: (tab: T) => void,
  isValid: (value: string) => value is T,
): void {
  // Adres → zakładka. Przy pierwszym renderze i przy „wstecz"/„naprzód".
  useEffect(() => {
    const apply = () => {
      const slug = window.location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
      if (slug && isValid(slug) && slug !== tab) setTab(slug);
    };

    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
    // Celowo bez `tab`: ten efekt reaguje na zmianę ADRESU, nie zakładki.
    // Zależność od `tab` odpalałaby go przy każdym przełączeniu i nadpisywała
    // wpis w historii, który dopisuje efekt niżej.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTab, isValid]);

  // Zakładka → adres. Nowy wpis w historii, żeby „wstecz" wracał do
  // poprzedniej zakładki, a nie wychodził z panelu.
  useEffect(() => {
    const target = `/admin/${tab}`;
    if (window.location.pathname !== target) {
      window.history.pushState(null, '', target);
    }
  }, [tab]);
}
