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
 * Gracz, który wyłożył jedną kartę i zabrał ją na swoją postać, NIE może na
 * podsumowaniu zobaczyć „nie wyłożył żadnej karty".
 *
 * Przyczyna: zabrana karta schodzi z `mission.played` (żeby nie liczyła się
 * dwa razy — leży już na macie zabierającego). Gdy była to JEDYNA wyłożona
 * karta, jego lista `played` robi się pusta i ekran mylnie twierdziłby, że nic
 * nie zagrał. Ten sam pusty stan ma jednak też obdarowany, który faktycznie
 * nic nie wyłożył (dostanie karty wpisuje go do `takenToMat`) — jemu należy
 * się właśnie ten komunikat. Test pilnuje, że rozróżniamy oba przypadki.
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

describe('SummaryScreen — zabrana jedyna karta', () => {
  it('zabierający swoją jedyną kartę nie widzi „nie wyłożył żadnej karty"', () => {
    let state = summaryWithSinglePlay();
    const cardId = state.mission!.played[0].card.id;

    state = reduce(state, {
      type: 'TAKE_CARD_TO_MAT',
      playerId: 'p1',
      cardId,
    }).state;

    // Po zabraniu p1 nie ma już nic w `played` — a jednak wyłożył kartę.
    expect(state.mission!.played.filter((p) => p.playerId === 'p1')).toHaveLength(0);
    // Karta leży na jego macie, nie zniknęła.
    expect(state.players.find((p) => p.id === 'p1')!.mat.map((c) => c.id)).toContain(cardId);

    render(<SummaryScreen game={gameFor(state)} />);

    // Zabierający dostaje uczciwy komunikat o zabraniu, nie „nic nie wyłożył".
    expect(screen.queryByText(/zabrał swoją wyłożoną kartę/i)).not.toBeNull();
    // „Nie wyłożył żadnej karty" zostaje tylko dla Bo, który faktycznie nic
    // nie wyłożył — dokładnie jedno wystąpienie.
    expect(screen.getAllByText(/nie wyłożył żadnej karty/i)).toHaveLength(1);
  });
});
