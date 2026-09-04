import type { Report, ReportNote } from './reports';

/**
 * Podpis pod notatką w zgłoszeniu.
 *
 * Notatki mają `author` (kto naprawdę pisał), ale wpisy sprzed jego
 * wprowadzenia go nie mają. Wtedy spadaliśmy do generycznej etykiety
 * „Zgłaszający" — i w jednym wątku ten sam człowiek podpisywał się raz
 * imieniem, raz bezosobowo. Adam zobaczył to u siebie: pisał trzy razy pod
 * rząd, a środkowa wypowiedź wyglądała, jakby była od kogoś innego.
 *
 * Imię zgłaszającego jest zapisane w samym zgłoszeniu (`report.author`), więc
 * dla notatek z jego strony obiegu bierzemy je stamtąd. Po stronie zespołu
 * zostaje „Claude": to moja rola w zespole i tak podpisane są wszystkie stare
 * notatki dev-owe.
 *
 * Generyczne „Zgłaszający" zostaje wyłącznie dla zgłoszeń bez podanego imienia
 * (dawne zgłoszenia anonimowe).
 */
export function podpisNotatki(
  note: Pick<ReportNote, 'from' | 'author'>,
  report: Pick<Report, 'author'>,
): string {
  if (note.author) return note.author;
  if (note.from === 'dev') return 'Claude';
  return report.author || 'Zgłaszający';
}
