import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  TUTORIAL_DECK,
  TUTORIAL_HAND,
  TUTORIAL_PLAYER,
  TUTORIAL_PROBLEM,
  TUTORIAL_STEPS,
} from '../../data/tutorial';
import { createGame, DEFAULT_CONFIG, reduce } from '../../engine/reducer';
import { cardFitsSlot } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import { TutorialLayer } from './TutorialLayer';
import { hasSeenTutorial, useTutorial, type TutorialContext } from './useTutorial';

/** Gra samouczka: jeden gracz, ustawiona ręka i talia. */
const tutorialGame = (): GameState => {
  const base = createGame({
    players: [TUTORIAL_PLAYER],
    deck: TUTORIAL_DECK,
    problems: [TUTORIAL_PROBLEM],
    seed: 1,
    config: DEFAULT_CONFIG,
  });

  const seeded: GameState = {
    ...base,
    players: base.players.map((p) => ({ ...p, hand: [...TUTORIAL_HAND] })),
    drawPile: [...TUTORIAL_DECK],
    discardPile: [],
  };

  return reduce(seeded, { type: 'START_MISSION' }).state;
};

const idle: TutorialContext = {
  handRevealed: false,
  cardSelected: false,
  swapMode: false,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('scenariusz samouczka', () => {
  it('gra jedna osoba', () => {
    expect(tutorialGame().players).toHaveLength(1);
  });

  it('ręka startowa ma trzy karty pasujące do ścianek', () => {
    const matching = TUTORIAL_HAND.filter((card) =>
      TUTORIAL_PROBLEM.slots.some((slot) =>
        cardFitsSlot(card, slot.key, slot.family),
      ),
    );
    expect(matching).toHaveLength(3);
  });

  it('po zagraniu trzech kart żadna z ręki nie pasuje — krok wymiany ma sens', () => {
    const playable = TUTORIAL_HAND.filter((card) =>
      TUTORIAL_PROBLEM.slots.some((slot) =>
        cardFitsSlot(card, slot.key, slot.family),
      ),
    );
    const leftovers = TUTORIAL_HAND.filter((card) => !playable.includes(card));

    expect(leftovers.length).toBeGreaterThan(0);
    for (const card of leftovers) {
      const fits = TUTORIAL_PROBLEM.slots.some((slot) =>
        cardFitsSlot(card, slot.key, slot.family),
      );
      expect(fits, `karta ${card.name} jednak pasuje`).toBe(false);
    }
  });

  it('talia zawiera karty do dwóch ostatnich ścianek', () => {
    const blueSlots = TUTORIAL_PROBLEM.slots.filter((s) => s.family === 'blue');
    expect(blueSlots).toHaveLength(2);

    for (const slot of blueSlots) {
      const matching = TUTORIAL_DECK.filter((card) =>
        cardFitsSlot(card, slot.key, slot.family),
      );
      expect(matching.length, `brak kart na ${slot.key}`).toBeGreaterThan(0);
    }
  });

  it('każdą ściankę da się zamknąć kartą z ręki albo talii', () => {
    const available = [...TUTORIAL_HAND, ...TUTORIAL_DECK];
    for (const slot of TUTORIAL_PROBLEM.slots) {
      const matching = available.filter((card) =>
        cardFitsSlot(card, slot.key, slot.family),
      );
      expect(matching.length, `nie da się zamknąć ${slot.key}`).toBeGreaterThan(0);
    }
  });
});

describe('useTutorial — kroki', () => {
  const setup = (context: TutorialContext = idle, state = tutorialGame()) =>
    renderHook(({ ctx }) => useTutorial(true, state, ctx, vi.fn()), {
      initialProps: { ctx: context },
    });

  it('zaczyna od pierwszego kroku', () => {
    const { result } = setup();
    expect(result.current.active).toBe(true);
    if (!result.current.active) return;
    expect(result.current.stepNumber).toBe(1);
    expect(result.current.done).toBe(false);
  });

  it('odkrycie kart zalicza pierwszy krok', () => {
    const { result, rerender } = setup();
    rerender({ ctx: { ...idle, handRevealed: true } });
    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.done).toBe(true);
  });

  it('na pierwszym kroku blokuje wszystkie ruchy', () => {
    const { result } = setup();
    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.allows('play')).toBe(false);
    expect(result.current.allows('swap')).toBe(false);
    expect(result.current.allows('pass')).toBe(false);
  });

  it('po wykonaniu kroku przestaje blokować', () => {
    const { result, rerender } = setup();
    rerender({ ctx: { ...idle, handRevealed: true } });
    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.allows('play')).toBe(true);
  });

  it('krok wymiany pozwala tylko wymieniać', () => {
    const swapStep = TUTORIAL_STEPS.findIndex((s) => s.goal === 'swapCards');
    expect(swapStep).toBeGreaterThan(0);

    const step = TUTORIAL_STEPS[swapStep];
    expect(step.allow).toEqual(['swap']);
  });

  it('każdy krok ma tekst i pochwałę', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.say.length, `krok ${step.id}`).toBeGreaterThan(10);
      expect(step.praise.length, `krok ${step.id}`).toBeGreaterThan(5);
    }
  });
});

describe('TutorialLayer', () => {
  function Harness({ context }: { context: TutorialContext }) {
    const tutorial = useTutorial(true, tutorialGame(), context, vi.fn());
    return <TutorialLayer tutorial={tutorial} />;
  }

  it('pokazuje pierwszą wypowiedź ETER11', () => {
    render(<Harness context={idle} />);
    const dialog = screen.getByRole('dialog', { name: 'Samouczek' });

    // Tekst pisze się literami — kliknięcie pokazuje całość.
    fireEvent.click(dialog.querySelector('p')!);
    expect(dialog.textContent).toMatch(/Pokaż moje karty/);
  });

  it('pokazuje numer kroku', () => {
    render(<Harness context={idle} />);
    expect(screen.getByText(`1 / ${TUTORIAL_STEPS.length}`)).toBeDefined();
  });

  it('przycisk „Dalej" pojawia się dopiero po wykonaniu kroku', () => {
    const { rerender } = render(<Harness context={idle} />);
    expect(screen.queryByRole('button', { name: /Dalej/ })).toBeNull();

    rerender(<Harness context={{ ...idle, handRevealed: true }} />);
    expect(screen.getByRole('button', { name: /Dalej/ })).toBeDefined();
  });

  it('przejście dalej pokazuje kolejny krok', () => {
    render(<Harness context={{ ...idle, handRevealed: true }} />);

    act(() => {
      screen.getByRole('button', { name: /Dalej/ }).click();
    });

    expect(screen.getByText(`2 / ${TUTORIAL_STEPS.length}`)).toBeDefined();
  });

  it('nic nie renderuje, gdy samouczek jest wyłączony', () => {
    render(<TutorialLayer tutorial={{ active: false }} />);
    expect(screen.queryByRole('dialog', { name: 'Samouczek' })).toBeNull();
  });
});

describe('hasSeenTutorial', () => {
  it('na start zwraca false', () => {
    expect(hasSeenTutorial()).toBe(false);
  });

  it('pominięcie zapamiętuje przejście', () => {
    function Harness() {
      const tutorial = useTutorial(true, tutorialGame(), idle, vi.fn());
      return <TutorialLayer tutorial={tutorial} />;
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Pomiń samouczek' }));

    expect(hasSeenTutorial()).toBe(true);
  });

  it('nie wywraca się, gdy zapis jest zablokowany', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('tryb prywatny');
    });
    expect(hasSeenTutorial()).toBe(false);
    spy.mockRestore();
  });
});
