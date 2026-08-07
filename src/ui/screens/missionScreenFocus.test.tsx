import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import { MissionScreen } from './MissionScreen';
import { createGame, DEFAULT_CONFIG, reduce } from '../../engine/reducer';
import { makeCard, testProblem } from '../../engine/testFixtures';
import type { Action, Character, GameState } from '../../engine/types';
import type { Game } from '../useGame';

const testCharacters: Character[] = [
  { id: 'c1', name: 'Ala', kind: 'child', traits: '', icon: 'star' },
];

/**
 * Misja solo (jak w samouczku — jeden gracz) z dokładnie jedną, pasującą
 * kartą na ręce, pustą talią do dobierania i drugą wolną ścianką w tym samym
 * problemie. Po zagraniu jedynej karty: misja się nie kończy (druga ścianka
 * nadal czeka), talia nie ma czym dobrać, a przy jednym graczu tura i tak
 * wraca do niego — więc jego ręka zostaje naprawdę pusta na ekranie.
 */
function soloMissionWithOneCardLeft(): GameState {
  const base = createGame({
    players: [{ id: 'c1', name: 'Ala', characterId: 'c1' }],
    deck: [],
    problems: [testProblem('a')],
    seed: 42,
    config: DEFAULT_CONFIG,
  });
  const { state: started } = reduce(base, { type: 'START_MISSION' });
  const slot = started.mission!.problems[0].slots[0];
  const lastCard = makeCard('lonely-card', slot.key);
  return {
    ...started,
    drawPile: [],
    discardPile: [],
    players: started.players.map((p) => ({ ...p, hand: [lastCard] })),
  };
}

/** Odtwarza pętlę dispatch → nowy stan, tak jak robi to prawdziwy `useGame`. */
function Harness({ initialState }: { initialState: GameState }) {
  const [state, setState] = useState(initialState);
  const game: Game = {
    state,
    dispatch: (action: Action) => {
      const result = reduce(state, action);
      setState(result.state);
    },
    rejection: null,
    dismissRejection: () => {},
    history: [],
    undo: () => {},
    overrideState: (next: GameState) => setState(next),
    abandon: () => {},
  };
  return <MissionScreen game={game} characters={testCharacters} alwaysRevealed />;
}

describe('MissionScreen — fokus po zagraniu ostatniej karty', () => {
  it('nie wraca na body, gdy zagrana karta była jedyną kartą na ręce', async () => {
    const { container } = render(<Harness initialState={soloMissionWithOneCardLeft()} />);

    const handButton = container.querySelector<HTMLElement>('[data-tour="hand"] button');
    expect(handButton).not.toBeNull();

    // `useScreenTitle` przenosi fokus na nagłówek już przy montowaniu — bez
    // jawnego ustawienia go na karcie test nie odróżniłby naprawy od bugu
    // (fokus po prostu zostałby tam, gdzie wylądował przy starcie ekranu).
    // Gracz na klawiaturze, który dotarł Tabem do karty i ją aktywował,
    // naprawdę ma na niej fokus w tym momencie — tak wygląda ten scenariusz.
    act(() => handButton!.focus());
    expect(document.activeElement).toBe(handButton);

    // Podwójny klik zagrywa kartę na pierwszą pasującą ściankę (`quickPlay`).
    // Osobny `act` na przerysowanie i osobny na `requestAnimationFrame` —
    // inaczej kolejność jest niegwarantowana i fokus łapałby jeszcze starą,
    // niezaktualizowaną rękę.
    await act(async () => {
      fireEvent.dblClick(handButton!);
    });
    await act(async () => {
      // Fokus po zagraniu ustawia się w `requestAnimationFrame`.
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    // Ręka jest teraz pusta — dawny cel fokusu zniknął z drzewa.
    expect(container.querySelector('[data-tour="hand"] button')).toBeNull();

    // Fokus nie mógł spaść na `body`: gracz na klawiaturze straciłby miejsce
    // w dokumencie tak samo, jak w błędzie, który to zachowanie miało naprawić.
    expect(document.activeElement).not.toBe(document.body);
  });
});
