import { PRIORITY_ORDER, type Report } from './reports';

/**
 * Numer w kolejce — „W kolejce nr 3".
 *
 * Alan prosił o to wielokrotnie: sama plakietka „W kolejce" nie mówi nic
 * o tym, kiedy sprawa ruszy. Numer mówi wprost, ile rzeczy jest przede mną,
 * a że kolejność liczy się dokładnie tak, jak biorę zgłoszenia (pilność,
 * przy równej — starsze pierwsze), numer 1 znaczy naprawdę „następne".
 *
 * Do kolejki liczą się WYŁĄCZNIE zgłoszenia czekające na moją robotę:
 * nowe i te, które wróciły do poprawki, i tylko takie, przy których nikt nie
 * siedzi (`progress` puste albo `queued`). Zgłoszenie w robocie nie stoi
 * w kolejce — ono już się dzieje.
 */
const CZEKA_NA_MNIE = new Set(['new', 'reopened']);

function wKolejce(report: Report): boolean {
  if (!CZEKA_NA_MNIE.has(report.status)) return false;
  return !report.progress || report.progress === 'queued';
}

/** Zgłoszenia czekające, w kolejności brania. */
export function kolejka(reports: Report[]): Report[] {
  return reports.filter(wKolejce).sort((a, b) => {
    const pilnosc =
      PRIORITY_ORDER[a.priority ?? 'medium'] - PRIORITY_ORDER[b.priority ?? 'medium'];
    if (pilnosc !== 0) return pilnosc;
    // Przy równej pilności starsze idzie pierwsze — inaczej zgłoszenie sprzed
    // tygodnia wiecznie ustępowałoby świeższym i nigdy by nie ruszyło.
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/**
 * Które to miejsce w kolejce (licząc od 1), albo `null` gdy zgłoszenie
 * w kolejce nie stoi — bo jest w robocie, sprawdzane albo zamknięte.
 */
export function pozycjaWKolejce(reports: Report[], id: string): number | null {
  const index = kolejka(reports).findIndex((r) => r.id === id);
  return index < 0 ? null : index + 1;
}

/**
 * Zgłoszenia, z których trzeba zdjąć „Robi się", gdy biorę nowe.
 *
 * Alan: „jest status, że się robi u dwóch naraz". Robić mogę jedną rzecz —
 * dwa „Robi się" naraz to nieprawda, niezależnie od tego, czy powstały przez
 * moje zapominalstwo, czy przez kliknięcie. Zwracamy identyfikatory do
 * wyczyszczenia, a decyzję o zapisie podejmuje wołający.
 *
 * „Sprawdzam" zostaje na wielu: to zgłoszenia czekające na sprawdzenie przez
 * zespół, a ludzi jest kilku i mogą sprawdzać równolegle.
 */
export function doZdjeciaZRoboty(reports: Report[], biezacyId: string): string[] {
  return reports
    .filter((r) => r.id !== biezacyId && r.progress === 'working')
    .map((r) => r.id);
}
