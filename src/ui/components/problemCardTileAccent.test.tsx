import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProblemCard } from './ProblemCard';
import { createGame, DEFAULT_CONFIG, reduce } from '../../engine/reducer';
import { testProblem } from '../../engine/testFixtures';

/**
 * Poświata ścianki w wyglądzie „Kolorowy" (theme.css, `.eter-tile`) liczy się
 * z `--eter-tile-accent`, nie z `currentColor` — z tego samego powodu co przy
 * CardView (patrz CardView.test.tsx): `currentColor` na przycisku ścianki to
 * zwykły kolor tekstu, nie kolor rodziny, której ścianka wymaga. Bez tej
 * zmiennej ścianki świeciły jednym, ogólnym kolorem zamiast tęczą wymaganych
 * rodzin — stąd „nie różni się wiele od klasycznego".
 */
function missionWithProblem() {
  const base = createGame({
    players: [{ id: 'p1', name: 'Ala', characterId: 'c1' }],
    deck: [],
    problems: [testProblem('a')],
    seed: 1,
    config: DEFAULT_CONFIG,
  });
  const { state } = reduce(base, { type: 'START_MISSION' });
  return state.mission!;
}

describe('ProblemCard — zmienna koloru kafla dla wyglądu Kolorowy', () => {
  it('ścianka niesie kolor wymaganej rodziny w --eter-tile-accent', () => {
    const mission = missionWithProblem();
    const problem = mission.problems[0];

    const { container } = render(
      <ProblemCard
        mission={mission}
        problem={problem}
        selectedCard={null}
        onSlotClick={() => {}}
        canPlayInSlot={() => false}
      />,
    );

    // `testProblem` daje każdej ściance rodzinę „red" — patrz testFixtures.ts.
    const slot = container.querySelector<HTMLElement>('[data-slot="a:psychological"]');
    expect(slot).not.toBeNull();
    expect(slot!.style.getPropertyValue('--eter-tile-accent')).toBe('var(--eter-family-red)');
  });
});

/**
 * Symbol rodziny na ściance W GRZE — nie tylko na wydruku.
 *
 * Adam zgłosił symbole dla graczy, którzy nie rozróżniają kolorów, i po
 * pierwszej wersji dopytał o ścianki na wydruku. Ale gra toczy się też na
 * ekranie: kropka koloru przy nazwie ścianki mówiła „to czerwona" tylko
 * komuś, kto czerwień widzi. Znaczek (koło / trójkąt / kwadrat / gwiazda)
 * mówi to każdemu — i jest ten sam, co na karcie, którą trzeba tu dołożyć.
 */
describe('ProblemCard — symbol rodziny na ściance', () => {
  it('ścianka pokazuje kształt rodziny, nie samą kropkę koloru', () => {
    const mission = missionWithProblem();
    const problem = mission.problems[0];

    const { container } = render(
      <ProblemCard
        mission={mission}
        problem={problem}
        selectedCard={null}
        onSlotClick={() => {}}
        canPlayInSlot={() => false}
      />,
    );

    const slot = container.querySelector<HTMLElement>('[data-slot="a:psychological"]')!;
    // Ikona kategorii + symbol rodziny = co najmniej dwa kształty SVG.
    // Sama kropka była `<span>` bez SVG, więc miała jeden (ikonę kategorii).
    expect(slot.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
  });
});
