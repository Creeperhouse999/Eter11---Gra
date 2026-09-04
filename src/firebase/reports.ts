import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from './client';

export type ReportKind = 'bug' | 'idea';

/**
 * Obieg zgłoszenia.
 *
 * - `pending` — czeka na akceptację admina/co-admina. Tu lądują zgłoszenia
 *   od coworkerów, edytorów i graczy z gry. Programista ich nie rusza.
 * - `new` — zaakceptowane (albo od razu wysłane przez admina/co-admina),
 *   czeka na programistę.
 * - `fixed` — programista twierdzi, że naprawione; czeka na sprawdzenie.
 * - `reopened` — zgłaszający sprawdził i dalej nie działa; wraca do naprawy.
 * - `dismissed` — admin/co-admin odrzucił zgłoszenie z komentarzem. Koniec.
 * - `done` — zgłaszający potwierdził, że działa.
 *
 * Rozdzielenie `fixed` i `done` jest sednem: naprawiający nie zamyka
 * własnego zgłoszenia. Zamyka je ten, kto je napisał.
 *
 * `reopened` to dawne `rejected` (zgłaszający: „dalej nie działa"); zmiana
 * nazwy, bo `dismissed` to co innego — odrzucenie przez moderatora.
 */
export type ReportStatus =
  | 'pending'
  | 'new'
  | 'fixed'
  | 'reopened'
  | 'dismissed'
  | 'done';

export interface ReportNote {
  /** Kto pisze: programista czy zgłaszający. */
  from: 'dev' | 'reporter';
  text: string;
  at: string;
  /**
   * Imię autora notatki — kto ją naprawdę napisał.
   *
   * `from` mówi tylko o STRONIE obiegu (programista/zgłaszający), więc każda
   * notatka od zespołu podpisywała się „programista", nawet gdy pisał ją
   * co-admin albo admin — a to wprowadzało w błąd (osoba, która nie jest
   * programistą, wyświetlała się jako programista). Gdy `author` jest, podpis
   * bierze się z niego; brak (stare notatki) — spada do generycznej etykiety.
   */
  author?: string;
}

/**
 * Jak pilne jest zgłoszenie — ustawia zgłaszający, bo to on wie, czy gra stoi,
 * czy chodzi o literówkę.
 *
 * Cztery poziomy, nie trzy: „ultra" jest po to, żeby dało się odróżnić „gra
 * nie działa, dzieci siedzą przy stole" od zwykłego pilnego błędu.
 */
export type ReportPriority = 'low' | 'medium' | 'high' | 'ultra';

/**
 * Na czym stoi robota nad zgłoszeniem.
 *
 * To OSOBNE pole od `status`, i to jest tu sedno. Status opisuje obieg
 * zgłoszenia i należy do zgłaszającego — `done` stawia tylko on. Postęp
 * należy do wykonawcy i mówi jedno: „widzę to zgłoszenie, siedzę przy nim".
 * Gdyby dzielić jedno pole, ustawienie „pracuję" kasowałoby informację, że
 * zgłoszenie zostało wcześniej zaakceptowane.
 *
 * Alan poprosił o to wprost: Adam siada do pracy i chce widzieć, czy jego
 * zgłoszenie leży nietknięte, czy ktoś już przy nim jest.
 */
export type ReportProgress = 'queued' | 'working' | 'testing' | 'finished';

export const PROGRESS_LABELS: Record<ReportProgress, string> = {
  queued: 'W kolejce',
  working: 'Robi się',
  testing: 'Sprawdzam',
  finished: 'Zrobione',
};

/** Kolejność do wyświetlania — od „jeszcze nie zacząłem" do „skończone". */
export const PROGRESS_ORDER: ReportProgress[] = [
  'queued',
  'working',
  'testing',
  'finished',
];

/** Kolejność do sortowania — najpilniejsze na górze listy. */
export const PRIORITY_ORDER: Record<ReportPriority, number> = {
  ultra: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const PRIORITY_LABELS: Record<ReportPriority, string> = {
  ultra: 'Krytyczny',
  high: 'Wysoki',
  medium: 'Zwykły',
  low: 'Niski',
};

export interface Report {
  id: string;
  kind: ReportKind;
  title: string;
  description: string;
  status: ReportStatus;
  author?: string;
  /**
   * Pilność. Starsze zgłoszenia jej nie mają — czytamy je wtedy jako
   * „zwykły", żeby nie wypychały nowych ani nie spadały na sam dół.
   */
  priority?: ReportPriority;
  /**
   * Na czym stoi robota. Brak pola znaczy „nikt jeszcze nie tknął" — tak
   * wyglądają wszystkie zgłoszenia sprzed tej zmiany.
   */
  progress?: ReportProgress;
  /** Kiedy postęp ostatnio ruszył — bez tego „robi się" sprzed tygodnia wygląda jak świeże. */
  progressAt?: string;
  createdAt: string;
  /** Adresy zrzutów ekranu wgranych do Storage. Najwyżej pięć. */
  images?: string[];
  /** Rozmowa o zgłoszeniu: co naprawiono, co dalej nie działa. */
  notes?: ReportNote[];
}

const COLLECTION = 'reports';

export async function addReport(input: {
  kind: ReportKind;
  title: string;
  description: string;
  author?: string;
  images?: string[];
  /**
   * Status startowy. `pending`, gdy zgłasza coworker, edytor albo gracz
   * z gry — trafia wtedy do akceptacji. `new`, gdy admin lub co-admin, bo
   * ich zgłoszenia pomijają kolejkę. Domyślnie `pending`: bezpieczniej, żeby
   * pominięcie roli nie wpuszczało zgłoszenia od razu do realizacji.
   */
  status?: 'pending' | 'new';
  /** Pilność — bez niej zgłoszenie liczy się jako zwykłe. */
  priority?: ReportPriority;
}): Promise<{ ok: boolean; error?: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Wpisz tytuł zgłoszenia.' };

  try {
    await addDoc(collection(db, COLLECTION), {
      kind: input.kind,
      title,
      description: input.description.trim(),
      author: input.author?.trim() ?? '',
      status: (input.status ?? 'pending') satisfies ReportStatus,
      createdAt: new Date().toISOString(),
      // Pilność zapisujemy tylko wtedy, gdy ktoś ją wybrał: brak pola czyta
      // się jako „zwykły", więc wartość domyślna niczego nie wnosi.
      ...(input.priority ? { priority: input.priority } : {}),
      // Puste pole pomijamy: reguły dopuszczają `images`, ale pusta lista
      // niczego nie wnosi, a odczyt i tak podstawia [].
      ...(input.images?.length ? { images: input.images.slice(0, 5) } : {}),
      // Bez `notes`: reguły dopuszczają dokładnie sześć pól, a pusta lista
      // niczego nie wnosi — odczyt i tak podstawia `[]`, gdy pola brakuje.
      // Wysyłanie jej odrzucało KAŻDE zgłoszenie z błędem uprawnień, czyli
      // kanał zgłaszania błędów był martwy od początku.
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Nie udało się wysłać zgłoszenia: ${message}` };
  }
}

/** Wspólne mapowanie dokumentu na `Report` — dla odczytu i nasłuchu. */
export function toReport(id: string, data: Record<string, unknown>): Report {
  // Postęp wpuszczamy tylko ze znanej listy. Do bazy da się wpisać cokolwiek
  // przez REST, a plakietka z przypadkowym tekstem myliłaby bardziej, niż
  // pomagała — nieznana wartość czyta się więc jako „nikt nie tknął".
  const progress = data.progress as ReportProgress | undefined;

  return {
    id,
    kind: (data.kind as ReportKind) ?? 'bug',
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    status: (data.status as ReportStatus) ?? 'new',
    author: (data.author as string) ?? undefined,
    priority: (data.priority as ReportPriority) ?? undefined,
    progress: progress && PROGRESS_ORDER.includes(progress) ? progress : undefined,
    progressAt: (data.progressAt as string) ?? undefined,
    createdAt: (data.createdAt as string) ?? '',
    images: (data.images as string[]) ?? [],
    notes: (data.notes as ReportNote[]) ?? [],
  };
}

export async function loadReports(): Promise<Report[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy('createdAt', 'desc')),
  );

  return snapshot.docs.map((entry) => toReport(entry.id, entry.data()));
}

/**
 * Podgląd zgłoszeń na żywo — nowe zgłoszenia i zmiany statusu wchodzą same.
 *
 * Wcześniej panel czytał listę raz (`loadReports` + „Odśwież"). Po wysłaniu
 * nowego zgłoszenia trzeba było przeładować stronę, żeby je zobaczyć w
 * zakładce „nowe"/„do akceptacji" — a zmiany od innych osób z zespołu nie
 * pojawiały się wcale. Nasłuch (`onSnapshot`) rozwiązuje jedno i drugie:
 * lista aktualizuje się natychmiast po każdym zapisie, bez ręcznego odświeżania.
 *
 * Zwraca funkcję odłączającą — wywołanie jej kończy nasłuch i naliczanie.
 */
export function watchReports(
  onChange: (reports: Report[]) => void,
  onError?: (message: string) => void,
): () => void {
  return onSnapshot(
    query(collection(db, COLLECTION), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onChange(snapshot.docs.map((entry) => toReport(entry.id, entry.data())));
    },
    (error) => onError?.(error.message),
  );
}

/**
 * Ustawia, na czym stoi robota — bez ruszania statusu.
 *
 * `null` cofa do „nikt nie tknął": czyścimy pole zamiast zapisywać pustą
 * wartość, żeby lista nie pokazywała pustej plakietki przy każdym zgłoszeniu.
 */
export async function setReportProgress(
  id: string,
  progress: ReportProgress | null,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    progress,
    progressAt: progress ? new Date().toISOString() : null,
  });
}

/**
 * Zmiana statusu, opcjonalnie z komentarzem.
 *
 * Komentarz dopisywany jest do listy, nie nadpisuje poprzednich — historia
 * zgłoszenia zostaje w całości, żeby dało się prześledzić, co już próbowano.
 */
export async function setReportStatus(
  id: string,
  status: ReportStatus,
  note?: { from: ReportNote['from']; text: string; author?: string },
): Promise<void> {
  const text = note?.text.trim();
  const author = note?.author?.trim();

  await updateDoc(doc(db, COLLECTION, id), {
    status,
    ...(text
      ? {
          notes: arrayUnion({
            from: note!.from,
            text,
            at: new Date().toISOString(),
            // Podpis autorem tylko, gdy go znamy — pusty `author` w arrayUnion
            // tworzyłby notatki różniące się pustym polem i psuł dedup.
            ...(author ? { author } : {}),
          }),
        }
      : {}),
  });
}

/**
 * Poprawa treści zgłoszenia — tytuł i opis.
 *
 * Reguły Firestore wpuszczają zmianę tych pól tylko moderatorowi
 * (admin/co-admin); zwykły zalogowany może ruszać wyłącznie status i notatki.
 * Autor bez konta (gracz z gry) nie ma tożsamości do edycji, więc poprawia to
 * ktoś z zespołu w panelu — np. gdy w pośpiechu wpisano literówkę w tytule.
 */
export async function updateReport(
  id: string,
  patch: { title: string; description: string },
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    title: patch.title.trim(),
    description: patch.description.trim(),
  });
}

/** Trwałe usunięcie zgłoszenia. Wymaga konta administracyjnego. */
export async function deleteReport(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
