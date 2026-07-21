import type { CardCategory, ProblemType, SlotKey } from '../../engine/types';
import type { IconName } from '../icons/Icon';

export function categoryLabel(category: CardCategory): string {
  const labels: Record<CardCategory, string> = {
    psychological: 'Psychologiczna',
    digital: 'Cyfrowa',
    social: 'Społeczna',
    talent: 'Talent',
    mentor: 'Mentor',
    eter11: 'ETER11',
    blackswan: 'Czarny Łabędź',
  };
  return labels[category];
}

export function categoryColorVar(category: CardCategory): string {
  return `var(--eter-cat-${category})`;
}

/** Pełna etykieta ścianki — używana w opisach i panelu. */
export function slotLabel(slot: SlotKey): string {
  const labels: Record<SlotKey, string> = {
    psychological: 'Psychologiczna',
    digital: 'Cyfrowa',
    social: 'Społeczna',
    mentor: 'Mentor',
    talent: 'Talent',
  };
  return labels[slot];
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
  const icons: Record<SlotKey, IconName> = {
    psychological: 'brain',
    digital: 'chip',
    social: 'handshake',
    mentor: 'compass',
    talent: 'star',
  };
  return icons[slot];
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
