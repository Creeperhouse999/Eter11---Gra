import { describe, it, expect } from 'vitest';
import { applyBlackSwan, reduce, resolveDrawnBlackSwans } from './reducer';
import { giveCard, makeCard, newGame } from './testFixtures';
import type { Card, GameState, SlotKey } from './types';

const started = (): GameState => reduce(newGame(), { type: 'START_MISSION' }).state;

describe('applyBlackSwan: extraProblem', () => {
  it('dokłada drugi problem do misji', () => {
    const state = applyBlackSwan(started(), 'extraProblem');
    expect(state.mission?.problems).toHaveLength(2);
  });

  it('zdejmuje dołożony problem ze stosu', () => {
    const before = started();
    const after = applyBlackSwan(before, 'extraProblem');
    expect(after.problemPile).toHaveLength(before.problemPile.length - 1);
  });

  it('przy pustym stosie problemów nie dokłada nic', () => {
    const empty: GameState = { ...started(), problemPile: [] };
    const after = applyBlackSwan(empty, 'extraProblem');
    expect(after.mission?.problems).toHaveLength(1);
  });

  it('drugi problem trzeba rozwiązać, żeby misja się udała', () => {
    let state = applyBlackSwan(started(), 'extraProblem');
    const firstId = state.mission!.problems[0].id;

    const fills: Array<[Card['category'], SlotKey]> = [
      ['psychological', 'psychological'],
      ['digital', 'digital'],
      ['social', 'social'],
      ['mentor', 'mentor'],
      ['talent', 'talent'],
    ];

    fills.forEach(([category, slotKey], index) => {
      const playerId = state.players[state.activePlayerIndex].id;
      const card = makeCard(`f-${index}`, category);
      state = giveCard(state, playerId, card);
      state = reduce(state, {
        type: 'PLAY_CARD', playerId, cardId: card.id,
        slotKey, problemId: firstId, fromMat: false,
      }).state;
    });

    // Pierwszy problem zapełniony, drugi nie — misja wciąż trwa.
    expect(state.mission?.phase).toBe('playing');
  });
});

describe('applyBlackSwan: doubleRequirements', () => {
  it('aktywuje efekt podwojenia', () => {
    const state = applyBlackSwan(started(), 'doubleRequirements');
    expect(state.mission?.activeBlackSwans).toContain('doubleRequirements');
  });

  it('zapamiętuje sloty zapełnione przed podwojeniem', () => {
    let state = started();
    const problemId = state.mission!.problems[0].id;
    const injected = makeCard('pre', 'psychological');
    state = giveCard(state, 'p1', injected);
    state = reduce(state, {
      type: 'PLAY_CARD', playerId: 'p1', cardId: 'pre',
      slotKey: 'psychological', problemId, fromMat: false,
    }).state;

    const after = applyBlackSwan(state, 'doubleRequirements');
    expect(after.mission?.slotsFilledBeforeDoubling).toContain(`${problemId}:psychological`);
  });

  it('nie kumuluje się przy dwukrotnym zagraniu', () => {
    const once = applyBlackSwan(started(), 'doubleRequirements');
    const twice = applyBlackSwan(once, 'doubleRequirements');
    expect(twice.mission?.activeBlackSwans.filter((s) => s === 'doubleRequirements'))
      .toHaveLength(1);
  });
});

describe('applyBlackSwan: swapHands', () => {
  it('przekazuje ręce zgodnie z ruchem wskazówek zegara', () => {
    const before = started();
    const p1Hand = before.players[0].hand.map((c) => c.id);
    const p2Hand = before.players[1].hand.map((c) => c.id);

    const after = applyBlackSwan(before, 'swapHands');

    expect(after.players[1].hand.map((c) => c.id)).toEqual(p1Hand);
    expect(after.players[0].hand.map((c) => c.id)).toEqual(p2Hand);
  });

  it('nie rusza kart na matach postaci', () => {
    const base = started();
    const withMat: GameState = {
      ...base,
      players: base.players.map((p, i) =>
        i === 0 ? { ...p, mat: [makeCard('kept', 'mentor')] } : p,
      ),
    };
    const after = applyBlackSwan(withMat, 'swapHands');
    expect(after.players[0].mat.map((c) => c.id)).toEqual(['kept']);
  });
});

describe('applyBlackSwan poza misją', () => {
  it('nie zmienia stanu, gdy misja nie trwa', () => {
    const state = newGame();
    expect(applyBlackSwan(state, 'extraProblem')).toBe(state);
  });
});

describe('zagranie Czarnego Łabędzia z ręki', () => {
  const swan = (kind: 'extraProblem' | 'doubleRequirements' | 'swapHands') => ({
    id: `swan-${kind}`,
    name: 'Czarny Łabędź',
    category: 'blackswan' as const,
    blackSwanKind: kind,
    description: 'Utrudnienie.',
    icon: 'swan',
  });

  it('dobrany łabędź uruchamia efekt sam, bez ruchu gracza', () => {
    const state = giveCard(started(), 'p1', swan('doubleRequirements'));
    const { state: after, events } = resolveDrawnBlackSwans(state);

    expect(after.mission?.activeBlackSwans).toContain('doubleRequirements');
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('doubleRequirements');
    expect(events[0].applied).toBe(true);
  });

  it('karta schodzi z ręki na stos odrzuconych', () => {
    const state = giveCard(started(), 'p1', swan('swapHands'));
    const { state: after } = resolveDrawnBlackSwans(state);

    const inAnyHand = after.players.some((p) =>
      p.hand.some((c) => c.id === 'swan-swapHands'),
    );
    expect(inAnyHand).toBe(false);
    expect(after.discardPile.map((c) => c.id)).toContain('swan-swapHands');
  });

  it('nie da się go zatrzymać w ręce ani ominąć', () => {
    // Karta znika w chwili dobrania, więc żaden ruch gracza jej nie dotyczy —
    // nie ma czego wymienić ani czym zagrać.
    const state = giveCard(started(), 'p1', swan('extraProblem'));
    const { state: after } = resolveDrawnBlackSwans(state);
    expect(after.players.flatMap((p) => p.hand).some((c) => c.category === 'blackswan')).toBe(false);
  });

  it('zdarzenie niesie nazwę gracza i karty do komunikatu', () => {
    const state = giveCard(started(), 'p1', swan('extraProblem'));
    const { events } = resolveDrawnBlackSwans(state);

    expect(events[0].playerId).toBe('p1');
    expect(events[0].playerName).toBeTruthy();
    expect(events[0].cardName).toBeTruthy();
  });

  it('powtórzony wariant schodzi z ręki, ale zdarzenie mówi, że nic się nie zmieniło', () => {
    let state = applyBlackSwan(started(), 'extraProblem');
    state = giveCard(state, 'p1', swan('extraProblem'));
    const { state: after, events } = resolveDrawnBlackSwans(state);

    expect(events[0].applied).toBe(false);
    expect(after.mission?.problems).toHaveLength(2);
  });
});

describe('Czarny Łabędź nie kumuluje się', () => {
  it('dodatkowy problem dokłada się tylko raz', () => {
    let state = applyBlackSwan(started(), 'extraProblem');
    expect(state.mission?.problems).toHaveLength(2);

    state = applyBlackSwan(state, 'extraProblem');
    expect(state.mission?.problems).toHaveLength(2);
  });

  it('wymiana rąk działa tylko raz na misję', () => {
    const before = started();
    const first = applyBlackSwan(before, 'swapHands');
    const second = applyBlackSwan(first, 'swapHands');

    // Druga wymiana cofnęłaby ręce do stanu wyjściowego.
    expect(second.players[0].hand.map((c) => c.id)).toEqual(
      first.players[0].hand.map((c) => c.id),
    );
  });
});
