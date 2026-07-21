import { describe, expect, it } from 'vitest';
import { searchContent } from './globalSearch';
import { BUILTIN_CONTENT } from '../data/builtinContent';

/**
 * Wyszukiwarka istniała tylko w kartach, a redaktor pisze też problemy,
 * teksty interfejsu, wstęp i kwestie ETER11. „Gdzie ja wpisałem to zdanie"
 * wymagało obejścia siedmiu zakładek i czytania ich po kolei.
 */
describe('szukanie w całej treści', () => {
  it('nie szuka przy pustym zapytaniu', () => {
    expect(searchContent(BUILTIN_CONTENT, '')).toEqual([]);
    expect(searchContent(BUILTIN_CONTENT, '   ')).toEqual([]);
  });

  it('znajduje kartę po nazwie', () => {
    const card = BUILTIN_CONTENT.cards.find((c) => c.name !== 'ETER11')!;
    const hits = searchContent(BUILTIN_CONTENT, card.name);

    expect(hits.some((h) => h.title === card.name && h.tab === 'cards')).toBe(true);
  });

  it('znajduje problem po treści historii', () => {
    const problem = BUILTIN_CONTENT.problems[0];
    const word = problem.story.split(/\s+/).find((w) => w.length > 6);
    if (!word) return;

    const hits = searchContent(BUILTIN_CONTENT, word);
    expect(hits.some((h) => h.tab === 'problems')).toBe(true);
  });

  it('sięga do wstępu i kwestii ETER11', () => {
    const scene = BUILTIN_CONTENT.intro?.story[0];
    if (!scene) return;

    const hits = searchContent(BUILTIN_CONTENT, scene.heading);
    expect(hits.some((h) => h.tab === 'story')).toBe(true);
  });

  it('dopasowuje słowa w dowolnej kolejności', () => {
    const card = BUILTIN_CONTENT.cards.find(
      (c) => c.name.split(' ').length > 1 && c.name !== 'ETER11',
    );
    if (!card) return;

    const [first, second] = card.name.split(' ');
    // Nikt nie pamięta zdania dosłownie — pamięta dwa słowa z niego,
    // często nie w tej kolejności.
    const hits = searchContent(BUILTIN_CONTENT, `${second} ${first}`);

    expect(hits.some((h) => h.title === card.name)).toBe(true);
  });

  it('podaje zakładkę, w którą trzeba przejść', () => {
    const hits = searchContent(BUILTIN_CONTENT, 'a');
    for (const hit of hits) {
      expect(hit.tab.length).toBeGreaterThan(0);
      expect(hit.where.length).toBeGreaterThan(0);
    }
  });

  it('skraca fragment do okolic trafienia', () => {
    const problem = BUILTIN_CONTENT.problems.find((p) => p.story.length > 200);
    if (!problem) return;

    const word = problem.story.split(/\s+/).filter((w) => w.length > 6).at(-1);
    if (!word) return;

    const hit = searchContent(BUILTIN_CONTENT, word).find((h) => h.tab === 'problems');
    // Cała historia problemu w wyniku zamieniłaby listę w ścianę tekstu.
    expect(hit && hit.excerpt.length).toBeLessThan(problem.story.length);
  });
});
