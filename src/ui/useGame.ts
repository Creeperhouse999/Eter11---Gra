import { useCallback, useState } from 'react';
import { buildDeck } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';
import { createGame, DEFAULT_CONFIG, reduce } from '../engine/reducer';
import type { Action, Card, GameState, Problem, RulesConfig } from '../engine/types';

export interface PlayerSetup {
  id: string;
  name: string;
  characterId: string;
}

export interface GameContentInput {
  cards?: Card[];
  problems?: Problem[];
  /**
   * Gotowa ręka dla każdego gracza. Używa jej samouczek, żeby scenariusz
   * wyglądał tak samo za każdym razem, niezależnie od losowania.
   */
  fixedHand?: Card[];
  /** Talia bez tasowania — kolejność dobierania ustalona z góry. */
  orderedDeck?: Card[];
}

/**
 * Opakowanie silnika gry dla React.
 *
 * Karty i problemy można podać z zewnątrz (dane z Firestore); brak argumentu
 * oznacza dane wbudowane — dzięki temu testy i tryb offline działają bez sieci.
 *
 * Historia stanów zasila funkcję cofania w trybie testowym panelu
 * administracyjnego. Silnik jest czysty, więc wystarczy zachować poprzednie
 * stany zamiast odtwarzać ruchy.
 */
export function useGame(
  players: PlayerSetup[],
  seed: number,
  config: RulesConfig = DEFAULT_CONFIG,
  content: GameContentInput = {},
) {
  const [state, setState] = useState<GameState>(() => {
    const base = createGame({
      players,
      deck: content.orderedDeck ?? buildDeck(content.cards),
      problems: content.problems ?? ALL_PROBLEMS,
      seed,
      config,
    });

    if (!content.fixedHand && !content.orderedDeck) return base;

    // Samouczek: ustawiona ręka i talia w zadanej kolejności. Tasowanie
    // z createGame zostaje pominięte, żeby scenariusz był powtarzalny.
    return {
      ...base,
      players: base.players.map((player) => ({
        ...player,
        hand: content.fixedHand ? [...content.fixedHand] : player.hand,
      })),
      drawPile: content.orderedDeck ? [...content.orderedDeck] : base.drawPile,
      discardPile: [],
    };
  });
  const [history, setHistory] = useState<GameState[]>([]);
  const [rejection, setRejection] = useState<string | null>(null);

  const dispatch = useCallback((action: Action) => {
    setState((current) => {
      const result = reduce(current, action);
      if (result.rejected) {
        setRejection(result.rejected);
        return current;
      }
      setRejection(null);
      setHistory((prev) => [...prev, current]);
      return result.state;
    });
  }, []);

  /** Podmiana stanu z pominięciem reducera — wyłącznie dla trybu testowego. */
  const overrideState = useCallback((next: GameState) => {
    setState((current) => {
      setHistory((prev) => [...prev, current]);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      setState(prev[prev.length - 1]);
      setRejection(null);
      return prev.slice(0, -1);
    });
  }, []);

  const dismissRejection = useCallback(() => setRejection(null), []);

  return { state, dispatch, rejection, dismissRejection, history, undo, overrideState };
}

export type Game = ReturnType<typeof useGame>;
