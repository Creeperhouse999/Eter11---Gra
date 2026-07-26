import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Coach } from './Coach';
import { reduce } from '../../engine/reducer';
import { newGame, makeCard } from '../../engine/testFixtures';
import type { GameState } from '../../engine/types';

/**
 * Pasek podpowiedzi ma prowadzić do PRAWIDŁOWEGO ruchu. „Pasuje" musi znaczyć
 * „pasuje do WOLNEJ ścianki" — dokładnie tak, jak liczy silnik (isSlotFilled)
 * i reszta widoku (MissionScreen.hasPlayableCard, firstOpenSlotFor). Karta,
 * której jedyna pasująca kolorem ścianka jest już zamknięta, nie jest
 * grywalna: podpowiedź „przeciągnij ją tam" kończyłaby się odrzuceniem ruchu,
 * a dziecko nie wiedziałoby dlaczego.
 */

/** Stan misji, w którym jedyna ścianka pasująca do karty gracza jest zajęta. */
function stateWithFilledSocialSlot(): { state: GameState; card: ReturnType<typeof makeCard> } {
  let state = reduce(newGame(), { type: 'START_MISSION' }).state;
  const problem = state.mission!.problems[0];
  const myCard = makeCard('moja-social', 'social'); // kategoria social, rodzina red
  const filler = makeCard('zapchajdziura-social', 'social');
  const active = state.activePlayerIndex;

  state = {
    ...state,
    players: state.players.map((p, i) => (i === active ? { ...p, hand: [myCard] } : p)),
    mission: {
      ...state.mission!,
      // Ścianka social już domknięta cudzą kartą (wymóg 1, jest 1).
      played: [
        {
          card: filler,
          playerId: 'inny',
          slotKey: 'social',
          problemId: problem.id,
          fromMat: false,
        },
      ],
    },
  };

  return { state, card: myCard };
}

describe('Coach — „pasuje" znaczy „do wolnej ścianki"', () => {
  it('z wybraną kartą pasującą tylko do ZAJĘTEJ ścianki nie mówi „przeciągnij tam"', () => {
    const { state, card } = stateWithFilledSocialSlot();
    render(
      <Coach
        state={state}
        player={state.players[state.activePlayerIndex]}
        selectedCard={card}
        handRevealed
        swapMode={false}
      />,
    );
    expect(screen.getByText(/nie pasuje do żadnej wolnej ścianki/i)).toBeDefined();
    // Nie może paść instrukcja zagrania — ruch i tak zostałby odrzucony.
    expect(screen.queryByText(/Przeciągnij ją tam/i)).toBeNull();
  });

  it('bez wyboru nie liczy karty pasującej tylko do zajętej ścianki jako grywalnej', () => {
    const { state } = stateWithFilledSocialSlot();
    render(
      <Coach
        state={state}
        player={state.players[state.activePlayerIndex]}
        selectedCard={null}
        handRevealed
        swapMode={false}
      />,
    );
    expect(
      screen.getByText(/Żadna Twoja karta nie pasuje do wolnych ścianek/i),
    ).toBeDefined();
  });
});
