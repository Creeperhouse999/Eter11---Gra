import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TUTORIAL_PROBLEM, TUTORIAL_STEPS } from '../../data/tutorial';
import { ALL_CARDS } from '../../data/cards';
import { createGame, DEFAULT_CONFIG, reduce } from '../../engine/reducer';
import { cardFitsSlot } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import { TutorialLayer } from './TutorialLayer';
import { hasSeenTutorial } from './useTutorial';

const players = [
  { id: 'p1', name: 'Ala', characterId: 'ch-odkrywca' },
  { id: 'p2', name: 'Bartek', characterId: 'pa-opiekun' },
];

const newTutorialGame = (): GameState =>
  reduce(
    createGame({
      players,
      deck: ALL_CARDS,
      problems: [TUTORIAL_PROBLEM],
      seed: 1,
      config: DEFAULT_CONFIG,
    }),
    { type: 'START_MISSION' },
  ).state;

const idle = { handRevealed: false, cardSelected: false, swapMode: false };

beforeEach(() => {
  window.localStorage.clear();
});

describe('problem samouczka', () => {
  it('ma pięć ścianek w jednej rodzinie, żeby początkujący nie utknął', () => {
    expect(TUTORIAL_PROBLEM.slots).toHaveLength(5);
    const families = new Set(TUTORIAL_PROBLEM.slots.map((s) => s.family));
    expect(families.size).toBe(1);
  });

  it('każdą ściankę da się zamknąć kartą z talii', () => {
    for (const slot of TUTORIAL_PROBLEM.slots) {
      const matching = ALL_CARDS.filter((card) =>
        cardFitsSlot(card, slot.key, slot.family),
      );
      expect(matching.length, `brak kart na ${slot.key}`).toBeGreaterThan(0);
    }
  });
});

describe('TutorialLayer', () => {
  it('zaczyna od prośby o odkrycie kart', () => {
    render(
      <TutorialLayer
        active
        state={newTutorialGame()}
        context={idle}
        onFinish={vi.fn()}
      />,
    );

    // Tekst pisze się literami — kliknięcie pokazuje go od razu.
    const dialog = screen.getByRole('dialog', { name: 'Samouczek' });
    fireEvent.click(dialog.querySelector('p')!);

    expect(dialog.textContent).toMatch(/Pokaż moje karty/);
  });

  it('pokazuje numer kroku i ich liczbę', () => {
    render(
      <TutorialLayer active state={newTutorialGame()} context={idle} onFinish={vi.fn()} />,
    );
    expect(screen.getByText(`1 / ${TUTORIAL_STEPS.length}`)).toBeDefined();
  });

  it('po odkryciu kart chwali i pozwala iść dalej', () => {
    const { rerender } = render(
      <TutorialLayer active state={newTutorialGame()} context={idle} onFinish={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /Dalej/ })).toBeNull();

    rerender(
      <TutorialLayer
        active
        state={newTutorialGame()}
        context={{ ...idle, handRevealed: true }}
        onFinish={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Dalej/ })).toBeDefined();
  });

  it('pominięcie kończy samouczek i zapamiętuje to', () => {
    const onFinish = vi.fn();
    render(
      <TutorialLayer active state={newTutorialGame()} context={idle} onFinish={onFinish} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pomiń samouczek' }));

    expect(onFinish).toHaveBeenCalled();
    expect(hasSeenTutorial()).toBe(true);
  });

  it('nic nie renderuje, gdy jest wyłączony', () => {
    render(
      <TutorialLayer
        active={false}
        state={newTutorialGame()}
        context={idle}
        onFinish={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog', { name: 'Samouczek' })).toBeNull();
  });

  it('przejście dalej pokazuje kolejny krok', () => {
    const state = newTutorialGame();
    const context = { ...idle, handRevealed: true };

    render(<TutorialLayer active state={state} context={context} onFinish={vi.fn()} />);

    act(() => {
      screen.getByRole('button', { name: /Dalej/ }).click();
    });

    expect(screen.getByText(`2 / ${TUTORIAL_STEPS.length}`)).toBeDefined();
  });
});

describe('hasSeenTutorial', () => {
  it('na start zwraca false', () => {
    expect(hasSeenTutorial()).toBe(false);
  });

  it('nie wywraca się, gdy zapis jest zablokowany', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('tryb prywatny');
    });
    expect(hasSeenTutorial()).toBe(false);
    spy.mockRestore();
  });
});
