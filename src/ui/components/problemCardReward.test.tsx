import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProblemCard } from './ProblemCard';
import { createGame, DEFAULT_CONFIG, reduce } from '../../engine/reducer';
import { testProblem } from '../../engine/testFixtures';
import { ZDANIE_O_POTRZEBNYCH_KARTACH } from '../../data/problems';

/**
 * Adam: „zaproponuj do każdej karty opis co się zadzieje, jeśli pokonamy
 * problem (…) i dodaj zdanie na koniec: W związku z tym potrzebujemy jako
 * zespół… (przeczytajcie opisy każdej z potrzebnych kart)". Karta pokazywała
 * dotąd tylko połowę stawki — co się stanie przy porażce („Jeśli się nie
 * uda", na czerwono) — bez żadnego odpowiednika dla wygranej.
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

describe('ProblemCard — opis nagrody za rozwiązanie problemu', () => {
  it('pokazuje „Jeśli się uda" razem ze zdaniem o potrzebnych kartach', () => {
    const mission = missionWithProblem();
    const problem = { ...mission.problems[0], reward: 'Park znów tętni życiem.' };

    render(
      <ProblemCard
        mission={{ ...mission, problems: [problem] }}
        problem={problem}
        selectedCard={null}
        onSlotClick={() => {}}
        canPlayInSlot={() => false}
      />,
    );

    expect(screen.getAllByText('Jeśli się uda').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_t, el) => (el?.textContent ?? '').includes('Park znów tętni życiem.'))
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_t, el) => (el?.textContent ?? '').includes(ZDANIE_O_POTRZEBNYCH_KARTACH))
        .length,
    ).toBeGreaterThan(0);
  });

  it('bez opisanej nagrody nie pokazuje pustego nagłówka', () => {
    const mission = missionWithProblem();
    const problem = { ...mission.problems[0], reward: undefined };

    render(
      <ProblemCard
        mission={{ ...mission, problems: [problem] }}
        problem={problem}
        selectedCard={null}
        onSlotClick={() => {}}
        canPlayInSlot={() => false}
      />,
    );

    expect(screen.queryAllByText('Jeśli się uda')).toHaveLength(0);
  });
});
