import {
  PRIORITY_ORDER,
  PROGRESS_LABELS,
  type Report,
  type ReportProgress,
} from '../firebase/reports';

/**
 * Jedna pozycja na liście aktywności.
 */
export interface ActivityItem {
  id: string;
  title: string;
  /** Co się z tym dzieje, słowami — „Robi się", „W kolejce", „Czeka". */
  stan: string;
  /** Etap pracy; steruje kolejnością i kolorem plakietki. */
  progress?: ReportProgress;
  /** Dokąd prowadzi kliknięcie — wprost do tego zgłoszenia. */
  link: string;
  /** Pilność, do podpisu na liście. */
  priority: Report['priority'];
  /**
   * Kiedy zaczął się BIEŻĄCY etap (`progress`) — Adam poprosił o „czas, kiedy
   * zacząłeś robić daną zakładkę". Pole już istnieje na zgłoszeniu
   * (`progressAt`, ustawiane przy każdej zmianie `progress`); tu tylko
   * przechodzi dalej, żeby panel miał co pokazać przy pozycji „W robocie".
   *
   * Nie ma odpowiednika „kiedy zacznę kolejne" — to poprosił Adam też, ale
   * praca idzie wg pilności zgłoszeń w danej chwili, nie wg harmonogramu:
   * nie da się uczciwie podać czasu, którego samo działanie jeszcze nie zna.
   */
  progressAt?: string;
}

/**
 * Kolejność etapów na liście: najpierw to, co dzieje się TERAZ.
 *
 * Adam poprosił o widok „nad czym w tym momencie pracujesz, a co jest
 * w kolejce" — więc trwająca robota musi być na górze, a nie ginąć wśród
 * dwudziestu wpisów posortowanych datą.
 */
const KOLEJNOSC: Array<ReportProgress | 'brak'> = ['working', 'testing', 'queued', 'brak'];

/**
 * Składa listę aktywności z otwartych zgłoszeń.
 *
 * Dane już istnieją: `progress` ustawiam przy każdym kroku pracy nad
 * zgłoszeniem. Ta funkcja tylko układa je w jedną listę, żeby nie trzeba było
 * przeklikiwać sześciu pod-zakładek, by zobaczyć, co się dzieje.
 *
 * Zamknięte (`done`, `dismissed`) i skończone odpadają — to już nie jest
 * aktywność, tylko historia.
 */
export function buildActivity(reports: Report[]): ActivityItem[] {
  const otwarte = reports.filter((r) => {
    if (r.status === 'done' || r.status === 'dismissed') return false;
    // „Zrobione" znaczy, że praca po mojej stronie się skończyła — czeka
    // wtedy na zgłaszającego, nie na mnie.
    if (r.progress === 'finished') return false;
    return true;
  });

  const etap = (r: Report) => KOLEJNOSC.indexOf(r.progress ?? 'brak');

  return otwarte
    .slice()
    .sort((a, b) => {
      const roznicaEtapu = etap(a) - etap(b);
      if (roznicaEtapu !== 0) return roznicaEtapu;
      // Przy tym samym etapie decyduje pilność, a potem wiek — najstarsze
      // czekają najdłużej.
      const roznicaPilnosci =
        PRIORITY_ORDER[a.priority ?? 'medium'] - PRIORITY_ORDER[b.priority ?? 'medium'];
      if (roznicaPilnosci !== 0) return roznicaPilnosci;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .map((r) => ({
      id: r.id,
      title: r.title,
      stan: r.progress ? PROGRESS_LABELS[r.progress] : 'Czeka w kolejce',
      progress: r.progress,
      // Link prowadzi wprost do zgłoszenia, razem z jego pod-zakładką —
      // Adam prosił, żeby „każde zadanie się klikało i przenosiło do wątku".
      link: `/admin/reports/${r.status}?open=${r.id}`,
      priority: r.priority,
      progressAt: r.progressAt,
    }));
}
