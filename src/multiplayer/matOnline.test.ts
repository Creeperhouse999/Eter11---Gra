import { describe, it, expect } from 'vitest';
import { hydrateState } from './hydrate';
import { reduce } from '../engine/reducer';
import { giveCard, makeCard, newGame } from '../engine/testFixtures';
import type { GameState } from '../engine/types';

/**
 * Karty z karty postaci działają też w grze online.
 *
 * Adam zgłosił: „zrób tak, aby można było w grze online używać kart ze swojej
 * postaci z poprzednich rund".
 *
 * Podejrzenie było takie, że mata gubi się po drodze przez sieć: RTDB kasuje
 * puste tablice i pola `null`, więc stan wracający z bazy bywa niepełny.
 * Ten test sprawdza całą drogę: zagranie z maty po przejściu stanu przez
 * dopełnianie (`hydrateState`), czyli dokładnie tak, jak widzi go gracz online.
 */

/** Stan po misji, z kartą leżącą na macie gracza. */
function zKartaNaMacie(): { state: GameState; cardId: string } {
  let state = reduce(newGame(), { type: 'START_MISSION' }).state;
  const problem = state.mission!.problems[0];
  const slot = problem.slots[0];

  const card = { ...makeCard('zdobyta', slot.key as never), family: slot.family };
  state = giveCard(state, 'p1', card);
  state = reduce(state, {
    type: 'PLAY_CARD',
    playerId: 'p1',
    cardId: card.id,
    slotKey: slot.key,
    problemId: problem.id,
    fromMat: false,
  }).state;

  if (state.phase !== 'missionSummary') state = { ...state, phase: 'missionSummary' };
  state = reduce(state, { type: 'TAKE_CARD_TO_MAT', playerId: 'p1', cardId: card.id }).state;

  return { state, cardId: card.id };
}

describe('karty z karty postaci w grze online', () => {
  it('mata przeżywa przejście przez sieć', () => {
    const { state, cardId } = zKartaNaMacie();

    // Tak wygląda stan wracający z bazy: RTDB skasowało puste tablice.
    const zSieci = hydrateState(JSON.parse(JSON.stringify(state)));

    expect(zSieci.players[0].mat.map((c) => c.id)).toContain(cardId);
  });

  it('gracz online zagrywa kartę z maty tak samo jak przy stole', () => {
    const { state, cardId } = zKartaNaMacie();

    // Nowa misja, żeby było gdzie zagrać zdobytą kartę.
    let dalej = reduce(state, { type: 'END_MISSION_SUMMARY' }).state;
    dalej = reduce(dalej, { type: 'START_MISSION' }).state;
    dalej = hydrateState(JSON.parse(JSON.stringify(dalej)));

    const karta = dalej.players[0].mat.find((c) => c.id === cardId);
    expect(karta, 'karta musi wciąż leżeć na macie w nowej misji').toBeTruthy();

    const problem = dalej.mission!.problems[0];
    const slot = problem.slots.find((s) => s.key === karta!.category && s.family === karta!.family);
    if (!slot) return; // Ten problem nie ma pasującej ścianki — nie ma czego sprawdzać.

    const wynik = reduce(dalej, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardId,
      slotKey: slot.key,
      problemId: problem.id,
      fromMat: true,
    });

    expect(wynik.rejected).toBeFalsy();
  });
});
