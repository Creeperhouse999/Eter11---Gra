import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { reduce } from '../engine/reducer';
import { giveCard, makeCard, newGame } from '../engine/testFixtures';
import type { Card, GameState, SlotKey } from '../engine/types';
import type { Room } from './types';
import { OnlineGame } from './OnlineGame';

/**
 * Przekazanie karty online odbywa się w fazie PODSUMOWANIA misji: dający
 * proponuje kartę, a biorący musi ją przyjąć w oknie „Dostajesz kartę!"
 * (CardOfferModal). Okno to renderowało się jednak wyłącznie w gałęzi fazy
 * `playing` OnlineGame — gałąź `missionSummary` zwracała wcześnie sam ekran
 * podsumowania. Skutek: w chwili, gdy przekazanie w ogóle jest możliwe, biorący
 * nie dostawał żadnego okna do kliknięcia „Przyjmij", więc nie mógł przyjąć
 * karty. Uczenie (jedyne źródło doświadczenia „za dzielenie się", warunku
 * spełnienia) było w praktyce nieosiągalne online.
 */

const FILL: Array<[Card['category'], SlotKey]> = [
  ['psychological', 'psychological'],
  ['digital', 'digital'],
  ['social', 'social'],
  ['mentor', 'mentor'],
  ['talent', 'talent'],
];

/** Stan w podsumowaniu wygranej misji, z kartami zagranymi przez p1 i p2. */
function summaryState(): GameState {
  let state = reduce(newGame(), { type: 'START_MISSION' }).state;
  const problemId = state.mission!.problems[0].id;
  FILL.forEach(([category, slotKey], index) => {
    const playerId = state.players[state.activePlayerIndex].id;
    const injected = makeCard(`fill-${index}`, category);
    state = giveCard(state, playerId, injected);
    state = reduce(state, {
      type: 'PLAY_CARD', playerId, cardId: injected.id, slotKey, problemId, fromMat: false,
    }).state;
  });
  return state;
}

function roomWithOffer(state: GameState): Room {
  return {
    code: 'ABCD',
    phase: 'playing',
    hostUid: 'p1',
    players: {
      p1: { uid: 'p1', name: 'Ala', characterId: 'c1', online: true, ready: true, joinedAt: 1 },
      p2: { uid: 'p2', name: 'Bartek', characterId: 'c2', online: true, ready: true, joinedAt: 2 },
    },
    state,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    // p1 proponuje p2 kartę fill-0 (zagraną przez p1 w tej misji).
    offer: { fromUid: 'p1', toUid: 'p2', cardId: 'fill-0', at: 0 },
    createdAt: 0,
  };
}

const noopProps = {
  dispatch: vi.fn(async () => null),
  propose: vi.fn(async () => {}),
  react: vi.fn(async () => {}),
  reactions: [],
  onAcceptOffer: vi.fn(async () => null),
  onDeclineOffer: vi.fn(),
  onLeave: vi.fn(),
};

describe('OnlineGame — okno przyjęcia karty w podsumowaniu', () => {
  it('biorący widzi okno „Dostajesz kartę" w fazie missionSummary', () => {
    const state = summaryState();
    expect(state.phase).toBe('missionSummary');

    render(
      <OnlineGame
        room={roomWithOffer(state)}
        uid="p2"
        myTurn={false}
        activeUid="p1"
        {...noopProps}
      />,
    );

    // Biorący (p2) musi dostać okno z przyciskiem „Przyjmij".
    expect(screen.getByText(/Dostajesz kartę/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Przyjmij/i })).toBeTruthy();
  });

  it('odrzucone przyjęcie pokazuje powód zamiast po cichu zamknąć okno', async () => {
    const state = summaryState();
    const onAcceptOffer = vi.fn(async () => 'Bartek zabrał już kartę w tej misji.');

    render(
      <OnlineGame
        room={roomWithOffer(state)}
        uid="p2"
        myTurn={false}
        activeUid="p1"
        {...noopProps}
        onAcceptOffer={onAcceptOffer}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Przyjmij/i }));

    await waitFor(() => {
      expect(screen.getByText(/zabrał już kartę/i)).toBeTruthy();
    });
    expect(onAcceptOffer).toHaveBeenCalledTimes(1);
  });
});
