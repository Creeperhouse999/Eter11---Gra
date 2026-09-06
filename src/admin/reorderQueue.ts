import type { Report } from '../firebase/reports';

/**
 * Ręczna kolejność zgłoszeń w kolejce.
 *
 * Adam: „zrób, abym mógł zarówno »w kolejce«, jak i »lista kolejnych zadań«
 * zmieniać kolejność, przesuwając dane ramki w górę i w dół". Automatyczna
 * kolejność (pilność, potem wiek) jest dobrym domysłem, ale to zespół wie,
 * że akurat ta jedna rzecz jest teraz ważniejsza — a dotąd jedynym sposobem
 * powiedzenia tego było podbicie pilności, czyli kłamstwo o tym, jak bardzo
 * coś płonie.
 *
 * `queueRank` to liczba porządkowa. Zgłoszenia, które jej nie mają, idą po
 * tych z rangą, w swojej zwykłej kolejności — dzięki temu ręczne ustawienie
 * kilku pozycji na górze nie wymaga ponumerowania całej listy.
 */

/** Pozycja w porządku ręcznym; brak rangi = na koniec ręcznej części. */
function ranga(report: Pick<Report, 'queueRank'>): number {
  return report.queueRank ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Układa listę wg rangi ręcznej, a przy jej braku zostawia kolejność wejściową.
 *
 * Kolejność wejściowa jest już posortowana automatycznie (pilność, wiek), więc
 * zgłoszenia bez rangi zachowują ten porządek — sortowanie jest stabilne.
 */
export function wgRecznejKolejnosci<T extends Pick<Report, 'id' | 'queueRank'>>(
  lista: T[],
): T[] {
  return lista
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const roznica = ranga(a.item) - ranga(b.item);
      // Przy równej randze (najczęściej: obie brak) decyduje kolejność
      // wejściowa, czyli automatyczna. Bez tego przeglądarki mogłyby ustawić
      // je dowolnie i lista skakałaby przy każdym odświeżeniu.
      return roznica !== 0 ? roznica : a.index - b.index;
    })
    .map(({ item }) => item);
}

/**
 * Nowe rangi po przeciągnięciu pozycji w dowolne miejsce listy.
 *
 * Adam poprosił o to po strzałkach: „najlepiej abym mógł przesuwać je
 * ręcznie — bez strzałek. Czyli że łapię i przesuwam". Strzałki przestawiają
 * o jedno miejsce, więc przeniesienie zgłoszenia z końca na górę wymagało
 * kilkunastu kliknięć.
 *
 * `zId` ląduje w miejscu, w którym leżało `nadId`; wszystko poniżej przesuwa
 * się w dół. `null` znaczy „nic się nie zmieniło" — upuszczenie na siebie
 * albo na pozycję spoza listy.
 */
export function poPrzeciagnieciu(
  lista: Array<Pick<Report, 'id' | 'queueRank'>>,
  zId: string,
  nadId: string,
): Array<{ id: string; queueRank: number }> | null {
  if (zId === nadId) return null;

  const ulozona = wgRecznejKolejnosci(lista);
  const skad = ulozona.findIndex((r) => r.id === zId);
  const dokad = ulozona.findIndex((r) => r.id === nadId);
  if (skad < 0 || dokad < 0) return null;

  const przestawiona = [...ulozona];
  const [element] = przestawiona.splice(skad, 1);
  przestawiona.splice(dokad, 0, element);

  // Rangi dla CAŁEJ listy — z tego samego powodu co przy strzałkach: gdyby
  // rangę dostawał tylko przeciągnięty wpis, reszta zostałaby bez niej
  // i kolejność zależałaby od historii klikania, nie od tego, co widać.
  return przestawiona.map((r, index) => ({ id: r.id, queueRank: index }));
}

/**
 * Nowe rangi po przesunięciu jednej pozycji o jedno miejsce.
 *
 * Zwraca komplet par `id → ranga` dla CAŁEJ listy, nie tylko dla przesuwanego
 * elementu. Inaczej po pierwszym przesunięciu jeden wpis miałby rangę, reszta
 * nie, i kolejność zależałaby od tego, w jakiej kolejności ktoś klikał.
 *
 * `null` znaczy „nie da się" — próba wypchnięcia pierwszego w górę albo
 * ostatniego w dół. Wołający nie zapisuje wtedy nic.
 */
export function poPrzesunieciu(
  lista: Array<Pick<Report, 'id' | 'queueRank'>>,
  id: string,
  kierunek: 'gora' | 'dol',
): Array<{ id: string; queueRank: number }> | null {
  const ulozona = wgRecznejKolejnosci(lista);
  const skad = ulozona.findIndex((r) => r.id === id);
  if (skad < 0) return null;

  const dokad = kierunek === 'gora' ? skad - 1 : skad + 1;
  if (dokad < 0 || dokad >= ulozona.length) return null;

  const przestawiona = [...ulozona];
  const [element] = przestawiona.splice(skad, 1);
  przestawiona.splice(dokad, 0, element);

  return przestawiona.map((r, index) => ({ id: r.id, queueRank: index }));
}
