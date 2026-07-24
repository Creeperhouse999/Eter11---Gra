import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupGame } from '../useGame';
import { reduce } from '../../engine/reducer';
import { ALL_CARDS } from '../../data/cards';
import { ALL_PROBLEMS } from '../../data/problems';
import { ALL_CHARACTERS } from '../../data/characters';
import type { Game } from '../useGame';
import type { GameState } from '../../engine/types';
import { SummaryScreen } from './SummaryScreen';

/**
 * Gracz, który wyłożył jedną kartę i przekazał ją innemu, NIE może na
 * podsumowaniu zobaczyć „nie wyłożył żadnej karty".
 *
 * Przyczyna: przekazana karta schodzi z `mission.played` (żeby nie liczyła się
 * dwa razy — leży już na macie odbiorcy). Gdy była to JEDYNA wyłożona karta
 * dającego, jego lista `played` robi się pusta i ekran mylnie twierdzi, że nic
 * nie zagrał — choć zagrał i jeszcze nauczył kolegę. Test pilnuje, żeby
 * dającemu pokazać prawdę, a odbiorcy (który faktycznie nic nie wyłożył) —
 * normalny komunikat.
 */

/** Minimalna atrapa gry — SummaryScreen czyta tylko te pola. */
function gameFor(state: GameState): Game {
  return {
    state,
    dispatch: () => {},
    rejection: null,
    dismissRejection: () => {},
  } as unknown as Game;
}

/** Stan podsumowania: p1 wyłożył jedną kompetencję, nikt nic poza tym. */
function summaryWithSinglePlay(): GameState {
  const base = setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: ALL_CHARACTERS[0].id },
      { id: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id },
    ],
    7,
  );
  const comp = ALL_CARDS.find((c) => c.category === 'social' && !c.draft)!;
  const problem = ALL_PROBLEMS[0];

  return {
    ...base,
    // Puste ręce w krafcie stanu, żeby id wyłożonej karty nie kolidowało
    // z kartą rozdaną z prawdziwej talii.
    players: base.players.map((p) => ({ ...p, hand: [], mat: [] })),
    phase: 'missionSummary',
    missionNumber: 1,
    mission: {
      problems: [problem],
      played: [
        {
          card: comp,
          playerId: 'p1',
          slotKey: 'social',
          problemId: problem.id,
          fromMat: false,
        },
      ],
      round: 3,
      phase: 'lost',
      matUsedBy: [],
      activeBlackSwans: [],
      slotsFilledBeforeDoubling: [],
      takenToMat: [],
      sharedCardIds: [],
      swappedThisRound: [],
      pendingSwanEvents: [],
    },
  };
}

describe('SummaryScreen — przekazana jedyna karta', () => {
  it('dający, który oddał swoją jedyną kartę, nie widzi „nie wyłożył żadnej karty"', () => {
    let state = summaryWithSinglePlay();
    const cardId = state.mission!.played[0].card.id;

    state = reduce(state, {
      type: 'SHARE_CARD',
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      cardId,
    }).state;

    // Po przekazaniu p1 nie ma już nic w `played` — to właśnie tu ekran kłamał.
    expect(state.mission!.played.filter((p) => p.playerId === 'p1')).toHaveLength(0);

    render(<SummaryScreen game={gameFor(state)} />);

    // Dający dostaje uczciwy komunikat o przekazaniu.
    expect(screen.queryByText(/przekaza/i)).not.toBeNull();

    // „Nie wyłożył żadnej karty" zostaje tylko dla odbiorcy (Bo), który
    // faktycznie nic nie wyłożył — dokładnie jedno wystąpienie, nie dwa.
    expect(screen.getAllByText(/nie wyłożył żadnej karty/i)).toHaveLength(1);
  });
});
