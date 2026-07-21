import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';

/**
 * Panel ostrzega, gdy talia jest przechylona: rodzina decyduje o dopasowaniu
 * karty do ścianki, więc nierówny rozkład robi część problemów zależnymi od
 * szczęścia w losowaniu, a nie od decyzji dzieci.
 *
 * Ostrzeżenie, które krzyczy na poprawnej talii, nauczyłoby redaktora je
 * ignorować — a wtedy przestałoby działać także wtedy, gdy coś naprawdę
 * będzie nie tak. Te testy pilnują progów od tej strony.
 */
describe('balans talii wbudowanej', () => {
  it('rodziny są równo obsadzone', () => {
    const counts = new Map<string, number>();
    for (const card of ALL_CARDS) {
      if (!card.family) continue;
      counts.set(card.family, (counts.get(card.family) ?? 0) + 1);
    }

    const values = [...counts.values()];
    expect(values.length).toBeGreaterThan(1);
    // Próg ostrzeżenia to trzykrotność — poprawna talia musi być znacznie niżej.
    expect(Math.max(...values)).toBeLessThan(Math.min(...values) * 3);
  });

  it('każda ścianka ma z czego być domknięta', () => {
    const thin: string[] = [];

    for (const problem of ALL_PROBLEMS) {
      for (const slot of problem.slots) {
        const matching = ALL_CARDS.filter(
          (card) => card.category === slot.key && card.family === slot.family,
        ).length;
        if (matching < 3) thin.push(`${problem.name} → ${slot.key}/${slot.family}: ${matching}`);
      }
    }

    expect(thin).toEqual([]);
  });
});
