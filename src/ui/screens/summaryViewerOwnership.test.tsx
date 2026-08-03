import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupGame } from '../useGame';
import { ALL_CARDS } from '../../data/cards';
import { ALL_PROBLEMS } from '../../data/problems';
import { ALL_CHARACTERS } from '../../data/characters';
import type { Game } from '../useGame';
import type { GameState } from '../../engine/types';
import { SummaryScreen } from './SummaryScreen';

/**
 * Online: `SummaryScreen` pokazuje naraz wiersze WSZYSTKICH graczy z
 * aktywnymi przyciskami — inaczej niż `MissionScreen`, gdzie tylko aktywny
 * gracz ma interaktywną rękę, reszta to sama mata bez akcji. Bez `viewerId`
 * dziecko mogło kliknąć „Zabieram na postać" pod cudzym imieniem i dostać
 * dopiero wtedy odmowę z reduktora („To nie Twoja karta") — myląco, bo
 * przycisk wyglądał identycznie jak przy własnym wierszu.
 */

function gameFor(state: GameState): Game {
  return {
    state,
    dispatch: () => {},
    rejection: null,
    dismissRejection: () => {},
  } as unknown as Game;
}

function summaryWithTwoPlays(): GameState {
  const base = setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: ALL_CHARACTERS[0].id },
      { id: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id },
    ],
    7,
  );
  const cards = ALL_CARDS.filter((c) => c.category === 'social' && !c.draft);
  const problem = ALL_PROBLEMS[0];

  return {
    ...base,
    players: base.players.map((p) => ({ ...p, hand: [], mat: [] })),
    phase: 'missionSummary',
    missionNumber: 1,
    mission: {
      problems: [problem],
      played: [
        { card: cards[0], playerId: 'p1', slotKey: 'social', problemId: problem.id, fromMat: false },
        { card: cards[1], playerId: 'p2', slotKey: 'social', problemId: problem.id, fromMat: false },
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

describe('SummaryScreen — viewerId online', () => {
  it('bez viewerId (lokalna gra) przyciski wszystkich graczy zostają aktywne', () => {
    const state = summaryWithTwoPlays();
    render(<SummaryScreen game={gameFor(state)} />);

    const buttons = screen.getAllByRole('button', { name: 'Zabieram na postać' });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('z viewerId online: przycisk cudzej karty jest wyłączony, własnej — aktywny', () => {
    const state = summaryWithTwoPlays();
    render(<SummaryScreen game={gameFor(state)} viewerId="p1" />);

    const buttons = screen.getAllByRole('button', { name: 'Zabieram na postać' });
    expect(buttons).toHaveLength(2);

    // Wiersz Ali (p1, viewer) — przycisk aktywny.
    const own = buttons.find((b) => !b.hasAttribute('disabled'));
    expect(own).toBeTruthy();
    // Wiersz Bo (p2) — przycisk wyłączony, viewer nie może grać za kogoś innego.
    const other = buttons.find((b) => b.hasAttribute('disabled'));
    expect(other).toBeTruthy();
  });
});
