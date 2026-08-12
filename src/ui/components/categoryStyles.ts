import { useEffect } from 'react';
import { DEFAULT_CATEGORIES, type CategoryMap } from '../../data/categories';
import type { CardCategory, FamilyId, ProblemType, SlotKey } from '../../engine/types';
import { FAMILY_LABELS, type FamilyMap } from '../../data/families';

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

/**
 * Własne ikony wgrane przez zespół.
 *
 * Rejestr modułowy z tego samego powodu co nazwy kategorii: wybór ikony
 * jest w kilku edytorach, a przewlekanie listy przez props do każdego
 * z nich zamieniłoby dodanie ikony w przebudowę połowy panelu.
 */
let customIcons: Array<{ name: string; url: string }> = [];

export function setCustomIcons(next?: Array<{ name: string; url: string }>): void {
  customIcons = next ?? [];
}

export function getCustomIcons(): Array<{ name: string; url: string }> {
  return customIcons;
}

/**
 * Utrzymuje rejestr modułowy w zgodzie z zawartością gry wczytaną w panelu.
 *
 * Osobny hook, nie inline `useEffect` w AdminApp: zależność wyłącznie od
 * `categories` przegapiała zmiany `customIcons` (wgranie/usunięcie ikony nie
 * odświeżało rejestru), więc świeżo wgrana ikona nie pojawiała się w żadnym
 * IconPickerze, dopóki nie zmieniła się też nazwa jakiejś kategorii albo
 * strona nie odświeżyła się od zera.
 */
export function useContentStyleSync(
  categoryOverrides: Partial<CategoryMap> | undefined,
  customIconsList: Array<{ name: string; url: string }> | undefined,
  familyNames?: FamilyMap,
): void {
  useEffect(() => {
    setCategoryStyles(categoryOverrides);
    setCustomIcons(customIconsList);
    // Nazwy rodzin razem z resztą: bez tego podgląd karty w panelu pokazywałby
    // „Czerwona", choć redaktor właśnie wpisał obok własną nazwę.
    setFamilyNames(familyNames);
  }, [categoryOverrides, customIconsList, familyNames]);
}

/** Podmienia nazwy i ikony kategorii na te z panelu redakcyjnego. */
export function setCategoryStyles(next?: Partial<CategoryMap>): void {
  // Scalanie, nie podmiana: zapis sprzed dodania tego pola nie ma wszystkich
  // kategorii, a brakująca nazwa zostawiłaby na ściance puste miejsce.
  categories = { ...DEFAULT_CATEGORIES, ...next };
}

export function categoryLabel(category: CardCategory): string {
  // Pusta/whitespace nazwa (redaktor wyczyścił pole w panelu i zapisał) NIE
  // jest poprawną nazwą, a `?? ` jej nie łapie — pusty string przechodził i
  // ścianki/karty/karta postaci pokazywały puste miejsce w obu motywach.
  // Wracamy wtedy do nazwy wbudowanej; dopasowanie karty do ścianki i tak idzie
  // po kluczu, ale gracz musi widzieć jakąś nazwę.
  const label = categories[category]?.label;
  return label && label.trim() ? label : DEFAULT_CATEGORIES[category].label;
}

/**
 * Nazwy rodzin ustawione przez zespół w zakładce „Rodziny".
 *
 * Ten sam rejestr modułowy co nazwy kategorii i z tego samego powodu: nazwę
 * rodziny czyta kilkanaście miejsc, w tym funkcje bez dostępu do Reacta.
 */
let families: FamilyMap = {} as FamilyMap;

export function setFamilyNames(next?: FamilyMap): void {
  families = next ?? ({} as FamilyMap);
}

/**
 * Nazwa rodziny w danej kategorii — „Siła wewnętrzna" zamiast „Czerwona”.
 *
 * Rodzina jest przypisana do PARY kategoria+kolor, bo czerwony w kategorii
 * psychologicznej znaczy co innego niż w cyfrowej. Gdy zespół nie nazwał danej
 * pary (albo wyczyścił pole), wracamy do nazwy koloru — dopasowanie karty do
 * ścianki i tak idzie po kluczu, ale dziecko musi widzieć jakąś nazwę.
 */
export function familyLabel(family: FamilyId, category?: CardCategory): string {
  if (category) {
    const nazwa = families[category]?.find((f) => f.id === family)?.name;
    if (nazwa && nazwa.trim()) return nazwa;
  }
  return FAMILY_LABELS[family];
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

export function slotIcon(slot: SlotKey): string {
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
