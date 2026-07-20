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
  // Samouczek odkrywa rękę od startu — gra jedna osoba.
  handRevealed: true,
  cardSelected: false,
  swapMode: false,
  swapSelected: 0,
  targetSlot: null,
  handChanged: false,
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

  it('zaczyna od wyjaśnienia, nie od zadania', () => {
    const { result } = setup();
    expect(result.current.active).toBe(true);
    if (!result.current.active) return;

    expect(result.current.stepNumber).toBe(1);
    // Krok czytany jest zaliczony od razu — gracz tylko naciska „Dalej".
    expect(result.current.step.readOnly).toBe(true);
    expect(result.current.done).toBe(true);
  });

  it('na pierwszym kroku nie ma czego cofać', () => {
    const { result } = setup();
    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.back).toBeNull();
  });

  it('można wrócić do poprzedniego wyjaśnienia', () => {
    const { result } = setup();
    if (!result.current.active) throw new Error('samouczek nieaktywny');

    act(() => result.current.active && result.current.next());
    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.stepNumber).toBe(2);
    expect(result.current.back).not.toBeNull();

    act(() => result.current.active && result.current.back?.());
    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.stepNumber).toBe(1);
  });

  it('samouczek zaczyna od wyjaśnień, dopiero potem prosi o ruch', () => {
    const readOnlyPrefix = TUTORIAL_STEPS.slice(0, 2).every((s) => s.readOnly);
    expect(readOnlyPrefix).toBe(true);

    const firstTask = TUTORIAL_STEPS.find((s) => !s.readOnly);
    expect(firstTask?.goal).toBe('selectCard');
  });

  it('krok z zadaniem blokuje ruchy spoza scenariusza', () => {
    const playStep = TUTORIAL_STEPS.find((s) => s.goal === 'playFirst');
    expect(playStep?.allow).toEqual(['play']);
  });

  it('po wykonaniu kroku przestaje blokować', () => {
    const { result, rerender } = setup();

    // Przechodzimy przez wyjaśnienia do pierwszego zadania.
    act(() => result.current.active && result.current.next());
    act(() => result.current.active && result.current.next());

    rerender({ ctx: { ...idle, cardSelected: true, targetSlot: 'tutorial-1:mentor' } });
    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.allows('play')).toBe(true);
  });

  it('krok wymiany pozwala tylko wymieniać', () => {
    const swapStep = TUTORIAL_STEPS.findIndex((s) => s.goal === 'swapCards');
    expect(swapStep).toBeGreaterThan(0);

    const step = TUTORIAL_STEPS[swapStep];
    expect(step.allow).toEqual(['swap']);
  });

  it('krok wymiany prowadzi przez trzy etapy', () => {
    const state = tutorialGame();
    const swapIndex = TUTORIAL_STEPS.findIndex((s) => s.goal === 'swapCards');

    // Ustawiamy hook na kroku wymiany, przechodząc przez poprzednie.
    const { result, rerender } = renderHook(
      ({ ctx }) => useTutorial(true, state, ctx, vi.fn()),
      { initialProps: { ctx: idle } },
    );

    for (let i = 0; i < swapIndex; i += 1) {
      rerender({ ctx: { ...idle, cardSelected: true } });
      if (!result.current.active) throw new Error('samouczek nieaktywny');
      act(() => result.current.active && result.current.next());
    }

    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.step.goal).toBe('swapCards');

    // Etap 1: przycisk otwierający wymianę.
    expect(result.current.anchor).toBe('[data-tour="swap"]');

    // Etap 2: tryb włączony, nic nie zaznaczono — podświetlamy karty.
    rerender({ ctx: { ...idle, swapMode: true } });
    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.anchor).toBe('[data-tour="hand"]');
    expect(result.current.message).toMatch(/kliknij karty/i);

    // Etap 3: coś zaznaczone — podświetlamy potwierdzenie.
    rerender({ ctx: { ...idle, swapMode: true, swapSelected: 2 } });
    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.anchor).toBe('[data-tour="swap-confirm"]');
    expect(result.current.message).toMatch(/Wymień 2/);
  });

  it('nie chwali, gdy wybrana karta nie pasuje do żadnej ścianki', () => {
    // Regresja: ETER11 mówił „ścianka zaświeciła" po kliknięciu dowolnej
    // karty — także takiej, która nie pasuje nigdzie i nic nie podświetla.
    const { result, rerender } = setup();

    act(() => result.current.active && result.current.next());
    act(() => result.current.active && result.current.next());

    // Karta wybrana, ale bez pasującej ścianki.
    rerender({ ctx: { ...idle, cardSelected: true, targetSlot: null } });

    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.done).toBe(false);
    expect(result.current.message).not.toMatch(/zaświeciła/);
  });

  it('chwali dopiero, gdy wybrana karta ma gdzie trafić', () => {
    const { result, rerender } = setup();

    act(() => result.current.active && result.current.next());
    act(() => result.current.active && result.current.next());

    rerender({
      ctx: { ...idle, cardSelected: true, targetSlot: 'tutorial-1:mentor' },
    });

    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.done).toBe(true);
    expect(result.current.message).toMatch(/zaświeciła/);
  });

  it('krok wymiany kończy się mimo nowej rundy', () => {
    // Regresja: `swappedThisRound` czyści się z nową rundą, a wymiana kończy
    // turę — samouczek pętlił się na tym kroku w nieskończoność.
    const state = tutorialGame();
    const swapIndex = TUTORIAL_STEPS.findIndex((s) => s.goal === 'swapCards');

    const { result, rerender } = renderHook(
      ({ ctx }) => useTutorial(true, state, ctx, vi.fn()),
      { initialProps: { ctx: idle } },
    );

    for (let i = 0; i < swapIndex; i += 1) {
      rerender({ ctx: { ...idle, cardSelected: true } });
      act(() => result.current.active && result.current.next());
    }

    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.step.goal).toBe('swapCards');
    expect(result.current.done).toBe(false);

    // Ręka zmieniona = wymiana się odbyła, choć licznik rundy już się zresetował.
    rerender({ ctx: { ...idle, handChanged: true } });
    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.done).toBe(true);
  });

  it('podświetla konkretną ściankę, nie całą planszę', () => {
    const { result, rerender } = setup();

    act(() => result.current.active && result.current.next());
    act(() => result.current.active && result.current.next());

    rerender({ ctx: { ...idle, cardSelected: true, targetSlot: 'tutorial-1:mentor' } });
    if (!result.current.active) throw new Error('samouczek nieaktywny');
    expect(result.current.anchor).toBe('[data-slot="tutorial-1:mentor"]');
  });

  it('ostatni krok uczy zabierania karty na postać', () => {
    const last = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
    expect(last.goal).toBe('takeCard');
    expect(last.say).toMatch(/kartę postaci/i);
  });

  it('podświetlenie zostaje na czas pochwały', () => {
    const { result, rerender } = setup();
    rerender({ ctx: { ...idle, cardSelected: true } });

    if (!result.current.active) throw new Error('samouczek nieaktywny');
    // ETER11 mówi „ścianka zaświeciła" — musi być co pokazać.
    expect(result.current.done).toBe(true);
    expect(result.current.anchor).not.toBeNull();
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
    expect(dialog.textContent).toMatch(/jestem ETER11/);
  });

  it('pokazuje numer kroku', () => {
    render(<Harness context={idle} />);
    expect(screen.getByText(`1 / ${TUTORIAL_STEPS.length}`)).toBeDefined();
  });

  it('krok czytany od razu pozwala iść dalej', () => {
    render(<Harness context={idle} />);
    expect(screen.getByRole('button', { name: /Dalej/ })).toBeDefined();
  });

  it('przejście dalej pokazuje kolejny krok', () => {
    render(<Harness context={idle} />);

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
    fireEvent.click(screen.getByRole('button', { name: 'Pomiń' }));

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
