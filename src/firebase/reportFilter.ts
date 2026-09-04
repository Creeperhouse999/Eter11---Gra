import { PRIORITY_ORDER, type Report, type ReportKind, type ReportPriority } from './reports';

/**
 * Sito listy zgłoszeń.
 *
 * Alan poprosił o filtry. Zgłoszeń jest ponad osiemdziesiąt: sama zakładka
 * statusu przestała wystarczać, gdy w „Potwierdzonych" leży siedemdziesiąt
 * pozycji, a szuka się jednej. Trzy niezależne sita, bo o zgłoszeniu myśli się
 * na trzy sposoby: „gdzie był ten błąd", „co pilnego zostało", „ten wątek
 * o kartach".
 *
 * `null` znaczy „wszystko" — filtr wyłączony, nie brak wyników.
 */
export interface ReportFilter {
  kind: ReportKind | null;
  priority: ReportPriority | null;
  /** Fragment tytułu albo treści; wielkość liter bez znaczenia. */
  szukaj: string;
}

export const PUSTY_FILTR: ReportFilter = { kind: null, priority: null, szukaj: '' };

/** Czy cokolwiek jest odsiane — panel mówi wtedy, ile pozycji ukrył. */
export function filtrAktywny(filtr: ReportFilter): boolean {
  return filtr.kind !== null || filtr.priority !== null || filtr.szukaj.trim() !== '';
}

/**
 * Zgłoszenia w danej zakładce, przesiane i ułożone.
 *
 * Kolejność jest ta sama, co kolejność brania: pilniejsze wyżej, przy równej
 * pilności najnowsze pierwsze. Zgłoszenia bez pilności (sprzed jej
 * wprowadzenia) liczą się jak zwykłe — inaczej wypadłyby na samą górę albo
 * na sam dół listy.
 */
export function przesiej(
  reports: Report[],
  status: string,
  filtr: ReportFilter = PUSTY_FILTR,
): Report[] {
  const szukaj = filtr.szukaj.trim().toLowerCase();

  return reports
    .filter((r) => r.status === status)
    .filter((r) => (filtr.kind ? r.kind === filtr.kind : true))
    .filter((r) => (filtr.priority ? (r.priority ?? 'medium') === filtr.priority : true))
    .filter((r) => {
      if (!szukaj) return true;
      // Szukamy i w tytule, i w treści: człowiek pamięta zwykle zdanie
      // z opisu („nie mogę przekazać karty"), nie tytuł, który sam nadał.
      return (
        r.title.toLowerCase().includes(szukaj) ||
        (r.description ?? '').toLowerCase().includes(szukaj)
      );
    })
    .sort((a, b) => {
      const roznica =
        PRIORITY_ORDER[a.priority ?? 'medium'] - PRIORITY_ORDER[b.priority ?? 'medium'];
      return roznica !== 0 ? roznica : b.createdAt.localeCompare(a.createdAt);
    });
}
