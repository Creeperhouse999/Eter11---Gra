import { describe, expect, it } from 'vitest';
import { BUILTIN_CONTENT } from './builtinContent';
import { DEFAULT_INTRO } from './intro';
import { TUTORIAL_STEPS } from './tutorial';

/**
 * Wstęp i kwestie ETER11 leżały wyłącznie w kodzie, więc poprawka literówki
 * w tekście czytanym przez dziecko wymagała programisty i wdrożenia.
 *
 * Teraz jadą razem z resztą zawartości. Te testy pilnują dwóch rzeczy:
 * że teksty w ogóle są w zawartości, i że pusta wartość z panelu nie
 * zostawia gracza z pustym ekranem.
 */
describe('wstęp i samouczek w zawartości gry', () => {
  it('jadą razem z kartami i problemami', () => {
    expect(BUILTIN_CONTENT.intro?.story.length).toBeGreaterThan(0);
    expect(BUILTIN_CONTENT.intro?.rules.length).toBeGreaterThan(0);
    expect(BUILTIN_CONTENT.intro?.adults.length).toBeGreaterThan(0);
    expect(BUILTIN_CONTENT.tutorial?.length).toBeGreaterThan(0);
  });

  it('każda scena wstępu ma nagłówek, treść i ikonę', () => {
    const scenes = [
      ...DEFAULT_INTRO.story,
      ...DEFAULT_INTRO.rules,
      ...DEFAULT_INTRO.adults,
    ];

    for (const scene of scenes) {
      expect(scene.heading.trim().length).toBeGreaterThan(0);
      expect(scene.body.trim().length).toBeGreaterThan(0);
      expect(scene.icon.trim().length).toBeGreaterThan(0);
    }
  });

  it('każdy krok samouczka ma co powiedzieć i czym pochwalić', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.say.trim().length).toBeGreaterThan(0);
      expect(step.praise.trim().length).toBeGreaterThan(0);
      // `nudge` jest opcjonalne, ale pusty łańcuch pokazałby pusty dymek.
      if (step.nudge !== undefined) {
        expect(step.nudge.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
