import { describe, it, expect } from 'vitest';
import { TUTORIAL_STEPS, type TutorialGoal } from '../../data/tutorial';

/**
 * Niezmienniki scenariusza samouczka.
 *
 * Samouczek blokuje wszystkie ruchy poza tymi z listy `allow` danego kroku
 * (patrz `useTutorial`: `allows`). Jeśli krok WYMAGA ruchu, żeby zaliczyć swój
 * cel, a tego ruchu nie ma w `allow`, dziecko nie może kroku przejść — a że
 * `isGoalMet` czyta wyłącznie stan gry, samouczek zawiesza się bez żadnego
 * komunikatu. To najgorszy możliwy błąd w nauce: gra dla ośmiolatka staje
 * w miejscu na pierwszym kontakcie i nie da się jej ruszyć.
 *
 * Istniejące testy sprawdzały to punktowo, tylko dla `playFirst` i `swapCards`.
 * Ten test pilnuje WSZYSTKICH kroków naraz — również `playSecond`, `playThird`,
 * `playAfterSwap` i `finish` — żeby edycja listy `allow` w którymkolwiek z nich
 * nie mogła po cichu zablokować scenariusza.
 */

/**
 * Ruch, który gracz MUSI móc wykonać, żeby zaliczyć cel kroku.
 *
 * `null` = cel nie zależy od ruchu bramkowanego przez `allows`:
 * - `selectCard` zalicza samo zaznaczenie karty (nie jest to play/swap/pass),
 * - `takeCard` to akcja podsumowania misji, nie z listy `allow`,
 * - `intro`/`outro` to kroki czytane, zaliczone od razu.
 *
 * `Record<TutorialGoal, …>` celowo: dodanie nowego celu bez sklasyfikowania go
 * tutaj wywali kompilację — niezmiennik pilnuje się sam.
 */
const REQUIRED_ACTION: Record<TutorialGoal, 'play' | 'swap' | null> = {
  intro: null,
  selectCard: null,
  playFirst: 'play',
  playSecond: 'play',
  playThird: 'play',
  swapCards: 'swap',
  playAfterSwap: 'play',
  finish: 'play',
  takeCard: null,
  outro: null,
};

describe('niezmienniki kroków samouczka', () => {
  it('każdy krok pozwala na ruch, którego wymaga jego cel — inaczej cichy soft-lock', () => {
    for (const step of TUTORIAL_STEPS) {
      const required = REQUIRED_ACTION[step.goal];
      if (required) {
        expect(
          step.allow,
          `krok „${step.id}" (cel ${step.goal}) musi pozwalać na „${required}", ` +
            `inaczej gracz nie może go przejść i samouczek się zawiesza`,
        ).toContain(required);
      }
    }
  });

  it('krok czytany (readOnly) nie pozwala na żaden ruch — narracji nie da się wyprzedzić', () => {
    for (const step of TUTORIAL_STEPS) {
      if (step.readOnly) {
        expect(
          step.allow,
          `krok czytany „${step.id}" nie może pozwalać na ruch — dziecko zagrałoby ` +
            `w trakcie narracji i rozjechało ułożoną talię samouczka`,
        ).toEqual([]);
      }
    }
  });

  it('identyfikatory kroków są unikalne', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(new Set(ids).size, `duplikat id kroku w: ${ids.join(', ')}`).toBe(ids.length);
  });

  it('każdy krok ma treść wyjaśnienia i pochwały', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.say.trim().length, `krok „${step.id}" bez treści`).toBeGreaterThan(0);
      expect(step.praise.trim().length, `krok „${step.id}" bez pochwały`).toBeGreaterThan(0);
    }
  });
});
