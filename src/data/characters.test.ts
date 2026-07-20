import { describe, it, expect } from 'vitest';
import { isIconName } from '../ui/icons/Icon';
import { ALL_CHARACTERS } from './characters';

describe('ALL_CHARACTERS', () => {
  it('ma unikalne identyfikatory', () => {
    const ids = ALL_CHARACTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('zawiera wszystkie trzy typy postaci z instrukcji', () => {
    for (const kind of ['child', 'parent', 'teacher'] as const) {
      const count = ALL_CHARACTERS.filter((c) => c.kind === kind).length;
      expect(count, `brak postaci typu ${kind}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('każda postać ma nazwę, cechy i emoji', () => {
    for (const character of ALL_CHARACTERS) {
      expect(character.name.length).toBeGreaterThan(0);
      expect(character.traits.length).toBeGreaterThan(0);
      expect(isIconName(character.icon)).toBe(true);
    }
  });
});
