import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Synchronizacja zakładki, pod-zakładki i parametrów z adresem URL.
 *
 * Bez tego panel miał jeden adres `/admin` na wszystko — nie dało się wysłać
 * komuś linku wprost do konkretnej rzeczy ani wrócić strzałką przeglądarki.
 * Teraz adres opisuje dokładnie, gdzie się jest:
 *
 *   /admin/story            → zakładka „Wstęp i ETER11", pod-zakładka domyślna
 *   /admin/story/adults     → ta sama zakładka, pod-zakładka „Dla dorosłych"
 *   /admin/cards?filter=hejt→ zakładka „Karty" z wpisaną frazą filtra
 *
 * Zakładka i pod-zakładka to segmenty ścieżki (jeden zestaw nazw, bez osobnej
 * mapy). Parametry to zwykły query string — nie mylą się ze ścieżką, łatwo
 * dołożyć kolejny i wartość może mieć dowolne znaki (po zakodowaniu).
 *
 * Hook jest źródłem prawdy dla adresu: zakładki czytają `sub`/`params` stąd
 * i przez `setSub`/`setParams` zapisują je do URL, zamiast trzymać własny
 * stan, którego nie dałoby się zalinkować.
 *
 * @param tab    aktywna zakładka
 * @param setTab ustawia zakładkę (wołane przy „wstecz" i wejściu z adresu)
 * @param isValid czy dany slug jest znaną, dozwoloną zakładką
 */
export interface TabRoute<T extends string = string> {
  /** Drugi segment ścieżki (pod-zakładka), np. `adults`. Pusty = brak. */
  sub: string | null;
  /** Ustawia pod-zakładkę w adresie. `null` ją usuwa. */
  setSub: (sub: string | null) => void;
  /** Parametry z query stringa, np. `{ filter: 'hejt' }`. */
  params: Record<string, string>;
  /** Ustawia jeden parametr. Pusta wartość albo `null` usuwa go z adresu. */
  setParam: (key: string, value: string | null) => void;
  /**
   * Skok do zakładki wraz z jej pod-stanem, jednym ruchem.
   *
   * Samo `setTab` czyści pod-zakładkę i filtr (bo zwykle chcemy świeżą
   * zakładkę). Ale wyszukiwarka celowo skacze do „karty + fraza" albo
   * „wstęp + dla dorosłych" — gdyby robiła to `setTab` plus osobny `setSub`,
   * czyszczenie przy zmianie zakładki skasowałoby właśnie ustawiony pod-stan.
   * `navigate` przekazuje pod-stan przez ten sam cykl, więc przetrwa.
   */
  navigate: (tab: T, sub: string | null, params?: Record<string, string>) => void;
}

/** Czyta bieżący adres na segmenty i parametry. */
function readLocation(): { tab: string; sub: string | null; params: Record<string, string> } {
  const path = window.location.pathname.replace(/^\/admin\/?/, '');
  const [tab = '', sub] = path.split('/');
  const params: Record<string, string> = {};
  new URLSearchParams(window.location.search).forEach((value, key) => {
    params[key] = value;
  });
  return { tab, sub: sub || null, params };
}

export function useTabRoute<T extends string>(
  tab: T,
  setTab: (tab: T) => void,
  isValid: (value: string) => value is T,
): TabRoute<T> {
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

  // Pod-zakładka i parametry czytane z adresu. Trzymamy je też w stanie, żeby
  // zmiana adresu przez „wstecz"/„naprzód" odświeżała widok.
  const [sub, setSubState] = useState<string | null>(() => readLocation().sub);
  const [params, setParamsState] = useState<Record<string, string>>(() => readLocation().params);

  // Gdy tab zmienia się DLATEGO, że wyrównaliśmy go z adresu (start, „wstecz"),
  // to nie jest akcja użytkownika i pod-stan z URL ma zostać. Bez tej flagi
  // skok tab overview→story (wymuszony adresem `/admin/story/adults`) wyglądał
  // dla efektu „tab → adres" jak zmiana zakładki i kasował `adults`.
  const syncingFromUrl = useRef(false);

  // Adres → zakładka/pod-zakładka/parametry: na pierwszym renderze i przy
  // „wstecz"/„naprzód".
  useEffect(() => {
    const apply = () => {
      const loc = readLocation();
      if (loc.tab && isValidRef.current(loc.tab)) {
        syncingFromUrl.current = true;
        setTabRef.current(loc.tab);
      }
      setSubState(loc.sub);
      setParamsState(loc.params);
    };

    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
  }, []);

  // Pod-stan przekazany razem ze skokiem do zakładki (patrz `navigate`).
  // Zużywany raz, w efekcie zmiany zakładki — inaczej czyszczenie zakładki
  // skasowałoby go, zanim ktokolwiek zdąży go zobaczyć.
  const pending = useRef<{ sub: string | null; params: Record<string, string> } | null>(null);

  // Zakładka → adres. Zmiana zakładki czyści pod-zakładkę i parametry: idą
  // z poprzedniej zakładki i nie miałyby sensu w nowej (filtr kart w zasadach) —
  // chyba że skok jawnie przyniósł pod-stan przez `navigate`.
  const first = useRef(true);
  const prevTab = useRef(tab);
  useEffect(() => {
    // Zmiana zakładki wymuszona adresem (start, „wstecz") nie liczy się jako
    // akcja użytkownika — pod-stan z URL ma zostać. Inaczej wejście na
    // `/admin/story/adults` kasowało `adults` (tab skakał overview→story, co
    // wyglądało jak zmiana i czyściło pod-stan).
    //
    // Flagę zużywamy DOPIERO gdy tab naprawdę się zmienił — inaczej przebieg
    // efektu na montażu (tab jeszcze domyślny) skasowałby ją, zanim dojdzie
    // rerender od `setTab` z adresu, i ten rerender wyczyściłby pod-stan.
    const realChange = prevTab.current !== tab;
    prevTab.current = tab;
    const fromUrl = syncingFromUrl.current;
    if (realChange) syncingFromUrl.current = false;
    const tabChanged = realChange && !fromUrl;

    // Adres składamy z aktualnego stanu ścieżki i parametrów. Przy zmianie
    // zakładki zerujemy pod-zakładkę i query — chyba że `navigate` zostawił
    // jawny pod-stan do zastosowania w tej nowej zakładce.
    const carried = pending.current;
    pending.current = null;
    const nextSub = tabChanged ? (carried?.sub ?? null) : sub;
    const nextParams = tabChanged ? (carried?.params ?? {}) : params;
    if (tabChanged) {
      setSubState(nextSub);
      setParamsState(nextParams);
    }

    const query = new URLSearchParams(nextParams).toString();
    const target = `/admin/${tab}${nextSub ? `/${nextSub}` : ''}${query ? `?${query}` : ''}`;
    const currentFull = window.location.pathname + window.location.search;
    if (currentFull === target) {
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
    // `sub`/`params` celowo poza zależnościami: ich własne settery (poniżej)
    // same aktualizują adres. Ten efekt reaguje tylko na zmianę zakładki,
    // inaczej zapis parametru przez setParam odpalałby go podwójnie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /** Przepisuje adres bez zmiany wpisu w historii — dla pod-stanu zakładki. */
  const writeLocation = useCallback(
    (nextSub: string | null, nextParams: Record<string, string>) => {
      const query = new URLSearchParams(nextParams).toString();
      const target = `/admin/${tab}${nextSub ? `/${nextSub}` : ''}${query ? `?${query}` : ''}`;
      const currentFull = window.location.pathname + window.location.search;
      // pushState, nie replaceState: „wstecz" ma cofnąć zmianę pod-zakładki
      // czy filtra, a nie wychodzić od razu z zakładki.
      if (currentFull !== target) window.history.pushState(null, '', target);
    },
    [tab],
  );

  const setSub = useCallback(
    (next: string | null) => {
      setSubState(next);
      writeLocation(next, params);
    },
    [params, writeLocation],
  );

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setParamsState((current) => {
        const next = { ...current };
        if (value) next[key] = value;
        else delete next[key];
        writeLocation(sub, next);
        return next;
      });
    },
    [sub, writeLocation],
  );

  const navigate = useCallback(
    (nextTab: T, nextSub: string | null, nextParams: Record<string, string> = {}) => {
      // Zapamiętujemy pod-stan; efekt zmiany zakładki zastosuje go zamiast
      // czyścić. Gdy zakładka się NIE zmienia (skok w obrębie tej samej),
      // efekt nie odpali — wtedy piszemy adres sami.
      if (nextTab === tab) {
        setSubState(nextSub);
        setParamsState(nextParams);
        writeLocation(nextSub, nextParams);
      } else {
        pending.current = { sub: nextSub, params: nextParams };
        setTabRef.current(nextTab);
      }
    },
    [tab, writeLocation],
  );

  return { sub, setSub, params, setParam, navigate };
}
