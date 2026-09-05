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
 * Adam: „brak możliwości przekazania graczowi, jeśli już wziął dla siebie
 * swoją kartę. Powinno być tak, że nawet jeśli jakiś gracz wziął dla siebie
 * jedną z kart, to drugi gracz powinien móc przekazać temu graczowi od siebie
 * kartę". Reduktor (`shareCard`) już to liczy poprawnie — limit prezentów
 * (`mission.receivedCards`) jest osobny od limitu własnej zdobyczy
 * (`mission.takenToMat`), patrz `shareAfterTake.test.ts`.
 *
 * Ekran podsumowania miał jednak WŁASNY, starszy warunek na to, kto może być
 * odbiorcą — trzy miejsca sprawdzały `mission.takenToMat`, nie
 * `mission.receivedCards`. Efekt: gracz, który zabrał swoją kartę, znikał
 * z listy odbiorców na dobre, mimo że reduktor by przyjął dla niego prezent.
 * Dokładnie to zgłosił Adam po pierwszej poprawce reduktora — „NIe działa.
 * Jak gracz 2 zabrał talent do siebie, to gracz 1 nie mógł przekazać żadnej
 * karty graczowi 2".
 */

function Harness({ initial }: { initial: GameState }) {
  const [state, setState] = useState(initial);
  const dispatch = (action: Action) => {
    setState((current) => reduce(current, action).state);
  };
  const game = { state, dispatch, rejection: null, dismissRejection: () => {} } as unknown as Game;
  return <SummaryScreen game={game} />;
}

/** Podsumowanie: p1 i p2 mają obaj po jednej wyłożonej, przekazywalnej karcie. */
function summaryWithBothPlays(): GameState {
  const base = setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: ALL_CHARACTERS[0].id },
      { id: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id },
    ],
    7,
  );
  const cardP1 = ALL_CARDS.find((c) => c.category === 'social' && !c.draft)!;
  const cardP2 = ALL_CARDS.find((c) => c.category === 'talent' && !c.draft)!;
  const problem = ALL_PROBLEMS[0];

  return {
    ...base,
    players: base.players.map((p) => ({ ...p, hand: [], mat: [] })),
    phase: 'missionSummary',
    missionNumber: 1,
    mission: {
      problems: [problem],
      played: [
        { card: cardP1, playerId: 'p1', slotKey: 'social', problemId: problem.id, fromMat: false },
        { card: cardP2, playerId: 'p2', slotKey: 'talent', problemId: problem.id, fromMat: false },
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

/** Kafel karty na ekranie — ta sama ścieżka co w sharePanelStale.test.tsx. */
const tileFor = (cardName: string) =>
  screen.getByText(cardName).closest('div.flex.w-\\[calc\\(50\\%-0\\.375rem\\)\\]') as HTMLElement;

describe('przekazanie karty graczowi, który już wziął swoją (ekran podsumowania)', () => {
  it('gracz, który zabrał już własną kartę, nadal jest widoczny jako odbiorca', () => {
    const state = summaryWithBothPlays();
    const cardP1 = state.mission!.played.find((p) => p.playerId === 'p1')!.card;
    const cardP2 = state.mission!.played.find((p) => p.playerId === 'p2')!.card;

    render(<Harness initial={state} />);

    // Bo (p2) zabiera swoją wyłożoną kartę na postać — to jedyne, co zgłoszenie
    // wymaga jako warunek: „gracz wziął dla siebie jedną z kart".
    fireEvent.click(within(tileFor(cardP2.name)).getByText('Zabieram na postać'));

    // Ala (p1) otwiera ofertę przekazania SWOJEJ karty.
    fireEvent.click(within(tileFor(cardP1.name)).getByText('Przekaż graczowi'));

    expect(screen.getByText(/Komu przekazujesz kartę/i)).toBeTruthy();
    // Sedno zgłoszenia: Bo nadal ma przycisk na liście odbiorców, mimo że
    // przed chwilą zabrał własną kartę.
    expect(screen.getByRole('button', { name: 'Bo' })).toBeTruthy();
  });

  it('ale gracz, który już DOSTAŁ prezent w tej misji, znika z listy odbiorców', () => {
    // Trzeci gracz (Cela) zostaje dostępnym odbiorcą, żeby przycisk „Przekaż
    // graczowi" w ogóle się pokazał (gasi go brak JAKIEGOKOLWIEK odbiorcy,
    // patrz `hasReceiver`) — bez niego nie dałoby się otworzyć panelu
    // i sprawdzić, kogo NIE MA na liście.
    const base = summaryWithBothPlays();
    const state: GameState = {
      ...base,
      players: [
        ...base.players,
        {
          id: 'p3',
          name: 'Cela',
          characterId: ALL_CHARACTERS[2].id,
          hand: [],
          mat: [],
          receivedCardIds: [],
          sharedCount: 0,
          experience: [],
        },
      ],
      // Bo (p2) już raz dostał kartę w tej misji — symulujemy to wprost
      // w stanie, bez odgrywania całego dodatkowego przekazania tylko po to,
      // żeby je wyprodukować.
      mission: { ...base.mission!, receivedCards: ['p2'] },
    };
    const cardP1 = state.mission!.played.find((p) => p.playerId === 'p1')!.card;

    render(<Harness initial={state} />);

    fireEvent.click(within(tileFor(cardP1.name)).getByText('Przekaż graczowi'));

    expect(screen.getByText(/Komu przekazujesz kartę/i)).toBeTruthy();
    // Cela wciąż może dostać prezent — Bo już dostał i znika z listy.
    expect(screen.getByRole('button', { name: 'Cela' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Bo' })).toBeNull();
  });
});
