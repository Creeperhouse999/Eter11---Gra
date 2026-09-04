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
 * Mentora wolno przekazać innemu graczowi — Adam ustalił to wprost
 * („mentora można przekazywać, talentu nie"), a reduktor (`isShareable`,
 * `shareCard`) już to egzekwuje i jego własny komunikat odrzucenia dla
 * talentu mówi to samo: „w przeciwieństwie do mentora czy umiejętności".
 *
 * Ekran podsumowania miał jednak osobny, STARSZY warunek (`isCompetence`,
 * który liczy tylko psychologiczną/cyfrową/społeczną) i chował przycisk
 * „Przekaż graczowi" przy mentorze — dokładnie to zgłosił Adam jako
 * rozjazd „Adam i kod mówią co innego". Reduktor by przyjął przekazanie,
 * ale gracz nigdy nie widział przycisku, żeby je wywołać.
 */

function gameFor(state: GameState): Game {
  return {
    state,
    dispatch: () => {},
    rejection: null,
    dismissRejection: () => {},
  } as unknown as Game;
}

/** Stan podsumowania: p1 wyłożył kartę mentora, p2 nic. */
function summaryWithMentorPlay(): GameState {
  const base = setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: ALL_CHARACTERS[0].id },
      { id: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id },
    ],
    7,
  );
  const mentor = ALL_CARDS.find((c) => c.category === 'mentor' && !c.draft)!;
  const problem = ALL_PROBLEMS[0];

  return {
    ...base,
    players: base.players.map((p) => ({ ...p, hand: [], mat: [] })),
    phase: 'missionSummary',
    missionNumber: 1,
    mission: {
      problems: [problem],
      played: [
        { card: mentor, playerId: 'p1', slotKey: 'mentor', problemId: problem.id, fromMat: false },
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

describe('mentora wolno przekazać innemu graczowi', () => {
  it('ekran podsumowania pokazuje przycisk „Przekaż graczowi" przy mentorze', () => {
    const state = summaryWithMentorPlay();
    render(<SummaryScreen game={gameFor(state)} />);

    // Jedyna karta na ekranie to mentor Ali — jeden przycisk, żadnych innych.
    expect(screen.getByRole('button', { name: /przekaż graczowi/i })).toBeTruthy();
    // Stary komunikat „Mentor zostaje przy Tobie" nie może się już pojawić.
    expect(screen.queryByText(/mentor zostaje przy tobie/i)).toBeNull();
  });

  it('reduktor faktycznie przyjmuje przekazanie mentora (przycisk nie kłamie)', () => {
    const state = summaryWithMentorPlay();
    const cardId = state.mission!.played[0].card.id;

    const result = reduce(state, {
      type: 'SHARE_CARD',
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      cardId,
    });

    expect(result.state.mission!.sharedCardIds).toContain(cardId);
  });
});
