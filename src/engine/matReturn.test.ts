import { describe, it, expect } from 'vitest';
import { reduce } from './reducer';
import { giveCard, makeCard, newGame } from './testFixtures';
import type { GameState } from './types';

/**
 * Karta zagrana Z WŁASNEJ karty postaci (fromMat) ma wracać do właściciela
 * automatycznie — tak obiecuje reduktor (odrzucenie SHARE_CARD: „wraca do
 * Ciebie") i SummaryScreen. W praktyce wracała tylko wtedy, gdy gracz sam
 * kliknął „Zabieram na postać" — a to jest ten sam, jednorazowy na misję
 * limit, co odbiór NOWO zdobytej karty. Gracz, który tej samej misji
 * pożyczył kartę z maty I zdobył nową, mógł zabrać tylko jedną: druga
 * (czyli ta, którą miał już wcześniej) trwale znikała na stosie
 * odrzuconych.
 */

/**
 * Misja, w której p1 zagrał kartę Z MATY na pierwszy slot, a potem (po turze
 * wypełniającej p2, żeby wrócić do p1) nową kartę z ręki na drugi slot.
 * Gotowa do podsumowania.
 */
function misjaZKartaZMatyINowa(): {
  state: GameState;
  oldMatCard: ReturnType<typeof makeCard>;
  newCard: ReturnType<typeof makeCard>;
} {
  let state = reduce(newGame(), { type: 'START_MISSION' }).state;
  const problem = state.mission!.problems[0];

  const oldMatCard = {
    ...makeCard('stara-karta-z-maty', problem.slots[0].key as never),
    family: problem.slots[0].family,
  };
  // p1 ma tę kartę na macie jeszcze przed misją — zdobytą wcześniej.
  state = {
    ...state,
    players: state.players.map((p) =>
      p.id === 'p1' ? { ...p, mat: [oldMatCard] } : p,
    ),
  };

  state = reduce(state, {
    type: 'PLAY_CARD',
    playerId: 'p1',
    cardId: oldMatCard.id,
    slotKey: problem.slots[0].key,
    problemId: problem.id,
    fromMat: true,
  }).state;

  // Tura p2 — wypełniacz, żeby kolej wróciła do p1.
  const filler = {
    ...makeCard('wypelniacz-p2', problem.slots[2].key as never),
    family: problem.slots[2].family,
  };
  state = giveCard(state, 'p2', filler);
  state = reduce(state, {
    type: 'PLAY_CARD',
    playerId: 'p2',
    cardId: filler.id,
    slotKey: problem.slots[2].key,
    problemId: problem.id,
    fromMat: false,
  }).state;

  // I znów p1 — zdobywa nową kartę z ręki, na inny slot.
  const newCard = {
    ...makeCard('nowa-karta', problem.slots[1].key as never),
    family: problem.slots[1].family,
  };
  state = giveCard(state, 'p1', newCard);
  state = reduce(state, {
    type: 'PLAY_CARD',
    playerId: 'p1',
    cardId: newCard.id,
    slotKey: problem.slots[1].key,
    problemId: problem.id,
    fromMat: false,
  }).state;

  state = { ...state, phase: 'missionSummary', mission: { ...state.mission!, phase: 'won' } };

  return { state, oldMatCard, newCard };
}

describe('karta pożyczona z maty wraca do właściciela', () => {
  it('nie ginie, gdy gracz w tej samej misji zabiera inną, nową kartę', () => {
    const { state: setup, oldMatCard, newCard } = misjaZKartaZMatyINowa();

    // Gracz zabiera tylko nową kartę — limit "jedna na misję" nie pozwala
    // mu zabrać obu przez TAKE_CARD_TO_MAT.
    let state = reduce(setup, {
      type: 'TAKE_CARD_TO_MAT',
      playerId: 'p1',
      cardId: newCard.id,
    }).state;

    state = reduce(state, { type: 'END_MISSION_SUMMARY' }).state;

    const p1 = state.players.find((p) => p.id === 'p1')!;
    expect(p1.mat.map((c) => c.id)).toContain(oldMatCard.id);
    expect(p1.mat.map((c) => c.id)).toContain(newCard.id);
    expect(state.discardPile.map((c) => c.id)).not.toContain(oldMatCard.id);
  });

  it('zabranie jej ręcznie (TAKE_CARD_TO_MAT) nie zużywa limitu jednej nowej karty na misję', () => {
    const { state: setup, oldMatCard, newCard } = misjaZKartaZMatyINowa();

    // Gracz klika najpierw "Zabieram" na kartę pożyczoną z maty…
    const state = reduce(setup, {
      type: 'TAKE_CARD_TO_MAT',
      playerId: 'p1',
      cardId: oldMatCard.id,
    }).state;

    // …a limit nie powinien mu przeszkodzić w zabraniu też nowej.
    const result = reduce(state, {
      type: 'TAKE_CARD_TO_MAT',
      playerId: 'p1',
      cardId: newCard.id,
    });

    expect(result.rejected).toBeFalsy();
    const p1 = result.state.players.find((p) => p.id === 'p1')!;
    expect(p1.mat.map((c) => c.id)).toContain(oldMatCard.id);
    expect(p1.mat.map((c) => c.id)).toContain(newCard.id);
  });
});
