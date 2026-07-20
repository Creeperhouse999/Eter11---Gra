import { describe, it, expect } from 'vitest';
import { reduce } from './reducer';
import { giveCard, makeCard, newGame } from './testFixtures';
import type { Card, GameState, SlotKey } from './types';

const FILL: Array<[Card['category'], SlotKey]> = [
  ['psychological', 'psychological'],
  ['digital', 'digital'],
  ['social', 'social'],
  ['mentor', 'mentorTalent'],
];

/** Doprowadza grę do podsumowania misji zakończonej sukcesem. */
function solvedMission(): GameState {
  let state = reduce(newGame(), { type: 'START_MISSION' }).state;
  const problemId = state.mission!.problems[0].id;

  FILL.forEach(([category, slotKey], index) => {
    const playerId = state.players[state.activePlayerIndex].id;
    const injected = makeCard(`fill-${index}`, category);
    state = giveCard(state, playerId, injected);
    state = reduce(state, {
      type: 'PLAY_CARD', playerId, cardId: injected.id, slotKey, problemId, fromMat: false,
    }).state;
  });

  return state;
}

/** Doprowadza grę do podsumowania misji przegranej. */
function lostMission(): GameState {
  let state = reduce(newGame(), { type: 'START_MISSION' }).state;
  let guard = 0;
  while (state.mission?.phase === 'playing' && guard < 100) {
    const playerId = state.players[state.activePlayerIndex].id;
    state = reduce(state, { type: 'PASS', playerId }).state;
    guard++;
  }
  return state;
}

describe('zakończenie misji', () => {
  it('komplet slotów kończy misję sukcesem', () => {
    const state = solvedMission();
    expect(state.mission?.phase).toBe('won');
    expect(state.phase).toBe('missionSummary');
  });
});

describe('TAKE_CARD_TO_MAT', () => {
  it('przenosi zagraną kartę na matę gracza', () => {
    const state = solvedMission();
    const play = state.mission!.played[0];
    const result = reduce(state, {
      type: 'TAKE_CARD_TO_MAT', playerId: play.playerId, cardId: play.card.id,
    });
    const player = result.state.players.find((p) => p.id === play.playerId)!;
    expect(player.mat.some((c) => c.id === play.card.id)).toBe(true);
  });

  it('gracz nie może zabrać karty zagranej przez kogoś innego', () => {
    const state = solvedMission();
    const play = state.mission!.played[0];
    const otherId = state.players.find((p) => p.id !== play.playerId)!.id;
    const result = reduce(state, {
      type: 'TAKE_CARD_TO_MAT', playerId: otherId, cardId: play.card.id,
    });
    expect(result.rejected).toBeTruthy();
  });

  it('gracz może zabrać tylko jedną kartę na misję', () => {
    let state = solvedMission();
    const plays = state.mission!.played.filter((p) => p.playerId === 'p1');
    expect(plays.length).toBeGreaterThanOrEqual(2);
    state = reduce(state, {
      type: 'TAKE_CARD_TO_MAT', playerId: 'p1', cardId: plays[0].card.id,
    }).state;
    const second = reduce(state, {
      type: 'TAKE_CARD_TO_MAT', playerId: 'p1', cardId: plays[1].card.id,
    });
    expect(second.rejected).toBeTruthy();
  });

  it('działa także po przegranej misji — postać uczy się mimo porażki', () => {
    let state = reduce(newGame(), { type: 'START_MISSION' }).state;
    const problemId = state.mission!.problems[0].id;
    const injected = makeCard('lonely', 'psychological');
    state = giveCard(state, 'p1', injected);
    state = reduce(state, {
      type: 'PLAY_CARD', playerId: 'p1', cardId: injected.id,
      slotKey: 'psychological', problemId, fromMat: false,
    }).state;

    let guard = 0;
    while (state.mission?.phase === 'playing' && guard < 100) {
      const playerId = state.players[state.activePlayerIndex].id;
      state = reduce(state, { type: 'PASS', playerId }).state;
      guard++;
    }
    expect(state.mission?.phase).toBe('lost');

    const result = reduce(state, {
      type: 'TAKE_CARD_TO_MAT', playerId: 'p1', cardId: injected.id,
    });
    expect(result.rejected).toBeUndefined();
    expect(result.state.players[0].mat.map((c) => c.id)).toContain(injected.id);
  });
});

describe('SHARE_CARD', () => {
  it('przekazuje kompetencję i daje kartę doświadczenia za dzielenie się', () => {
    const state = solvedMission();
    const play = state.mission!.played.find((p) => p.card.category === 'psychological')!;
    const receiverId = state.players.find((p) => p.id !== play.playerId)!.id;
    const result = reduce(state, {
      type: 'SHARE_CARD', fromPlayerId: play.playerId,
      toPlayerId: receiverId, cardId: play.card.id,
    });
    const giver = result.state.players.find((p) => p.id === play.playerId)!;
    const receiver = result.state.players.find((p) => p.id === receiverId)!;
    expect(receiver.mat.some((c) => c.id === play.card.id)).toBe(true);
    expect(receiver.receivedCardIds).toContain(play.card.id);
    expect(giver.sharedCount).toBe(1);
    expect(giver.experience.some((e) => e.kind === 'share')).toBe(true);
  });

  it('odrzuca przekazanie mentora — dzielić można się tylko kompetencjami', () => {
    const state = solvedMission();
    const play = state.mission!.played.find((p) => p.card.category === 'mentor')!;
    const receiverId = state.players.find((p) => p.id !== play.playerId)!.id;
    const result = reduce(state, {
      type: 'SHARE_CARD', fromPlayerId: play.playerId,
      toPlayerId: receiverId, cardId: play.card.id,
    });
    expect(result.rejected).toContain('kompetencji');
  });

  it('odrzuca przekazanie samemu sobie', () => {
    const state = solvedMission();
    const play = state.mission!.played.find((p) => p.card.category === 'psychological')!;
    const result = reduce(state, {
      type: 'SHARE_CARD', fromPlayerId: play.playerId,
      toPlayerId: play.playerId, cardId: play.card.id,
    });
    expect(result.rejected).toBeTruthy();
  });

  it('odrzuca dwukrotne przekazanie tej samej karty', () => {
    let state = solvedMission();
    const play = state.mission!.played.find((p) => p.card.category === 'psychological')!;
    const receiverId = state.players.find((p) => p.id !== play.playerId)!.id;
    state = reduce(state, {
      type: 'SHARE_CARD', fromPlayerId: play.playerId,
      toPlayerId: receiverId, cardId: play.card.id,
    }).state;
    const second = reduce(state, {
      type: 'SHARE_CARD', fromPlayerId: play.playerId,
      toPlayerId: receiverId, cardId: play.card.id,
    });
    expect(second.rejected).toBeTruthy();
  });
});

describe('END_MISSION_SUMMARY', () => {
  it('przyznaje kartę doświadczenia za rozwiązanie każdemu graczowi', () => {
    const result = reduce(solvedMission(), { type: 'END_MISSION_SUMMARY' });
    for (const player of result.state.players) {
      expect(player.experience.some((e) => e.kind === 'solve')).toBe(true);
    }
  });

  it('nie przyznaje doświadczenia po przegranej misji', () => {
    const result = reduce(lostMission(), { type: 'END_MISSION_SUMMARY' });
    for (const player of result.state.players) {
      expect(player.experience).toHaveLength(0);
    }
  });

  it('przenosi rozwiązany problem na stos rozwiązanych', () => {
    const result = reduce(solvedMission(), { type: 'END_MISSION_SUMMARY' });
    expect(result.state.solvedProblems).toHaveLength(1);
    expect(result.state.mission).toBeNull();
  });

  it('przenosi przegrany problem na stos nierozwiązanych', () => {
    const result = reduce(lostMission(), { type: 'END_MISSION_SUMMARY' });
    expect(result.state.unsolvedProblems).toHaveLength(1);
    expect(result.state.solvedProblems).toHaveLength(0);
  });

  it('uzupełnia ręce do pełnego rozmiaru', () => {
    const state = solvedMission();
    const result = reduce(state, { type: 'END_MISSION_SUMMARY' });
    for (const player of result.state.players) {
      expect(player.hand).toHaveLength(state.config.handSize);
    }
  });

  it('zachowuje karty zabrane na matę', () => {
    let state = solvedMission();
    const play = state.mission!.played[0];
    state = reduce(state, {
      type: 'TAKE_CARD_TO_MAT', playerId: play.playerId, cardId: play.card.id,
    }).state;
    const result = reduce(state, { type: 'END_MISSION_SUMMARY' });
    const player = result.state.players.find((p) => p.id === play.playerId)!;
    expect(player.mat.map((c) => c.id)).toContain(play.card.id);
  });
});
