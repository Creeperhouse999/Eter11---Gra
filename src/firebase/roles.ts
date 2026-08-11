import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db } from './client';

/**
 * Role zespołu.
 *
 * - `admin` — wszystko, łącznie z usuwaniem wątków i zgłoszeń oraz nadawaniem
 *   ról. Jest jeden, założyciel projektu.
 * - `co-admin` — jak admin, ale nie usuwa i nie zmienia ról.
 * - `coworker` — edytuje treść i dyskutuje; jego zgłoszenia czekają na
 *   akceptację admina lub co-admina, zanim trafią do realizacji.
 * - `editor` — edytuje treść i może zgłaszać, ale nie bierze udziału
 *   w dyskusjach.
 * - `viewer` — tylko podgląd panelu: nic nie zmienia, nie zgłasza, nie pisze.
 */
/**
 * `programmer` to rola dla mnie (Claude): te same prawa co admin, osobna
 * nazwa, żeby w rozmowie zgłoszenia było widać, kto odpisał — programista,
 * nie „admin".
 */
export type Role =
  | 'admin'
  | 'programmer'
  | 'co-admin'
  | 'coworker'
  | 'editor'
  | 'viewer';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  programmer: 'Claude',
  'co-admin': 'Co-admin',
  coworker: 'Coworker',
  editor: 'Edytor',
  viewer: 'Podgląd',
};

export const ROLE_HINTS: Record<Role, string> = {
  admin: 'Wszystko, łącznie z usuwaniem i nadawaniem ról.',
  programmer: 'To samo co admin — rola programisty.',
  'co-admin': 'Jak admin, ale bez usuwania i zmiany ról.',
  coworker: 'Edytuje i dyskutuje; jego zgłoszenia czekają na akceptację.',
  editor: 'Edytuje treść i zgłasza, bez dyskusji.',
  viewer: 'Tylko podgląd — nic nie zmienia.',
};

/**
 * Konto, którego roli jeszcze nie ustawiono, jest coworkerem.
 *
 * Najbezpieczniejszy domyślny poziom: może pracować i zgłaszać, ale nic nie
 * usuwa, a jego zgłoszenia i tak przechodzą przez akceptację. Admin podnosi
 * albo obniża rolę w zakładce Zespół.
 */
export const DEFAULT_ROLE: Role = 'coworker';

/** Konto, które zawsze jest adminem — założyciel, niezależnie od bazy. */
export const ROOT_ADMIN_EMAIL = 'info@eter11.pl';

const COLLECTION = 'roles';

export interface TeamMember {
  /** UID konta — klucz dokumentu. */
  uid: string;
  email: string;
  role: Role;
  /**
   * Kolor awatara nadany ręcznie w zakładce Zespół (`#rrggbb`).
   *
   * Nieustawiony znaczy „licz z imienia" — stała mapa zespołu, a poza nią
   * paleta. Do bazy trafia tylko wtedy, gdy ktoś jawnie wybrał kolor: pusty
   * string zapisany jako pole i tak nie przeszedłby reguł, które wymagają
   * hexa, więc zapis roli padłby przy okazji zmiany czegoś zupełnie innego.
   */
  color?: string;
}

/** Kolor z bazy jest wart zapisania tylko wtedy, gdy to poprawny hex. */
const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);

/**
 * Rola konta.
 *
 * `info@eter11.pl` jest adminem zawsze, także gdy w bazie nic o nim nie ma —
 * inaczej pomyłka w kolekcji ról mogłaby odciąć jedyną osobę, która może ją
 * naprawić.
 */
export async function loadRole(uid: string, email: string | null): Promise<Role> {
  if (email === ROOT_ADMIN_EMAIL) return 'admin';

  try {
    const snapshot = await getDoc(doc(db, COLLECTION, uid));
    const role = snapshot.data()?.role as Role | undefined;
    return role ?? DEFAULT_ROLE;
  } catch {
    // Gdy odczyt roli padnie, dajemy najniższy sensowny poziom, nie admina.
    return DEFAULT_ROLE;
  }
}

/**
 * Dokument roli → `TeamMember`. Jedno miejsce dla obu ścieżek odczytu
 * (`loadTeam` i `watchTeam`), żeby obsługa pól nie rozjechała się między nimi.
 */
function toMember(uid: string, data: Record<string, unknown>): TeamMember {
  const member: TeamMember = {
    uid,
    email: (data.email as string) ?? '',
    role: (data.role as Role) ?? DEFAULT_ROLE,
  };
  // Pole nieobecne albo uszkodzone traktujemy jak brak koloru — awatar wraca
  // wtedy do koloru z imienia zamiast pokazywać puste tło.
  if (isHexColor(data.color)) member.color = data.color;
  return member;
}

export async function loadTeam(): Promise<TeamMember[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((entry) => toMember(entry.id, entry.data()));
}

export function watchTeam(onChange: (members: TeamMember[]) => void): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      onChange(snapshot.docs.map((entry) => toMember(entry.id, entry.data())));
    },
    () => onChange([]),
  );
}

/**
 * Nadaje rolę. Reguły dopuszczają to wyłącznie adminowi.
 *
 * `color` dopisujemy tylko, gdy jest poprawnym hexem. `setDoc` bez `merge`
 * nadpisuje cały dokument, więc wywołanie bez koloru czyści kolor ustawiony
 * wcześniej — i o to chodzi: „wróć do koloru z imienia" to po prostu zapis
 * bez tego pola, bez osobnej ścieżki kasowania.
 */
export async function setRole(member: TeamMember): Promise<void> {
  const data: { email: string; role: Role; color?: string } = {
    email: member.email,
    role: member.role,
  };
  if (isHexColor(member.color)) data.color = member.color;
  await setDoc(doc(db, COLLECTION, member.uid), data);
}

/** Usuwa wpis roli — konto wraca do domyślnej. Tylko admin. */
export async function removeRole(uid: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, uid));
}

/** Czy rola może usuwać wątki i zgłoszenia. */
export function canDelete(role: Role): boolean {
  return role === 'admin' || role === 'programmer';
}

/** Czy rola akceptuje/odrzuca zgłoszenia oczekujące. */
export function canModerate(role: Role): boolean {
  return role === 'admin' || role === 'programmer' || role === 'co-admin';
}

/** Czy zgłoszenie tej roli trafia od razu do realizacji (pomija akceptację). */
export function skipsApproval(role: Role): boolean {
  return role === 'admin' || role === 'programmer' || role === 'co-admin';
}

/** Czy rola może w ogóle pisać w dyskusjach. */
export function canDiscuss(role: Role): boolean {
  return (
    role === 'admin' ||
    role === 'programmer' ||
    role === 'co-admin' ||
    role === 'coworker'
  );
}

/** Czy rola może zmieniać treść gry (karty, teksty, zasady…). */
export function canEdit(role: Role): boolean {
  return role !== 'viewer';
}

/** Czy rola może wysyłać zgłoszenia. */
export function canReport(role: Role): boolean {
  return role !== 'viewer';
}

/** Czy rola może nadawać role innym. */
export function canManageRoles(role: Role): boolean {
  return role === 'admin' || role === 'programmer';
}

/**
 * Czy rola może przeglądać i wczytywać historię zapisów.
 *
 * Historia to pełne, poprzednie wersje treści — wgląd w cudzą pracę i
 * możliwość cofnięcia zapisu. Zgłoszono, że powinien to widzieć tylko admin
 * i co-admin (nie coworker/editor/viewer), bo wczytanie starej wersji
 * podmienia całą treść w edytorze.
 */
export function canViewHistory(role: Role): boolean {
  return role === 'admin' || role === 'programmer' || role === 'co-admin';
}
