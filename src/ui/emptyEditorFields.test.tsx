import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProblemCard } from './components/ProblemCard';
import { FinaleScreen } from './screens/FinaleScreen';
import { DEFAULT_UI_TEXT } from '../data/uiText';
import { ALL_PROBLEMS } from '../data/problems';
import { newGame } from '../engine/testFixtures';
import { reduce } from '../engine/reducer';
import type { Game } from './useGame';

/**
 * Pola, których redaktor nie musi wypełniać, nie mogą zostawiać śmieci
 * na ekranie.
 *
 * „Przeciwnik", „Jeśli się nie uda" i lista przykładowych zawodów nie
 * przechodzą żadnej walidacji — nowy problem zaczyna z pustymi polami, a
 * teksty interfejsu da się wyczyścić do zera. Na ekranie zostawały wtedy
 * podpisy bez treści i wiersz „Przykłady zawodów przyszłości: ." z samą
 * kropką: wygląda jak zepsuta gra, choć to tylko niewypełnione pole.
 */

/**
 * Misja z prawdziwego silnika, z podmienionym problemem.
 *
 * Ręcznie klecony obiekt rozjeżdża się z kształtem przy każdej zmianie
 * w silniku — lepiej wziąć misję, którą gra naprawdę tworzy.
 */
const missionWith = (problem: (typeof ALL_PROBLEMS)[number]) => {
  const started = reduce(newGame(), { type: 'START_MISSION' }).state;
  return { ...started.mission!, problems: [problem] };
};

const gameFor = (state: ReturnType<typeof newGame>): Game =>
  ({
    state,
    dispatch: () => {},
    rejection: null,
    dismissRejection: () => {},
  }) as unknown as Game;

describe('puste pola redaktora nie zostawiają śmieci', () => {
  it('karta problemu bez „przeciwnika" nie pokazuje samego podpisu', () => {
    const problem = { ...ALL_PROBLEMS[0], antagonist: '', consequence: '   ' };
    render(
      <ProblemCard
        problem={problem}
        mission={missionWith(problem)}
        selectedCard={null}
        onSlotClick={() => {}}
        canPlayInSlot={() => false}
      />,
    );

    expect(screen.queryByText('Przeciwnik')).toBeNull();
    expect(screen.queryByText('Jeśli się nie uda')).toBeNull();
  });

  it('karta problemu z wypełnionymi polami nadal je pokazuje', () => {
    const problem = {
      ...ALL_PROBLEMS[0],
      antagonist: 'Zxqvantagonista',
      consequence: 'Zxqvskutek',
    };
    render(
      <ProblemCard
        problem={problem}
        mission={missionWith(problem)}
        selectedCard={null}
        onSlotClick={() => {}}
        canPlayInSlot={() => false}
      />,
    );

    // `getAllBy`, nie `getBy`: karta pokazuje te pola w dwóch miejscach —
    // w skrócie i w rozwijanej „całej historii".
    expect(screen.getAllByText('Zxqvantagonista').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Zxqvskutek').length).toBeGreaterThan(0);
  });

  it('ekran końcowy bez listy zawodów nie pokazuje sierocej kropki', () => {
    const state = { ...newGame(), phase: 'finale' as const };
    render(
      <FinaleScreen
        game={gameFor(state)}
        onRestart={() => {}}
        text={{ ...DEFAULT_UI_TEXT, finaleJobExamples: '  ,  , ' }}
      />,
    );

    expect(screen.queryByText(/Przykłady zawodów przyszłości/)).toBeNull();
  });

  it('ekran końcowy z listą zawodów nadal ją pokazuje', () => {
    const state = { ...newGame(), phase: 'finale' as const };
    render(
      <FinaleScreen
        game={gameFor(state)}
        onRestart={() => {}}
        text={{ ...DEFAULT_UI_TEXT, finaleJobExamples: 'projektant gier, opiekun robotów' }}
      />,
    );

    expect(screen.getByText(/projektant gier/)).toBeTruthy();
  });
});

