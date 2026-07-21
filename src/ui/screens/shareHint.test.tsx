import { describe, expect, it } from 'vitest';
import { isCompetence } from '../components/categoryStyles';

/**
 * Talentu i mentora nie da się przekazać innemu graczowi — dzielić można się
 * kompetencjami, nie cechami charakteru ani ludźmi.
 *
 * Zasada jest w porządku, ale ekran podsumowania po prostu nie pokazywał przy
 * takiej karcie przycisku „przekaż". Gracz widział kartę z jedną opcją
 * zamiast dwóch i zgłosił to jako zepsutą grę — nie miał skąd wiedzieć, że
 * tak ma być.
 *
 * Ten test pilnuje samej reguły, na której opiera się komunikat. Gdyby ktoś
 * dopisał talent do kompetencji, wyjaśnienie zaczęłoby kłamać.
 */
describe('kto może dostać kartę', () => {
  it('kompetencje wolno przekazywać', () => {
    expect(isCompetence('psychological')).toBe(true);
    expect(isCompetence('digital')).toBe(true);
    expect(isCompetence('social')).toBe(true);
  });

  it('talentu i mentora nie', () => {
    expect(isCompetence('talent')).toBe(false);
    expect(isCompetence('mentor')).toBe(false);
  });

  it('kart specjalnych tym bardziej', () => {
    expect(isCompetence('eter11')).toBe(false);
    expect(isCompetence('blackswan')).toBe(false);
  });
});
