import { describe, it, expect } from 'vitest';
import { reduce } from './reducer';
import { giveCard, makeCard, newGame } from './testFixtures';
import type { CardCategory, GameState } from './types';

/**
 * Mentora wolno przekazać, talentu nie.
 *
 * Adam ustalił to wprost: „mentora można przekazywać, talentu nie". Wcześniej
 * silnik blokował oba — dzielić się dało się tylko umiejętnościami.
 *
 * Sens jest taki, że mentor to ktoś, kogo można komuś polecić albo z kim
 * można kogoś poznać. Talent jest własny: nie da się go oddać.
 */

/** Misja z kartą danej kategorii zagraną przez p1, gotowa do podsumowania. */
function poMisjiZKarta(kategoria: CardCategory): { state: GameState; cardId: string } {
  let state = reduce(newGame(), { type: 'START_MISSION' }).state;
  const problem = state.mission!.problems[0];
  const slot = problem.slots.find((s) => s.key === kategoria) ?? problem.slots[0];

  const card = { ...makeCard(`test-${kategoria}`, kategoria), family: slot.family };
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
  return { state, cardId: card.id };
}

const przekaz = (state: GameState, cardId: string) =>
  reduce(state, { type: 'SHARE_CARD', fromPlayerId: 'p1', toPlayerId: 'p2', cardId });

describe('co wolno przekazać innemu graczowi', () => {
  it('mentora wolno — tak ustalił Adam', () => {
    const { state, cardId } = poMisjiZKarta('mentor');

    const wynik = przekaz(state, cardId);

    expect(wynik.rejected).toBeFalsy();
    expect(wynik.state.players.find((p) => p.id === 'p2')!.mat.map((c) => c.id)).toContain(
      cardId,
    );
  });

  it('talentu nie wolno', () => {
    const { state, cardId } = poMisjiZKarta('talent');

    const wynik = przekaz(state, cardId);

    expect(wynik.rejected).toBeTruthy();
    expect(wynik.state.players.find((p) => p.id === 'p2')!.mat).toHaveLength(0);
  });

  it('odmowa tłumaczy zasadę, a nie tylko odmawia', () => {
    // Dziecko musi zrozumieć, DLACZEGO nie wolno — inaczej wygląda to na
    // usterkę gry, nie na regułę.
    const { state, cardId } = poMisjiZKarta('talent');

    expect(przekaz(state, cardId).rejected).toMatch(/talent/i);
  });

  it('umiejętności dalej wolno przekazywać', () => {
    const { state, cardId } = poMisjiZKarta('psychological');

    expect(przekaz(state, cardId).rejected).toBeFalsy();
  });

  it('ETER11 i Czarny Łabędź zostają u tego, kto je zagrał', () => {
    // Nie są kompetencjami do nauczenia: joker i utrudnienie.
    for (const kategoria of ['eter11', 'blackswan'] as CardCategory[]) {
      const { state, cardId } = poMisjiZKarta(kategoria);
      expect(przekaz(state, cardId).rejected, `${kategoria} nie powinno przejść`).toBeTruthy();
    }
  });
});
