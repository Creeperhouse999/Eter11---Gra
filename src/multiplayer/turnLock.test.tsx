import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { GameState } from '../engine/types';
import type { Room } from './types';

/**
 * Adam: „podczas gry wspólnej przez internet (…) 1 gracz może sobie grać nie
 * czekając na drugiego. Musi być tak, że jeśli 1 gracz zrobi ruch, to wtedy
 * jest kolej kolejnego gracza (…) powinna się wyświetlić wyraźna informacja
 * na środku w ramce: teraz ruch gracza …, i to blokuje możliwość ruchu".
 *
 * Zapis do bazy zawsze był pilnowany (transakcja `commitMove` odrzuca ruch nie
 * swojej tury), ale EKRAN o tym nie wiedział: karty dawały się chwytać i
 * zagrywać, a odmowa przychodziła dopiero potem, jako czerwony pasek u góry.
 * Z perspektywy dziecka wyglądało to jak gra bez kolejek — klika, coś się
 * dzieje, dopiero po chwili „nie" bez wyjaśnienia.
 *
 * `allows` to ten sam mechanizm, którym samouczek blokuje ruchy spoza kroku:
 * gdy zwraca `false`, karty nie dają się zagrać, wymienić ani spasować.
 */

vi.mock('../ui/screens/MissionScreen', () => ({
  MissionScreen: ({ allows }: { allows?: (a: 'play' | 'swap' | 'pass') => boolean }) => (
    <div
      data-testid="mission"
      data-play={String(allows?.('play') ?? true)}
      data-swap={String(allows?.('swap') ?? true)}
      data-pass={String(allows?.('pass') ?? true)}
    />
  ),
}));

vi.mock('./room', () => ({ revealerUid: () => 'a' }));

const { OnlineGame } = await import('./OnlineGame');

const state = {
  phase: 'mission',
  missionNumber: 0,
  activePlayerIndex: 0,
  players: [],
  solvedProblems: [],
  unsolvedProblems: [],
  problemPile: [],
} as unknown as GameState;

const room = {
  code: 'ABCD',
  phase: 'playing',
  state,
  players: {
    a: { uid: 'a', name: 'Adam', characterId: 'c1', online: true, ready: true, joinedAt: 1 },
    b: { uid: 'b', name: 'Bartek', characterId: 'c2', online: true, ready: true, joinedAt: 2 },
  },
} as unknown as Room;

function renderGame(myTurn: boolean) {
  render(
    <OnlineGame
      room={room}
      uid={myTurn ? 'a' : 'b'}
      myTurn={myTurn}
      activeUid="a"
      dispatch={async () => null}
      propose={async () => null}
      react={async () => {}}
      reactions={[]}
      onAcceptOffer={async () => null}
      onDeclineOffer={() => {}}
      onLeave={() => {}}
    />,
  );
}

describe('kolejność ruchów w grze online', () => {
  it('poza swoją turą nie da się zagrać, wymienić ani spasować', () => {
    renderGame(false);
    const mission = screen.getByTestId('mission');
    expect(mission.dataset.play).toBe('false');
    expect(mission.dataset.swap).toBe('false');
    expect(mission.dataset.pass).toBe('false');
  });

  it('w swojej turze wszystkie ruchy są dozwolone', () => {
    renderGame(true);
    const mission = screen.getByTestId('mission');
    expect(mission.dataset.play).toBe('true');
    expect(mission.dataset.swap).toBe('true');
    expect(mission.dataset.pass).toBe('true');
  });

  it('czekający widzi, na kogo czeka — po imieniu', () => {
    renderGame(false);
    expect(screen.getByText(/Adam/)).toBeTruthy();
  });
});
