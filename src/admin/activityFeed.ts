import {
  PRIORITY_ORDER,
  PROGRESS_LABELS,
  type Report,
  type ReportPriority,
  type ReportProgress,
} from '../firebase/reports';
import { stanWatku, type Discussion } from '../firebase/discussions';

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
  /** Pilność, do podpisu na liście — dyskusje bywają bez niej. */
  priority?: ReportPriority;
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
 * Etap zgłoszenia, jaki NAPRAWDĘ obowiązuje teraz.
 *
 * `progress` zostaje na zgłoszeniu z POPRZEDNIEGO okrążenia — a zgłaszający
 * może je odesłać do poprawki (`reopened`) długo po tym, jak sam oznaczyłem
 * je jako „Zrobione". Reopened+finished to więc kłamstwo: ktoś już sprawdził
 * i powiedział, że NIE działa, a plakietka dalej chwali się ukończeniem.
 * Ten sam rozjazd naprawia już `pokazacPostep` (chowa samą plakietkę na
 * liście zgłoszeń) — tutaj chodzi o coś poważniejszego niż plakietka:
 * `finished` był warunkiem WYRZUCENIA z całej listy aktywności, więc
 * odesłane do poprawki zgłoszenie znikało z niej na dobre. Adam zgłosił
 * dokładnie to: „w liście kolejnych powinny być też te, które wróciły do
 * poprawy" — a nie znikać, jakby nikt nic nie robił.
 *
 * Traktujemy taki przypadek jak brak etapu („brak") — z powrotem w kolejce,
 * czekające na ponowne wzięcie na warsztat, tak jak każde świeże zgłoszenie.
 */
function biezacyEtap(r: Report): ReportProgress | undefined {
  if (r.status === 'reopened' && r.progress === 'finished') return undefined;
  return r.progress;
}

/**
 * Składa listę aktywności z otwartych zgłoszeń.
 *
 * Dane już istnieją: `progress` ustawiam przy każdym kroku pracy nad
 * zgłoszeniem. Ta funkcja tylko układa je w jedną listę, żeby nie trzeba było
 * przeklikiwać sześciu pod-zakładek, by zobaczyć, co się dzieje.
 *
 * Zamknięte (`done`, `dismissed`) i naprawdę skończone odpadają — to już nie
 * jest aktywność, tylko historia.
 */
export function buildActivity(reports: Report[]): ActivityItem[] {
  const otwarte = reports.filter((r) => {
    if (r.status === 'done' || r.status === 'dismissed') return false;
    // „fixed" ma własną kategorię — „Do sprawdzenia" (`buildAwaitingReview`)
    // — niezależnie od tego, co akurat stoi w `progress`. Te dwa pola bywają
    // ustawiane OSOBNO (trailer `Report-Fixed` w Actions rusza tylko
    // `status`, `progress` ustawia osobne wywołanie) — bez tego warunku
    // zgłoszenie ze `status: 'fixed'`, ale jeszcze nie zresetowanym
    // `progress`, wisiało jednocześnie w „W kolejce"/„W robocie" I w „Do
    // sprawdzenia", jakby ktoś nad nim wciąż pracował.
    if (r.status === 'fixed') return false;
    // „Zrobione" znaczy, że praca po mojej stronie się skończyła — czeka
    // wtedy na zgłaszającego, nie na mnie. Ale nie wtedy, gdy zgłoszenie
    // WRÓCIŁO (patrz `biezacyEtap`) — wtedy to znów aktywna praca.
    if (biezacyEtap(r) === 'finished') return false;
    return true;
  });

  const etap = (r: Report) => KOLEJNOSC.indexOf(biezacyEtap(r) ?? 'brak');

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
    .map((r) => {
      const stanTeraz = biezacyEtap(r);
      return {
        id: r.id,
        title: r.title,
        stan: stanTeraz ? PROGRESS_LABELS[stanTeraz] : 'Czeka w kolejce',
        progress: stanTeraz,
        // Link prowadzi wprost do zgłoszenia, razem z jego pod-zakładką —
        // Adam prosił, żeby „każde zadanie się klikało i przenosiło do wątku".
        link: `/admin/reports/${r.status}?open=${r.id}`,
        priority: r.priority,
        // Zresetowany etap (patrz `biezacyEtap`) nie ma już czasu rozpoczęcia
        // z poprzedniego, zamkniętego okrążenia — to byłby czas MYLĄCY, nie
        // czas TEGO podejścia.
        progressAt: stanTeraz ? r.progressAt : undefined,
      };
    });
}

/**
 * Zgłoszenia oznaczone jako zrobione — czekają na sprawdzenie, nie na mnie.
 *
 * Adam: „dodaj w aktywności kategorię »Do sprawdzenia«, aby tam też widniały
 * zadania zrobione przez Ciebie i sprawdzenia przez admina". `buildActivity`
 * wyrzuca `fixed` całkiem (to już nie AKTYWNA praca) — ta funkcja pokazuje tę
 * samą pulę z drugiej strony: co już zrobiłem i czeka na czyjeś potwierdzenie.
 */
export function buildAwaitingReview(reports: Report[]): ActivityItem[] {
  return reports
    .filter((r) => r.status === 'fixed')
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => ({
      id: r.id,
      title: r.title,
      stan: 'Do sprawdzenia',
      // `finished`, żeby plakietka wzięła ten sam zielony kolor „zrobione" co
      // gdzie indziej w panelu — samo słowo do tego nie wystarczy.
      progress: 'finished' as const,
      link: `/admin/reports/${r.status}?open=${r.id}`,
      priority: r.priority,
    }));
}

/**
 * Wątki dyskusji, na które czeka odpowiedź ode mnie.
 *
 * Adam: „w kolejce niech będą wszystkie zadania zgłoszone w dyskusji" —
 * dotąd Aktywność w ogóle nie zaglądała do dyskusji, więc pytanie zadane tam
 * było niewidoczne na liście „co mam zrobić", mimo że czekało tak samo jak
 * zgłoszenie. `stanWatku` już rozstrzyga, po czyjej stronie jest piłka — tu
 * tylko wybieramy te, gdzie to moja.
 */
export function buildDiscussionQueue(
  discussions: Discussion[],
  viewerAuthor: string,
): ActivityItem[] {
  const czekajace = discussions.filter(
    (d) => stanWatku(d, viewerAuthor) === 'nowa-odpowiedz',
  );

  const ostatniaWypowiedz = (d: Discussion) =>
    d.messages[d.messages.length - 1]?.at ?? d.createdAt;

  return czekajace
    .slice()
    .sort((a, b) => {
      const roznicaPilnosci =
        PRIORITY_ORDER[a.priority ?? 'medium'] - PRIORITY_ORDER[b.priority ?? 'medium'];
      if (roznicaPilnosci !== 0) return roznicaPilnosci;
      // Najstarsza NIEODPOWIEDZIANA wypowiedź czeka najdłużej.
      return ostatniaWypowiedz(a).localeCompare(ostatniaWypowiedz(b));
    })
    .map((d) => ({
      id: d.id,
      title: d.title,
      stan: 'Czeka w kolejce',
      link: `/admin/discussions?open=${d.id}`,
      priority: d.priority,
    }));
}
