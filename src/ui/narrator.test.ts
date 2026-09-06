import { describe, it, expect } from 'vitest';
import { komentarz, odpowiedzNa, ZASADY } from './narrator';
import type { GameState, MissionState, Problem } from '../engine/types';

/**
 * Adam poprosił o okienko ETER, które „komentuje na bieżąco, co się dzieje
 * w grze, zarówno narracyjnie niczym narrator filmu (…) plus aby był komentarz,
 * co teraz kto musi zrobić", oraz o możliwość zadania pytania o zasady.
 *
 * Wszystko poniżej liczy się ze stanu gry, bez modelu językowego — Alan przy
 * tym samym zgłoszeniu napisał „Koszty… i jeszcze raz koszty…", a płatne
 * wywołanie przy każdym ruchu w grze dla dzieci to koszt bez końca. Te testy
 * pilnują, że narrator mówi PRAWDĘ o stanie partii; gdyby zmyślał, byłby
 * gorszy niż jego brak.
 */

function problem(over: Partial<Problem> = {}): Problem {
  return {
    id: 'p1',
    name: 'Zły robot w szkole',
    story: '',
    antagonist: '',
    consequence: '',
    goal: '',
    type: 'action',
    icon: 'warning',
    slots: [
      { key: 'psychological', family: 'red', hint: '' },
      { key: 'digital', family: 'blue', hint: '' },
    ],
    ...over,
  } as Problem;
}

function stan(over: Partial<GameState> = {}, misja?: Partial<MissionState>): GameState {
  return {
    rng: 1,
    config: { roundsPerMission: 3 } as GameState['config'],
    players: [
      { id: 'a', name: 'Adam' },
      { id: 'b', name: 'Marcin' },
    ] as GameState['players'],
    activePlayerIndex: 0,
    drawPile: [],
    discardPile: [],
    problemPile: [],
    solvedProblems: [],
    unsolvedProblems: [],
    unsolvedSince: {},
    missionNumber: 0,
    phase: 'mission',
    log: [],
    mission: {
      problems: [problem()],
      played: [],
      round: 1,
      phase: 'play',
      matUsedBy: [],
      activeBlackSwans: [],
      slotsFilledBeforeDoubling: [],
      takenToMat: [],
      receivedCards: [],
      ...misja,
    } as unknown as MissionState,
    ...over,
  } as GameState;
}

describe('narrator ETER — co teraz robić', () => {
  it('mówi po imieniu, czyja jest kolej', () => {
    const { wskazowka } = komentarz(stan());
    expect(wskazowka).toContain('Adam');
  });

  /**
   * Gracz patrzący na swój telefon ma usłyszeć „Ty masz ruch", nie „Adam ma
   * ruch" — inaczej w grze online musi się domyślać, czy chodzi o niego.
   */
  it('do gracza przy jego turze mówi wprost „Ty"', () => {
    const { wskazowka } = komentarz(stan(), 'a');
    expect(wskazowka).toContain('Ty masz ruch');
    expect(wskazowka).not.toContain('Adam');
  });

  it('podpowiada, jakiej ścianki brakuje', () => {
    const { wskazowka } = komentarz(stan());
    // Nazwa ścianki idzie z `slotLabel`, czyli tej samej, którą dziecko widzi
    // na planszy — narrator nie może nazywać rzeczy inaczej niż ekran.
    expect(wskazowka).toContain('brakuje:');
    expect(wskazowka.split('brakuje:')[1].trim().length).toBeGreaterThan(3);
  });

  it('ostatnia runda brzmi inaczej niż pierwsza', () => {
    const pierwsza = komentarz(stan({}, { round: 1 })).narracja;
    const ostatnia = komentarz(stan({}, { round: 3 })).narracja;
    expect(ostatnia).not.toBe(pierwsza);
    expect(ostatnia).toContain('ostatnia runda');
  });

  it('gdy nic nie brakuje, nie każe nic dokładać', () => {
    const misja = {
      problems: [problem({ slots: [] })],
    };
    const { wskazowka } = komentarz(stan({}, misja));
    expect(wskazowka).toBe('Nie trzeba już nic dokładać.');
  });
});

describe('narrator ETER — fazy poza misją', () => {
  it('przed pierwszą misją zaprasza do odkrycia problemu', () => {
    const { wskazowka } = komentarz(stan({ phase: 'setup', mission: null }));
    expect(wskazowka).toContain('Odkryjcie problem');
  });

  it('na podsumowaniu mówi, co dalej z kartami', () => {
    const { wskazowka } = komentarz(
      stan({ phase: 'missionSummary', solvedProblems: [problem()] }),
    );
    expect(wskazowka).toContain('kartę');
  });

  it('wygrana i przegrana brzmią różnie i podają liczby', () => {
    const wygrana = komentarz(
      stan({ phase: 'finale', solvedProblems: [problem(), problem()], unsolvedProblems: [problem()] }),
    );
    const przegrana = komentarz(
      stan({ phase: 'finale', solvedProblems: [problem()], unsolvedProblems: [problem(), problem()] }),
    );

    expect(wygrana.narracja).not.toBe(przegrana.narracja);
    expect(wygrana.wskazowka).toContain('2 z 3');
    expect(przegrana.wskazowka).toContain('2');
  });

  /** Narrator nie może wywrócić gry, gdy stan jest niepełny. */
  it('bez misji nie wybucha', () => {
    const wynik = komentarz(stan({ mission: null }));
    expect(wynik.narracja.length).toBeGreaterThan(0);
    expect(wynik.wskazowka.length).toBeGreaterThan(0);
  });
});

describe('pytania o zasady', () => {
  it('rozpoznaje pytanie zadane własnymi słowami', () => {
    expect(odpowiedzNa('nie mogę zagrać karty')?.pytanie).toBe('Jak zagrać kartę?');
    expect(odpowiedzNa('co to czarny łabędź')?.pytanie).toBe('Co to Czarny Łabędź?');
    expect(odpowiedzNa('jak wygrać?')?.pytanie).toBe('Jak wygrać?');
  });

  it('rozpoznaje pytanie kliknięte z listy', () => {
    for (const zasada of ZASADY) {
      expect(odpowiedzNa(zasada.pytanie)?.odpowiedz).toBe(zasada.odpowiedz);
    }
  });

  /**
   * Lepiej powiedzieć „nie wiem, wybierz z listy" niż odpowiedzieć na inne
   * pytanie, niż zadano — dziecko uwierzy w odpowiedź, którą dostanie.
   */
  it('na pytanie spoza zasad nie zmyśla', () => {
    expect(odpowiedzNa('jaka jest stolica Francji')).toBeNull();
    expect(odpowiedzNa('')).toBeNull();
    expect(odpowiedzNa('   ')).toBeNull();
  });

  it('każda zasada ma treść i słowa do rozpoznania', () => {
    for (const zasada of ZASADY) {
      expect(zasada.odpowiedz.length).toBeGreaterThan(20);
      expect(zasada.slowa.length).toBeGreaterThan(0);
    }
  });
});
