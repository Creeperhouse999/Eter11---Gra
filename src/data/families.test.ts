import { describe, it, expect } from 'vitest';
import { ALL_CARDS } from './cards';
import { ALL_PROBLEMS } from './problems';
import { DEFAULT_FAMILIES, FAMILY_IDS, findFamily } from './families';
import { isIconName } from '../ui/icons/Icon';
import type { CardCategory } from '../engine/types';

const WITH_FAMILIES: CardCategory[] = [
  'psychological',
  'digital',
  'social',
  'mentor',
  'talent',
];

describe('rodziny kart', () => {
  it('każda kategoria ma cztery rodziny', () => {
    for (const category of WITH_FAMILIES) {
      expect(DEFAULT_FAMILIES[category].map((f) => f.id).sort()).toEqual(
        [...FAMILY_IDS].sort(),
      );
    }
  });

  it('karty specjalne nie mają rodzin', () => {
    expect(DEFAULT_FAMILIES.eter11).toHaveLength(0);
    expect(DEFAULT_FAMILIES.blackswan).toHaveLength(0);
  });

  it('każda rodzina ma nazwę, opis i znaną ikonę', () => {
    for (const category of WITH_FAMILIES) {
      for (const family of DEFAULT_FAMILIES[category]) {
        expect(family.name.length, `${category}/${family.id}`).toBeGreaterThan(0);
        expect(family.description.length, `${category}/${family.id}`).toBeGreaterThan(0);
        expect(isIconName(family.icon), `${category}/${family.id}`).toBe(true);
      }
    }
  });

  it('findFamily znajduje rodzinę po kategorii i kolorze', () => {
    const family = findFamily(DEFAULT_FAMILIES, 'psychological', 'red');
    expect(family?.name).toBe('Siła wewnętrzna');
  });
});

describe('talia w podziale na rodziny', () => {
  it('każda kategoria ma po trzy karty w każdej rodzinie', () => {
    for (const category of WITH_FAMILIES) {
      for (const familyId of FAMILY_IDS) {
        const count = ALL_CARDS.filter(
          (c) => c.category === category && c.family === familyId,
        ).length;
        expect(count, `${category}/${familyId}`).toBe(3);
      }
    }
  });

  it('talia ma 60 kart kompetencji, talentów i mentorów', () => {
    const regular = ALL_CARDS.filter(
      (c) => c.category !== 'eter11' && c.category !== 'blackswan',
    );
    expect(regular).toHaveLength(60);
  });

  it('każda karta poza specjalnymi ma rodzinę', () => {
    for (const card of ALL_CARDS) {
      const special = card.category === 'eter11' || card.category === 'blackswan';
      expect(Boolean(card.family), `karta ${card.id}`).toBe(!special);
    }
  });
});

describe('ścianki problemów a rodziny', () => {
  it('każda ścianka wymaga rodziny', () => {
    for (const problem of ALL_PROBLEMS) {
      for (const slot of problem.slots) {
        expect(FAMILY_IDS, `${problem.id}/${slot.key}`).toContain(slot.family);
      }
    }
  });

  it('każdą ściankę da się zapełnić kartą z talii', () => {
    for (const problem of ALL_PROBLEMS) {
      for (const slot of problem.slots) {
        const matching = ALL_CARDS.filter(
          (c) => c.category === slot.key && c.family === slot.family,
        );
        expect(
          matching.length,
          `${problem.id}/${slot.key}: brak kart ${slot.key} w rodzinie ${slot.family}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('żadna rodzina nie jest pomijana w problemach', () => {
    const used = new Set(ALL_PROBLEMS.flatMap((p) => p.slots.map((s) => s.family)));
    for (const familyId of FAMILY_IDS) {
      expect(used.has(familyId), `rodzina ${familyId} nieużywana`).toBe(true);
    }
  });
});
