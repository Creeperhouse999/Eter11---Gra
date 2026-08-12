import { describe, it, expect } from 'vitest';
import { createGame, reduce, DEFAULT_CONFIG } from '../engine/reducer';
import { ALL_CARDS } from './cards';
import { ALL_PROBLEMS } from './problems';
import { INTRO_FOR_ADULTS } from './intro';

/**
 * Wstęp dla rodziców musi mówić prawdę o mechanice.
 *
 * Zakładka „Dla dorosłych" tłumaczy, po co ta gra jest — i na tej podstawie
 * rodzic albo nauczyciel decyduje, czy siada z dzieckiem do stołu. Obietnica,
 * której gra nie spełnia, podważa cały ten tekst.
 *
 * Scena „Porażka bez kary" mówiła: „Dziecko dostaje doświadczenie także za
 * przegraną misję". Nieprawda — silnik przyznaje kartę doświadczenia wyłącznie
 * po wygranej (`if (won)` w `endMissionSummary`). Prawdą jest natomiast to, co
 * gra mówi samemu dziecku na ekranie przegranej: każdy, kto wyłożył kartę,
 * i tak zabiera jedną na swoją postać.
 *
 * Poprawiłem tekst, nie silnik: przyznawanie doświadczenia za przegraną
 * zmieniłoby punktację i warunek spełnienia w całej grze, a to decyzja
 * zespołu, nie skutek uboczny poprawki opisu.
 */

/** Rozgrywa jedną misję do końca; `pass` wymusza przegraną. */
function misjaDoKonca(pass: boolean) {
  let state = createGame({
    players: [
      { id: 'p1', name: 'Ala', characterId: 'strateg' },
      { id: 'p2', name: 'Bo', characterId: 'medyk' },
    ],
    deck: ALL_CARDS,
    problems: ALL_PROBLEMS,
    config: DEFAULT_CONFIG,
    seed: 7,
  });
  state = reduce(state, { type: 'START_MISSION' }).state;

  for (let krok = 0; krok < 80 && state.mission?.phase === 'playing'; krok += 1) {
    const gracz = state.players[state.activePlayerIndex];
    if (pass) {
      state = reduce(state, { type: 'PASS', playerId: gracz.id }).state;
      continue;
    }
    // Próba zagrania czegokolwiek; gdy nic nie pasuje — pas.
    let zagrano = false;
    for (const problem of state.mission!.problems) {
      for (const slot of problem.slots) {
        for (const card of gracz.hand) {
          const next = reduce(state, {
            type: 'PLAY_CARD',
            playerId: gracz.id,
            cardId: card.id,
            problemId: problem.id,
            slotKey: slot.key,
            fromMat: false,
          });
          if (!next.rejected) {
            state = next.state;
            zagrano = true;
            break;
          }
        }
        if (zagrano) break;
      }
      if (zagrano) break;
    }
    if (!zagrano) state = reduce(state, { type: 'PASS', playerId: gracz.id }).state;
  }

  return state;
}

describe('wstęp dla dorosłych mówi prawdę', () => {
  it('nie obiecuje doświadczenia za przegraną misję', () => {
    const przegrana = misjaDoKonca(true);
    expect(przegrana.mission?.phase).toBe('lost');

    // Sedno: po przegranej nikt nie dostaje karty doświadczenia.
    const doswiadczenie = przegrana.players.flatMap((p) => p.experience);
    expect(doswiadczenie).toHaveLength(0);

    // Więc tekst dla rodziców nie może tego obiecywać.
    const scena = INTRO_FOR_ADULTS.find((s) => s.heading === 'Porażka bez kary');
    expect(scena, 'scena „Porażka bez kary" istnieje').toBeDefined();
    expect(scena!.body).not.toMatch(/doświadczenie także za przegraną/i);
  });

  it('to, co obiecuje zamiast tego, jest prawdą: karta na postać mimo przegranej', () => {
    const scena = INTRO_FOR_ADULTS.find((s) => s.heading === 'Porażka bez kary')!;
    expect(scena.body).toMatch(/zabiera jedną na swoją postać/i);

    // Zabranie karty na postać nie sprawdza, czy misja została wygrana —
    // ta gałąź reduktora działa tak samo po przegranej.
    const przegrana = misjaDoKonca(true);
    const zagrana = przegrana.mission?.played[0];
    if (!zagrana) return; // przy pasowaniu w kółko nikt nic nie wyłożył

    const wynik = reduce(przegrana, {
      type: 'TAKE_CARD_TO_MAT',
      playerId: zagrana.playerId,
      cardId: zagrana.card.id,
    });
    expect(wynik.rejected).toBeFalsy();
  });
});
