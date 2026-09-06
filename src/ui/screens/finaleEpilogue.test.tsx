import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupGame } from '../useGame';
import { ALL_CHARACTERS } from '../../data/characters';
import { ALL_PROBLEMS } from '../../data/problems';
import { DEFAULT_UI_TEXT } from '../../data/uiText';
import type { Game } from '../useGame';
import type { GameState } from '../../engine/types';
import { FinaleScreen } from './FinaleScreen';

/**
 * Epilog na ekranie końcowym.
 *
 * Adam poprosił wprost: „aby pełnymi zdaniami, myślę że 5-10 zdań opisywało
 * co się wydarzyło podczas tych rund, czego się nauczyliśmy, czego zabrakło
 * — jak Epilog w książce czy filmie", i podkreślił: „na pewno ważne, aby nie
 * było 1 zdanie". Wcześniej ekran końcowy miał tylko jednozdaniowy nagłówek
 * wyniku i (przy przegranej) jedno dopisane zdanie „Możecie przegrać bitwę,
 * ale nie wojnę" — dokładnie to, o co Adam prosił, żeby NIE było.
 */
function gameFor(state: GameState): Game {
  return {
    state,
    dispatch: () => {},
    rejection: null,
    dismissRejection: () => {},
  } as unknown as Game;
}

function finaleState(won: boolean): GameState {
  const base = setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: ALL_CHARACTERS[0].id },
      { id: 'p2', name: 'Bo', characterId: ALL_CHARACTERS[1].id },
    ],
    7,
  );
  return {
    ...base,
    phase: 'finale',
    mission: null,
    solvedProblems: won ? ALL_PROBLEMS.slice(0, 5) : ALL_PROBLEMS.slice(0, 2),
    unsolvedProblems: won ? [] : ALL_PROBLEMS.slice(2, 3),
  };
}

describe('epilog na ekranie końcowym', () => {
  it('po wygranej pokazuje wielozdaniowy epilog, nie jedno zdanie', () => {
    render(<FinaleScreen game={gameFor(finaleState(true))} onRestart={() => {}} />);

    // Epilog jest teraz podzielony na akapity, więc szukamy po jego początku,
    // a nie po całym tekście jednym ciągiem.
    expect(
      screen.getByText((tresc) =>
        tresc.startsWith(DEFAULT_UI_TEXT.finaleEpilogueWon.split('\n')[0]),
      ),
    ).toBeTruthy();
    // Adam: „na pewno ważne aby nie było 1 zdanie" — liczymy kropki kończące
    // zdania (nie licząc skrótów w środku), musi ich być kilka.
    const zdania = DEFAULT_UI_TEXT.finaleEpilogueWon.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(zdania.length).toBeGreaterThanOrEqual(5);
  });

  it('po przegranej pokazuje inny, też wielozdaniowy epilog', () => {
    render(<FinaleScreen game={gameFor(finaleState(false))} onRestart={() => {}} />);

    expect(
      screen.getByText((tresc) =>
        tresc.startsWith(DEFAULT_UI_TEXT.finaleEpilogueLost.split('\n')[0]),
      ),
    ).toBeTruthy();
    const zdania = DEFAULT_UI_TEXT.finaleEpilogueLost.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(zdania.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_UI_TEXT.finaleEpilogueLost).not.toBe(DEFAULT_UI_TEXT.finaleEpilogueWon);
  });

  it('puste pole epilogu nie zostawia pustego akapitu', () => {
    render(
      <FinaleScreen
        game={gameFor(finaleState(true))}
        onRestart={() => {}}
        text={{ ...DEFAULT_UI_TEXT, finaleEpilogueWon: '   ' }}
      />,
    );

    expect(screen.queryByText(/^\s*$/, { selector: 'p.leading-relaxed' })).toBeNull();
  });
});

/**
 * Adam po pierwszej wersji epilogu: „dziś dopisałem kilka zdań w tych
 * odpowiedziach, ale udoskonal je, aby były jeszcze lepsze".
 *
 * Dwie rzeczy, które poprawiłem i które te testy pilnują:
 *
 * 1. Epilog nie może opowiadać o wydarzeniach, których w danej partii nie
 *    było. Poprzednia wersja mówiła „miasto znów ma prąd, plotka ucichła" —
 *    a drużyna mogła grać o zupełnie innych problemach. Tekst jest jeden dla
 *    wszystkich partii, więc musi być prawdziwy dla każdej.
 * 2. Pięć akapitów zlanych w jedną ścianę tekstu dziecko po prostu pominie.
 */
describe('epilog czyta się jak zakończenie książki', () => {
  it('jest podzielony na akapity, nie jest jedną ścianą tekstu', () => {
    for (const tekst of [DEFAULT_UI_TEXT.finaleEpilogueWon, DEFAULT_UI_TEXT.finaleEpilogueLost]) {
      const akapity = tekst.split('\n\n').filter((a) => a.trim());
      expect(akapity.length, 'epilog ma mieć kilka akapitów').toBeGreaterThanOrEqual(4);
    }
  });

  it('nie opowiada o wydarzeniach, których w partii mogło nie być', () => {
    // Konkrety z jednego problemu („miasto ma prąd") są nieprawdą w partii
    // o innych problemach — a tekst jest wspólny dla wszystkich.
    const zmyslone = ['miasto znów ma prąd', 'plotka, która krążyła'];
    for (const tekst of [DEFAULT_UI_TEXT.finaleEpilogueWon, DEFAULT_UI_TEXT.finaleEpilogueLost]) {
      for (const fraza of zmyslone) {
        expect(tekst.toLowerCase()).not.toContain(fraza);
      }
    }
  });

  it('przegrana pyta o wnioski, zamiast tłumaczyć porażkę', () => {
    // Pytanie „czego zabrakło?" jest tu sednem: uczy więcej niż pocieszenie.
    expect(DEFAULT_UI_TEXT.finaleEpilogueLost).toContain('czego zabrakło');
  });
});
