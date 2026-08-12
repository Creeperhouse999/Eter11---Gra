/**
 * Data w formie czytelnej dla człowieka: „21 lip, 14:32".
 *
 * Uszkodzona data nie może wypisać się jako „Invalid Date" — to angielski
 * komunikat techniczny w polskim panelu, a wygląda jak awaria, choć znaczy
 * tylko tyle, że jeden wpis ma zepsuty znacznik czasu. Zdarza się to realnie:
 * zgłoszenie może wysłać ktoś bez konta (tak zdecydował właściciel), a reguły
 * nie sprawdzają formatu `createdAt`, więc do bazy trafi każdy tekst.
 *
 * Cztery panele miały własne kopie tej funkcji i tylko jedna sprawdzała
 * poprawność daty. Tutaj jest jedna wersja dla wszystkich.
 */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
