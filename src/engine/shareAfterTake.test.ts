import { describe, it, expect } from 'vitest';
import { reduce } from './reducer';
import { giveCard, makeCard, newGame } from './testFixtures';
import type { GameState } from './types';

/**
 * Dostanie karty od innego gracza to nie to samo, co zabranie własnej.
 *
 * Adam zgłosił: „brak możliwości przekazania graczowi, jeśli już wziął dla
 * siebie swoją kartę. Powinno być tak, że nawet jeśli jakiś gracz wziął dla
 * siebie jedną z kart, to drugi gracz powinien móc przekazać temu graczowi
 * od siebie kartę".
 *
 * Limit „jedna karta na misję" pilnował dotąd obu ścieżek naraz, więc gracz,
 * który zabrał swoją zdobycz, nie mógł już nic dostać w prezencie. To karało
 * za dzielenie się — a dzielenie jest tu sednem: przekazujący dostaje za nie
 * kartę doświadczenia, bez której nie spełni swojej postaci.
 *
 * Limit zostaje, ale liczy się osobno: jedna WŁASNA karta na misję i jedna
 * OTRZYMANA.
 */

/** Misja po zagraniu kart przez obu graczy, gotowa do podsumowania. */
function poMisji(): GameState {
  let state = reduce(newGame(), { type: 'START_MISSION' }).state;
  const problem = state.mission!.problems[0];

  const ruchy: Array<[string, number]> = [
    ['p1', 0],
    ['p2', 1],
    ['p1', 2],
  ];

  ruchy.forEach(([playerId, slotIndex], i) => {
    const slot = problem.slots[slotIndex];
    const card = { ...makeCard(`k${i}`, slot.key as never), family: slot.family };
    state = giveCard(state, playerId, card);
    state = reduce(state, {
      type: 'PLAY_CARD',
      playerId,
      cardId: card.id,
      slotKey: slot.key,
      problemId: problem.id,
      fromMat: false,
    }).state;
  });

  return state.phase === 'missionSummary' ? state : { ...state, phase: 'missionSummary' };
}

describe('przekazanie karty graczowi, który wziął już swoją', () => {
  it('gracz po zabraniu własnej karty może DOSTAĆ kartę od kolegi', () => {
    let state = poMisji();

    // p2 zabiera swoją zdobycz.
    const swoja = state.mission!.played.find((p) => p.playerId === 'p2')!;
    state = reduce(state, {
      type: 'TAKE_CARD_TO_MAT',
      playerId: 'p2',
      cardId: swoja.card.id,
    }).state;

    // p1 chce mu przekazać swoją — dotąd odrzucane.
    const prezent = state.mission!.played.find((p) => p.playerId === 'p1')!;
    const wynik = reduce(state, {
      type: 'SHARE_CARD',
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      cardId: prezent.card.id,
    });

    expect(wynik.rejected).toBeFalsy();
    expect(wynik.state.players.find((p) => p.id === 'p2')!.mat.map((c) => c.id)).toContain(
      prezent.card.id,
    );
  });

  it('ale dwóch prezentów w jednej misji już nie przyjmie', () => {
    // Limit zostaje — zmienia się tylko to, że własna zdobycz i prezent
    // liczą się osobno.
    let state = poMisji();

    const pierwszy = state.mission!.played.find((p) => p.playerId === 'p1')!;
    state = reduce(state, {
      type: 'SHARE_CARD',
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      cardId: pierwszy.card.id,
    }).state;

    const drugi = state.mission!.played.find(
      (p) => p.playerId === 'p1' && p.card.id !== pierwszy.card.id,
    );
    if (!drugi) return; // Brak drugiej karty p1 — nie ma czego sprawdzać.

    const wynik = reduce(state, {
      type: 'SHARE_CARD',
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      cardId: drugi.card.id,
    });

    expect(wynik.rejected).toBeTruthy();
  });

  it('gracz nadal bierze najwyżej jedną WŁASNĄ kartę na misję', () => {
    let state = poMisji();

    const wlasne = state.mission!.played.filter((p) => p.playerId === 'p1');
    if (wlasne.length < 2) return;

    state = reduce(state, {
      type: 'TAKE_CARD_TO_MAT',
      playerId: 'p1',
      cardId: wlasne[0].card.id,
    }).state;

    const wynik = reduce(state, {
      type: 'TAKE_CARD_TO_MAT',
      playerId: 'p1',
      cardId: wlasne[1].card.id,
    });

    expect(wynik.rejected).toBeTruthy();
  });
});
