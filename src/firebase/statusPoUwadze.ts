import type { ReportStatus } from './reports';

/**
 * Jaki status ma mieć zgłoszenie po dopisaniu uwagi przez zgłaszającego.
 *
 * Alan zgłosił: „chciałem dodać komentarz jako ja do zgłoszenia w NOWE
 * i poszło do WRÓCIŁY, nie ma sensu". Miał rację — przycisk zawsze ustawiał
 * `reopened`, niezależnie od tego, gdzie zgłoszenie leżało.
 *
 * „Wróciło do poprawki" znaczy: zgłaszający SPRAWDZIŁ naprawę i ona nie
 * działa. To mocne zdanie, które ustawia zgłoszenie na szczycie mojej kolejki
 * i mówi „ktoś już raz się zawiódł". Przy zgłoszeniu nowym, którego nikt
 * jeszcze nie tknął, jest po prostu nieprawdziwe: nie ma czego zwracać.
 *
 * Zasada: uwaga odsyła do poprawki TYLKO wtedy, gdy było co sprawdzać, czyli
 * gdy zgłoszenie stało jako naprawione. W każdym innym miejscu obiegu uwaga
 * jest zwykłym dopisaniem zdania do rozmowy i status zostaje bez zmian.
 */
export function statusPoUwadze(obecny: ReportStatus): ReportStatus {
  // Naprawione + uwaga = „sprawdziłem i dalej nie działa".
  if (obecny === 'fixed') return 'reopened';

  // Wszystko inne zostaje: nowe zostaje nowym, zwrócone zwróconym,
  // potwierdzone potwierdzonym. Uwaga to wtedy głos w rozmowie, nie decyzja
  // o obiegu.
  return obecny;
}

/**
 * Napis na przycisku dopisywania uwagi.
 *
 * Musi mówić prawdę o tym, co kliknięcie zrobi — „Odeślij do poprawki" przy
 * nowym zgłoszeniu obiecywało coś, czego nie należało obiecywać.
 */
export function etykietaUwagi(obecny: ReportStatus): string {
  return obecny === 'fixed' ? 'Odeślij do poprawki' : 'Dopisz uwagę';
}
