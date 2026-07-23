import { describe, it, expect } from 'vitest';
import { ALL_CARDS } from './cards';
import { ALL_PROBLEMS } from './problems';
import { cardFitsSlot } from '../engine/rules';

/**
 * Każda ścianka każdego GRYWALNEGO problemu musi mieć w talii kartę, która ją
 * zamknie.
 *
 * Ścianka wymaga karty tej samej kategorii i rodziny. Gdyby redaktor dodał
 * problem ze ścianką (np. „mentor / żółty"), a w talii nie ma żadnego żółtego
 * mentora, problemu NIE DA SIĘ rozwiązać — a nikt by tego nie zauważył aż do
 * rozgrywki, w której misja jest przegrana bez błędu gracza. Ten test pilnuje
 * tego na wbudowanych danych, żeby taka luka nie weszła niezauważona.
 *
 * Karty i problemy oznaczone `draft` są pomijane: to materiał roboczy, jeszcze
 * nie w grze.
 */

type Draftable = { draft?: boolean };
const active = <T extends Draftable>(items: T[]) => items.filter((i) => !i.draft);

describe('pokrycie ścianek kartami', () => {
  const playableCards = active(ALL_CARDS);
  const playableProblems = active(ALL_PROBLEMS);

  it('każda ścianka grywalnego problemu ma pasującą grywalną kartę', () => {
    const gaps: string[] = [];

    for (const problem of playableProblems) {
      for (const slot of problem.slots) {
        const hasMatch = playableCards.some((card) =>
          cardFitsSlot(card, slot.key, slot.family),
        );
        if (!hasMatch) {
          gaps.push(`${problem.id} / ${slot.key} (${slot.family})`);
        }
      }
    }

    expect(gaps, `ścianki bez pasującej karty: ${gaps.join('; ')}`).toEqual([]);
  });

  it('grywalnych problemów jest co najmniej kilka', () => {
    // Zabezpieczenie przed sytuacją, w której filtr `draft` przypadkiem
    // odsiał wszystko i test pokrycia stałby się pusty (fałszywie zielony).
    expect(playableProblems.length).toBeGreaterThan(3);
    expect(playableCards.length).toBeGreaterThan(10);
  });
});
