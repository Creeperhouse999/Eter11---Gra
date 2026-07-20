import type { Card, FamilyId, MissionState, Problem, SlotKey } from './types';

/** Klucz slotu w obrębie misji — problem może być więcej niż jeden. */
export function slotId(problemId: string, slotKey: SlotKey): string {
  return `${problemId}:${slotKey}`;
}

/**
 * Czy karta pasuje do ścianki.
 *
 * Ścianka wymaga karty właściwej kategorii **i** właściwej rodziny — dziecko
 * dopasowuje kolor do koloru. ETER11 zastępuje dowolną kartę; Czarny Łabędź
 * nie jest kartą do wykładania.
 *
 * Rodzina ścianki jest opcjonalna w sygnaturze, bo część widoków sprawdza
 * samą kategorię (np. podświetlenie kart na ręce przed wyborem ścianki).
 */
export function cardFitsSlot(
  card: Card,
  slotKey: SlotKey,
  family?: FamilyId,
): boolean {
  if (card.category === 'eter11') return true;
  if (card.category === 'blackswan') return false;
  if (card.category !== slotKey) return false;
  if (family === undefined) return true;
  return card.family === family;
}

/** Czy karta pasuje do ścianki danego problemu — wersja czytająca rodzinę ze ścianki. */
export function cardFitsProblemSlot(
  card: Card,
  problem: Problem,
  slotKey: SlotKey,
): boolean {
  const slot = problem.slots.find((s) => s.key === slotKey);
  if (!slot) return false;
  return cardFitsSlot(card, slotKey, slot.family);
}

/**
 * Ile kart wymaga slot.
 * Czarny Łabędź 'doubleRequirements' podwaja wymagania, ale tylko dla slotów
 * niezapełnionych w chwili jego zagrania.
 */
export function requiredCountForSlot(
  mission: MissionState,
  problemId: string,
  slotKey: SlotKey,
): number {
  const doubled = mission.activeBlackSwans.includes('doubleRequirements');
  if (!doubled) return 1;
  if (mission.slotsFilledBeforeDoubling.includes(slotId(problemId, slotKey))) return 1;
  return 2;
}

export function cardsInSlot(
  mission: MissionState,
  problemId: string,
  slotKey: SlotKey,
): number {
  return mission.played.filter(
    (p) => p.problemId === problemId && p.slotKey === slotKey,
  ).length;
}

export function isSlotFilled(
  mission: MissionState,
  problemId: string,
  slotKey: SlotKey,
): boolean {
  return (
    cardsInSlot(mission, problemId, slotKey) >=
    requiredCountForSlot(mission, problemId, slotKey)
  );
}

export function isProblemSolved(mission: MissionState, problem: Problem): boolean {
  return problem.slots.every((slot) => isSlotFilled(mission, problem.id, slot.key));
}

/** Misja rozwiązana, gdy WSZYSTKIE jej problemy są rozwiązane. */
export function isMissionSolved(mission: MissionState): boolean {
  return mission.problems.every((problem) => isProblemSolved(mission, problem));
}
