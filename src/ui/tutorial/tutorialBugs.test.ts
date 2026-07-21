import { describe, it, expect } from 'vitest';
import { anchorFor, isGoalMet, type TutorialContext } from './useTutorial';
import { TUTORIAL_PROBLEM, TUTORIAL_PLAYER } from '../../data/tutorial';
import type { GameState } from '../../engine/types';

/**
 * Regresje zgłoszone przez gracza podczas przechodzenia samouczka.
 *
 * Testy w tutorial.test.tsx podawały kontekst spreparowany ręcznie, więc
 * przechodziły mimo tych błędów. Tutaj odtwarzamy kontekst dokładnie taki,
 * jaki MissionScreen naprawdę produkuje — bo w szwie między nim a
 * useTutorial siedziały wszystkie trzy usterki.
 */

/** Kontekst z domyślnymi wartościami — testy nadpisują tylko to, co istotne. */
const ctx = (patch: Partial<TutorialContext> = {}): TutorialContext => ({
  handRevealed: true,
  cardSelected: false,
  swapMode: false,
  swapSelected: 0,
  targetSlot: null,
  swapCount: 0,
  ...patch,
});

/** Stan misji z zadaną liczbą zagranych kart. */
const stateWith = (played: number, phase = 'playing'): GameState =>
  ({
    mission: {
      problems: [TUTORIAL_PROBLEM],
      played: Array.from({ length: played }, (_, i) => ({
        cardId: `c${i}`,
        problemId: TUTORIAL_PROBLEM.id,
        slotKey: 'mentor',
        playerId: TUTORIAL_PLAYER.id,
      })),
      swappedThisRound: [],
      takenToMat: [],
      phase,
      round: 1,
    },
  }) as unknown as GameState;

describe('krok 3 „to Twoje karty" — podświetlenie ręki, nie ścianki', () => {
  // MissionScreen liczy targetSlot także BEZ wybranej karty: skanuje całą
  // rękę i zwraca pierwszą ściankę, którą da się zamknąć. Dlatego w chwili
  // wejścia w krok 3 targetSlot jest już niepuste — a krok mówi o kartach.
  it('bez wybranej karty celuje w rękę, mimo że targetSlot jest ustawiony', () => {
    const anchor = anchorFor('selectCard', ctx({ targetSlot: 'tutorial-1:mentor' }));
    expect(anchor).toBe('[data-tour="playable-card"]');
  });

  it('po wybraniu karty przenosi podświetlenie na pasującą ściankę', () => {
    const anchor = anchorFor(
      'selectCard',
      ctx({ cardSelected: true, targetSlot: 'tutorial-1:mentor' }),
    );
    expect(anchor).toBe('[data-slot="tutorial-1:mentor"]');
  });

  it('krok po wymianie zachowuje się tak samo', () => {
    expect(anchorFor('playAfterSwap', ctx({ targetSlot: 'tutorial-1:social' }))).toBe(
      '[data-tour="playable-card"]',
    );
    expect(
      anchorFor('playAfterSwap', ctx({ cardSelected: true, targetSlot: 'tutorial-1:social' })),
    ).toBe('[data-slot="tutorial-1:social"]');
  });
});

describe('krok 6 „wymień karty" — wymaga faktycznej wymiany', () => {
  // Przy jednym graczu każdy ruch kończy rundę i gracz dobiera kartę.
  // handChanged porównywał rękę do zapamiętanej na starcie misji, więc po
  // zagraniu karty w kroku 4 zapalał się na zawsze i krok 6 zaliczał się sam.
  it('nie zalicza się przez samo dobranie karty po zagraniu', () => {
    expect(isGoalMet('swapCards', stateWith(2), ctx())).toBe(false);
  });

  it('nie zalicza się przez zagranie trzeciej karty', () => {
    expect(isGoalMet('swapCards', stateWith(3), ctx())).toBe(false);
  });

  it('zalicza się po prawdziwej wymianie', () => {
    const state = stateWith(2);
    state.mission!.swappedThisRound = ['card-a'];
    expect(isGoalMet('swapCards', state, ctx())).toBe(true);
  });

  it('zalicza się, gdy wymiana zakończyła rundę i flaga zgasła', () => {
    // swappedThisRound czyści się z nową rundą — wtedy dowodem jest licznik
    // wymian zliczony przez MissionScreen.
    expect(isGoalMet('swapCards', stateWith(2), ctx({ swapCount: 1 }))).toBe(true);
  });
});

describe('krok po wymianie — nie zalicza się razem z krokiem wymiany', () => {
  it('wymaga karty zagranej PO wymianie', () => {
    // Trzy czerwone schodzą przed wymianą; dopiero czwarta karta to ta
    // zagrana kartą zdobytą z wymiany.
    expect(isGoalMet('playAfterSwap', stateWith(3), ctx({ swapCount: 1 }))).toBe(false);
    expect(isGoalMet('playAfterSwap', stateWith(4), ctx({ swapCount: 1 }))).toBe(true);
  });
});
