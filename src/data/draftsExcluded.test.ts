import { describe, it, expect } from 'vitest';
import { ALL_CARDS, playableCards } from './cards';
import { ALL_PROBLEMS, playableProblems } from './problems';
import { setupGame } from '../ui/useGame';

/**
 * Wersje robocze (`draft`) NIE mogą trafić do gry.
 *
 * Nowa karta/problem rodzi się jako wersja robocza i czeka na sprawdzenie;
 * panel obiecuje redaktorowi, że „nie trafiają do gry", a test pokrycia ścianek
 * liczy tylko treść nieroboczą. Wcześniej ścieżka rozgrywki (setupGame) brała
 * jednak wszystkie karty i problemy — niedokończony materiał wychodził dzieciom
 * do prawdziwej partii. Te testy pilnują, że rozgrywka widzi tylko treść gotową.
 */

describe('playableCards / playableProblems', () => {
  it('odsiewają wersje robocze', () => {
    expect(ALL_CARDS.some((c) => c.draft)).toBe(true); // w danych SĄ robocze
    expect(playableCards(ALL_CARDS).some((c) => c.draft)).toBe(false);
    expect(playableCards(ALL_CARDS).length).toBeLessThan(ALL_CARDS.length);

    expect(ALL_PROBLEMS.some((p) => p.draft)).toBe(true);
    expect(playableProblems(ALL_PROBLEMS).some((p) => p.draft)).toBe(false);
    expect(playableProblems(ALL_PROBLEMS).length).toBeLessThan(ALL_PROBLEMS.length);
  });

  it('bez argumentu odsiewają z danych wbudowanych', () => {
    expect(playableCards().every((c) => !c.draft)).toBe(true);
    expect(playableProblems().every((p) => !p.draft)).toBe(true);
  });
});

describe('setupGame — wersje robocze nie wchodzą do partii', () => {
  const players = [
    { id: 'p1', name: 'Ala', characterId: 'c1' },
    { id: 'p2', name: 'Bo', characterId: 'c2' },
  ];

  it('żadna karta w talii ani na ręce nie jest robocza', () => {
    const state = setupGame(players, 1);
    const allCards = [
      ...state.drawPile,
      ...state.discardPile,
      ...state.players.flatMap((p) => p.hand),
    ];
    expect(allCards.length).toBeGreaterThan(0);
    expect(allCards.some((c) => c.draft)).toBe(false);
  });

  it('żaden problem w grze nie jest roboczy', () => {
    const state = setupGame(players, 1);
    const allProblems = [
      ...state.problemPile,
      ...state.solvedProblems,
      ...state.unsolvedProblems,
    ];
    expect(allProblems.some((p) => p.draft)).toBe(false);
    // Filtr naprawdę coś usunął — mniej niż wszystkich zdefiniowanych.
    expect(allProblems.length).toBe(playableProblems().length);
    expect(allProblems.length).toBeLessThan(ALL_PROBLEMS.length);
  });
});
