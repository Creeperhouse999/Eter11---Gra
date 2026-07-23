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

/**
 * Pierwsza wolna ścianka, do której pasuje karta — albo `null`.
 *
 * „Wolna" znaczy niezapełniona wg `isSlotFilled`, więc przy Czarnym Łabędziu
 * podwajającym wymagania ścianka z jedną kartą wciąż się liczy jako wolna na
 * drugą. Wcześniej widok szukał ścianki bez ŻADNEJ karty, przez co podwójny
 * klik nie dokładał drugiej karty do podwojonej ścianki.
 */
export function firstOpenSlotFor(
  mission: MissionState,
  card: Card,
): { problemId: string; slotKey: SlotKey } | null {
  for (const problem of mission.problems) {
    for (const slot of problem.slots) {
      if (isSlotFilled(mission, problem.id, slot.key)) continue;
      if (cardFitsSlot(card, slot.key, slot.family)) {
        return { problemId: problem.id, slotKey: slot.key };
      }
    }
  }
  return null;
}

function isProblemSolved(mission: MissionState, problem: Problem): boolean {
  return problem.slots.every((slot) => isSlotFilled(mission, problem.id, slot.key));
}

/** Misja rozwiązana, gdy WSZYSTKIE jej problemy są rozwiązane. */
export function isMissionSolved(mission: MissionState): boolean {
  return mission.problems.every((problem) => isProblemSolved(mission, problem));
}
