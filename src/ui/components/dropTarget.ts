import { cardFitsSlot, isSlotFilled } from '../../engine/rules';
import type { Card, MissionState } from '../../engine/types';

/**
 * Czy karta może TERAZ wylądować na ściance wskazanej przez „problemId:slotKey".
 *
 * Dwa warunki, dokładnie jak sprawdza silnik przy PLAY_CARD: karta pasuje
 * kolorem (`cardFitsSlot`) ORAZ ścianka jest jeszcze wolna (`!isSlotFilled`,
 * które przy podwojeniu wymagań przez Czarnego Łabędzia liczy ściankę z jedną
 * kartą wciąż jako wolną). Używane do sygnału „upuść tu" ducha przeciąganej
 * karty — bez sprawdzenia zajętości duch świecił na zielono także nad ścianką
 * domkniętą, a upuszczenie i tak kończyło się odrzuceniem ruchu.
 */
export function isOpenDropTarget(
  mission: MissionState,
  targetId: string,
  card: Card,
): boolean {
  const [problemId, slotKey] = targetId.split(':');
  const problem = mission.problems.find((p) => p.id === problemId);
  const slot = problem?.slots.find((s) => s.key === slotKey);
  if (!slot) return false;

  return (
    !isSlotFilled(mission, problemId, slot.key) &&
    cardFitsSlot(card, slot.key, slot.family)
  );
}
