import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { setupGame } from '../ui/useGame';
import { ALL_CHARACTERS } from '../data/characters';
import type { GameState } from '../engine/types';
import type { Room } from './types';
import { OnlineGame } from './OnlineGame';

/**
 * Gra online między misjami NIE może pokazywać pustego ekranu.
 *
 * Przyczyna błędu: START_MISSION w grze online odpalał się TYLKO raz, przy
 * starcie partii (Multiplayer.start). Po zamknięciu podsumowania misji silnik
 * wraca do fazy `setup` (mission: null) na każdą kolejną misję poza ostatnią —
 * a OnlineGame nie miał gałęzi na `setup`, więc renderował MissionScreen bez
 * misji, czyli pusty ekran. Każda partia online z więcej niż jedną misją
 * zawieszała się po pierwszym podsumowaniu.
 *
 * Naprawa: OnlineGame w fazie `setup` pokazuje ekran „odkryj problem". Odkrywa
 * gracz, którego jest kolej (order[0], zwykle host); reszta czeka.
 */

/** Stan „między misjami": faza setup, brak misji, jedna misja już za nami. */
function betweenMissionsState(): GameState {
  const base = setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: ALL_CHARACTERS[0].id },
      { id: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id },
    ],
    7,
  );
  return { ...base, phase: 'setup', mission: null, missionNumber: 1 };
}

function roomFor(state: GameState): Room {
  return {
    code: 'ABCD',
    phase: 'playing',
    hostUid: 'p1',
    players: {
      p1: { uid: 'p1', name: 'Ala', characterId: ALL_CHARACTERS[0].id, online: true, ready: true, joinedAt: 1 },
      p2: { uid: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id, online: true, ready: true, joinedAt: 2 },
    },
    state,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 0,
  };
}

const noopProps = {
  propose: vi.fn(async () => null),
  react: vi.fn(async () => {}),
  reactions: [],
  onAcceptOffer: async () => null,
  onDeclineOffer: () => {},
  onLeave: () => {},
};

describe('OnlineGame — faza setup między misjami', () => {
  it('gracz na kolejce widzi „Odkryj problem" i klik odpala START_MISSION', () => {
    const dispatch = vi.fn(async () => null);
    render(
      <OnlineGame
        room={roomFor(betweenMissionsState())}
        uid="p1"
        activeUid="p1"
        dispatch={dispatch}
        {...noopProps}
      />,
    );

    const button = screen.getByRole('button', { name: 'Odkryj problem' });
    fireEvent.click(button);
    expect(dispatch).toHaveBeenCalledWith({ type: 'START_MISSION' });
  });

  it('gracz NIE na kolejce czeka, bez przycisku odkrycia', () => {
    const dispatch = vi.fn(async () => null);
    render(
      <OnlineGame
        room={roomFor(betweenMissionsState())}
        uid="p2"
        activeUid="p1"
        dispatch={dispatch}
        {...noopProps}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Odkryj problem' })).toBeNull();
    // Czeka na aktywnego gracza (Ala), zamiast patrzeć na pusty ekran.
    expect(screen.getByText(/Ala/)).toBeDefined();
  });
});
