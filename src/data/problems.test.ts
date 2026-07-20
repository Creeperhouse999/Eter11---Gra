import { describe, it, expect } from 'vitest';
import { isIconName } from '../ui/icons/Icon';
import { ALL_PROBLEMS } from './problems';
import { ALL_CARDS } from './cards';

describe('ALL_PROBLEMS', () => {
  it('ma unikalne identyfikatory', () => {
    const ids = ALL_PROBLEMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('każdy problem ma dokładnie 4 ścianki w ustalonej kolejności', () => {
    for (const problem of ALL_PROBLEMS) {
      expect(problem.slots.map((s) => s.key), `problem ${problem.id}`).toEqual([
        'psychological', 'digital', 'social', 'mentorTalent',
      ]);
    }
  });

  it('każdy problem ma komplet treści', () => {
    for (const problem of ALL_PROBLEMS) {
      expect(problem.name.length, `${problem.id}: nazwa`).toBeGreaterThan(0);
      expect(problem.story.length, `${problem.id}: historia`).toBeGreaterThan(20);
      expect(problem.antagonist.length, `${problem.id}: przeciwnik`).toBeGreaterThan(0);
      expect(problem.consequence.length, `${problem.id}: konsekwencja`).toBeGreaterThan(0);
      expect(problem.goal.length, `${problem.id}: cel`).toBeGreaterThan(0);
      expect(isIconName(problem.icon), `${problem.id}: nieznana ikona ${problem.icon}`).toBe(true);
    }
  });

  it('każda ścianka ma podpowiedź dla graczy', () => {
    for (const problem of ALL_PROBLEMS) {
      for (const slot of problem.slots) {
        expect(slot.hint.length, `${problem.id}/${slot.key}`).toBeGreaterThan(0);
      }
    }
  });

  it('karty bonusowe wskazują na istniejące karty', () => {
    const cardIds = new Set(ALL_CARDS.map((c) => c.id));
    for (const problem of ALL_PROBLEMS) {
      for (const slot of problem.slots) {
        for (const bonusId of slot.bonusCardIds) {
          expect(cardIds.has(bonusId), `${problem.id}: nieznana karta ${bonusId}`).toBe(true);
        }
      }
    }
  });

  it('karty bonusowe pasują kategorią do swojej ścianki', () => {
    const byId = new Map(ALL_CARDS.map((c) => [c.id, c]));
    for (const problem of ALL_PROBLEMS) {
      for (const slot of problem.slots) {
        for (const bonusId of slot.bonusCardIds) {
          const card = byId.get(bonusId)!;
          const fits = slot.key === 'mentorTalent'
            ? card.category === 'mentor' || card.category === 'talent'
            : card.category === slot.key;
          expect(fits, `${problem.id}: ${bonusId} (${card.category}) nie pasuje do ${slot.key}`).toBe(true);
        }
      }
    }
  });
});

describe('komplet talii problemów', () => {
  it('zawiera 13 problemów', () => {
    expect(ALL_PROBLEMS).toHaveLength(13);
  });

  it('zawiera problemy każdego typu', () => {
    for (const type of ['action', 'thinking', 'cooperation', 'selfchange'] as const) {
      const count = ALL_PROBLEMS.filter((p) => p.type === type).length;
      expect(count, `brak problemów typu ${type}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('problemy dopisane technicznie są oznaczone flagą draft', () => {
    const drafts = ALL_PROBLEMS.filter((p) => p.draft).map((p) => p.id);
    expect(drafts).toEqual(['prob-09', 'prob-11', 'prob-12', 'prob-13']);
  });
});
