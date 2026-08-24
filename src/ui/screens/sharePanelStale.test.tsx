import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useState } from 'react';
import { setupGame } from '../useGame';
import { reduce } from '../../engine/reducer';
import { ALL_CARDS } from '../../data/cards';
import { ALL_PROBLEMS } from '../../data/problems';
import { ALL_CHARACTERS } from '../../data/characters';
import type { Game } from '../useGame';
import type { GameState, Action } from '../../engine/types';
import { SummaryScreen } from './SummaryScreen';

/**
 * Otwarcie panelu „Komu przekazujesz kartę?" dla jednej wyłożonej karty, a
 * potem zabranie na kartę postaci INNEJ wyłożonej karty tego samego gracza,
 * zostawiało panel otwarty ze starym odniesieniem do już nieaktualnej oferty.
 *
 * `alreadyTook` liczy się per gracz (raz na misję), nie per karta — więc
 * zabranie karty B nie blokowało przycisku „Zabieram na postać" przy karcie
 * A dopóki panel dla A był otwarty, a warunek renderowania panelu
 * (`sharing?.fromPlayerId === player.id`) nie sprawdzał, czy oferta jest
 * jeszcze aktualna. Kliknięcie odbiorcy w takim panelu kończyło się cichą
 * odmową reduktora dla akcji, którą sam ekran przed chwilą zaproponował.
 */

/** Prawdziwy dispatch przez reducer, żeby ekran renderował się na żywo. */
function Harness({ initial }: { initial: GameState }) {
  const [state, setState] = useState(initial);
  const dispatch = (action: Action) => {
    setState((current) => reduce(current, action).state);
  };
  const game = { state, dispatch, rejection: null, dismissRejection: () => {} } as unknown as Game;
  return <SummaryScreen game={game} />;
}

/** Stan podsumowania: p1 wyłożył DWIE kompetencje, jest komu je przekazać. */
function summaryWithTwoPlays(): GameState {
  const base = setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: ALL_CHARACTERS[0].id },
      { id: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id },
    ],
    7,
  );
  const cardA = ALL_CARDS.find((c) => c.category === 'social' && !c.draft)!;
  const cardB = ALL_CARDS.find((c) => c.category === 'digital' && !c.draft)!;
  const problem = ALL_PROBLEMS[0];

  return {
    ...base,
    players: base.players.map((p) => ({ ...p, hand: [], mat: [] })),
    phase: 'missionSummary',
    missionNumber: 1,
    mission: {
      problems: [problem],
      played: [
        { card: cardA, playerId: 'p1', slotKey: 'social', problemId: problem.id, fromMat: false },
        { card: cardB, playerId: 'p1', slotKey: 'digital', problemId: problem.id, fromMat: false },
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

describe('SummaryScreen — panel przekazania po zabraniu innej karty', () => {
  it('zamyka panel przekazania, gdy gracz zabiera inną kartę na postać', () => {
    const state = summaryWithTwoPlays();
    const cardA = state.mission!.played[0].card;
    const cardB = state.mission!.played[1].card;

    render(<Harness initial={state} />);

    const tileFor = (cardName: string) =>
      screen.getByText(cardName).closest('div.flex.w-\\[calc\\(50\\%-0\\.375rem\\)\\]') as HTMLElement;

    // Otwiera ofertę przekazania karty A.
    fireEvent.click(within(tileFor(cardA.name)).getByText('Przekaż graczowi'));
    expect(screen.queryByText(/Komu przekazujesz kartę/i)).not.toBeNull();

    // Zamiast wybrać odbiorcę, gracz zabiera na postać INNĄ swoją kartę (B).
    fireEvent.click(within(tileFor(cardB.name)).getByText('Zabieram na postać'));

    // Panel oferty A musi zniknąć razem z nią — inaczej wisi na nieaktualnej
    // ofercie, a klik odbiorcy skończy się cichą odmową reduktora.
    expect(screen.queryByText(/Komu przekazujesz kartę/i)).toBeNull();
  });
});
