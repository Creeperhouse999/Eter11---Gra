/**
 * Rozkłada link z powiadomienia na cel nawigacji.
 *
 * Alan zgłaszał dwa razy, że kliknięcie powiadomienia o dyskusji przenosi „po
 * prostu do zakładki, nie do konkretu". Link niósł właściwe dane
 * (`/admin/discussions?open=<id>`) — gubiły się przy przejściu, bo zmiana
 * zakładki czyści parametry adresu, a `open` ustawiany osobno zaraz po niej
 * był kasowany.
 *
 * Rozkładanie linku siedzi tutaj, osobno od panelu, żeby dało się je sprawdzić
 * testem bez montowania całej aplikacji — panel tylko przekazuje wynik do
 * `navigate`, które ustawia zakładkę i parametry JEDNYM przejściem.
 */
export interface LinkTarget {
  /** Zakładka panelu, np. `discussions`. */
  tab: string;
  /** Pod-zakładka — dziś tylko status zgłoszenia (`/admin/reports/fixed`). */
  sub: string | null;
  /** Parametry adresu: `open` (konkretny wpis), `filter` (karta po nazwie). */
  params: Record<string, string>;
}

export function parseAdminLink(link: string): LinkTarget {
  const [path, query] = link.split('?');
  const slug = path.replace(/^\/admin\/?/, '').split('/');
  const search = new URLSearchParams(query ?? '');

  const params: Record<string, string> = {};
  // `open` wskazuje konkretny wątek, zgłoszenie albo problem; `filter` — kartę
  // po nazwie (tak prowadzi link ze Strefy Nudy).
  const open = search.get('open');
  const filter = search.get('filter');
  if (open) params.open = open;
  if (filter) params.filter = filter;

  return { tab: slug[0] ?? '', sub: slug[1] || null, params };
}
