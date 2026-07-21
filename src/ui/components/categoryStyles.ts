import { DEFAULT_CATEGORIES, type CategoryMap } from '../../data/categories';
import type { CardCategory, ProblemType, SlotKey } from '../../engine/types';
import type { IconName } from '../icons/Icon';

/**
 * Nazwy i ikony kategorii, ustawiane raz po wczytaniu zawartości.
 *
 * Rejestr modułowy, a nie właściwość przekazywana w dół drzewa: nazwy
 * kategorii czyta trzydzieści miejsc w dziesięciu plikach, w tym funkcje
 * pomocnicze bez dostępu do Reacta. Przewlekanie tego przez props zamieniłoby
 * drobną zmianę redakcyjną w przebudowę połowy interfejsu.
 *
 * Wartości wbudowane działają, dopóki nic nie ustawiono — gra rysuje się
 * poprawnie także wtedy, gdy Firestore jeszcze nie odpowiedział.
 */
let categories: CategoryMap = DEFAULT_CATEGORIES;

/** Podmienia nazwy i ikony kategorii na te z panelu redakcyjnego. */
export function setCategoryStyles(next?: Partial<CategoryMap>): void {
  // Scalanie, nie podmiana: zapis sprzed dodania tego pola nie ma wszystkich
  // kategorii, a brakująca nazwa zostawiłaby na ściance puste miejsce.
  categories = { ...DEFAULT_CATEGORIES, ...next };
}

export function categoryLabel(category: CardCategory): string {
  return categories[category]?.label ?? DEFAULT_CATEGORIES[category].label;
}

export function categoryColorVar(category: CardCategory): string {
  return `var(--eter-cat-${category})`;
}

/** Pełna etykieta ścianki — używana w opisach i panelu. */
/**
 * Nazwa ścianki. To ta sama nazwa co kategorii — ścianka nazywa się tak jak
 * karta, która do niej pasuje.
 *
 * Trzymała tu własną kopię pięciu nazw, więc zmiana nazwy kategorii minęłaby
 * ścianki bokiem i gracz zobaczyłby dwie różne nazwy tej samej rzeczy.
 */
export function slotLabel(slot: SlotKey): string {
  return categoryLabel(slot);
}

/**
 * Umiejscowienie ścianki na karcie problemu.
 *
 * Układ ustalony przez zespół: psychologiczna po lewej, cyfrowa na dole,
 * społeczna po prawej, mentor w lewym górnym rogu, talent w prawym górnym.
 */
/**
 * Kolejność ścianek zgodna z układem karty problemu.
 *
 * Jedno źródło dla całej aplikacji: silnik, walidacja, edytor problemów
 * i podsumowanie muszą wymieniać ścianki tak samo. Wcześniej ta sama lista
 * żyła w czterech kopiach, a jedna z nich zdążyła się już rozjechać
 * kolejnością — walidacja sprawdzałaby wtedy co innego, niż pokazuje UI.
 */
export const SLOT_ORDER: SlotKey[] = [
  'mentor',
  'talent',
  'psychological',
  'social',
  'digital',
];

/**
 * Kategorie, którymi wolno się dzielić z innym graczem.
 *
 * Mentor i talent zostają u tego, kto je zagrał — dzielić się można
 * kompetencjami, nie osobami ani cechami charakteru. Reguła siedziała
 * w trzech miejscach naraz, w tym raz bez typu, więc TypeScript nie
 * ostrzegłby przy rozjeździe.
 */
export const COMPETENCE_CATEGORIES = ['psychological', 'digital', 'social'] as const;

/** Czy kartą tej kategorii wolno się podzielić z innym graczem. */
export function isCompetence(category: string): boolean {
  return (COMPETENCE_CATEGORIES as readonly string[]).includes(category);
}

export function slotIcon(slot: SlotKey): IconName {
  return categories[slot]?.icon ?? DEFAULT_CATEGORIES[slot].icon;
}

export function slotColorVar(slot: SlotKey): string {
  return `var(--eter-cat-${slot})`;
}

export function problemTypeLabel(type: ProblemType): string {
  const labels: Record<ProblemType, string> = {
    action: 'Działanie',
    thinking: 'Myślenie',
    cooperation: 'Współpraca',
    selfchange: 'Zmiana w sobie',
  };
  return labels[type];
}

export function problemTypeColorVar(type: ProblemType): string {
  return `var(--eter-type-${type})`;
}
