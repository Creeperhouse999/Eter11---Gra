import { describe, it, expect } from 'vitest';
import { resolveDrawnBlackSwans } from './reducer';
import { newGame } from './testFixtures';
import type { Card, MissionState } from './types';

/**
 * Łabędź dobrany, gdy talia i stos odrzuconych są jednocześnie puste.
 *
 * `draw()` w tym wypadku po cichu zwraca mniej kart niż poproszono — tu
 * zero. Wymiana Łabędzia na zwykłą kartę zakładała, że zawsze coś przyjdzie,
 * więc bez tej karty ręka gracza traciła miejsce na stałe: dokładnie to,
 * przed czym ten kod miał chronić (por. komentarz w resolveDrawnBlackSwans
 * o graczu grającym „o kartę mniej niż reszta stołu").
 */
const swan = (id: string): Card => ({
  id,
  name: 'Czarny Łabędź',
  category: 'blackswan',
  description: '',
  icon: 'swan',
  blackSwanKind: 'extraProblem',
});

const playingMission: MissionState = {
  problems: [],
  played: [],
  round: 1,
  phase: 'playing',
  matUsedBy: [],
  activeBlackSwans: [],
  slotsFilledBeforeDoubling: [],
  takenToMat: [],
  sharedCardIds: [],
  swappedThisRound: [],
  pendingSwanEvents: [],
};

describe('Łabędź dobrany, gdy talia i stos odrzuconych są puste', () => {
  it('nie zmniejsza ręki gracza na stałe', () => {
    let state = newGame();
    const handWithSwan = [swan('s1'), ...state.players[0].hand.slice(1)];
    const handSizeBefore = handWithSwan.length;
    state = {
      ...state,
      mission: playingMission,
      problemPile: [],
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, hand: handWithSwan } : p,
      ),
      drawPile: [],
      discardPile: [],
    };

    const { state: after } = resolveDrawnBlackSwans(state);

    const player = after.players.find((p) => p.id === 'p1')!;
    expect(player.hand).toHaveLength(handSizeBefore);
  });
});
