import { describe, expect, it } from 'vitest';
import { isCompetence } from '../components/categoryStyles';

/**
 * `isCompetence` mówi, czy kategoria to kompetencja (psychologiczna, cyfrowa,
 * społeczna) — używają jej zliczenia i walidacja treści, np. pokrycie ścianek
 * problemu. To INNE pytanie niż „czy kartą wolno się podzielić z innym
 * graczem" — tamto sprawdza `isShareable` (patrz `shareHint.test.tsx`
 * w historii: mentor kiedyś nie był shareable, dziś Adam ustalił, że jest —
 * `isCompetence` się wtedy NIE zmieniło, bo mentor nadal nie jest
 * kompetencją, tylko osobną kategorią).
 *
 * Ten test pilnuje samej definicji kompetencji, nie reguły przekazywania.
 */
describe('które kategorie są kompetencjami', () => {
  it('psychologiczna, cyfrowa i społeczna — tak', () => {
    expect(isCompetence('psychological')).toBe(true);
    expect(isCompetence('digital')).toBe(true);
    expect(isCompetence('social')).toBe(true);
  });

  it('talent i mentor — nie (osobne kategorie, nie kompetencje)', () => {
    expect(isCompetence('talent')).toBe(false);
    expect(isCompetence('mentor')).toBe(false);
  });

  it('kart specjalnych tym bardziej', () => {
    expect(isCompetence('eter11')).toBe(false);
    expect(isCompetence('blackswan')).toBe(false);
  });
});
