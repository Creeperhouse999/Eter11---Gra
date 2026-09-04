import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { buildDeck, playableCards } from '../data/cards';
import type { Room, RoomPlayer } from './types';

/**
 * Talia gry online musi być zdublowana tak samo jak przy stole/solo, nie
 * o połowę mniejsza.
 *
 * `Multiplayer.start()` woła `createGame({ deck: playableCards(content.cards), ... })`
 * — BEZ `buildDeck()`. Gra solo (`useGame.ts`) i fizyczna talia do druku
 * (`PrintCards.tsx`) używają `buildDeck(playableCards(...))`, które dubluje
 * każdą kartę kompetencji/talentu/mentora (2 egzemplarze), zostawiając karty
 * specjalne (ETER11, Czarny Łabędź) w JEDNYM egzemplarzu. Bez tego
 * zdublowania talia online ma o połowę mniej zwykłych kart przy tej samej
 * liczbie kart specjalnych — te same 2 karty ETER11 stanowią więc DWA RAZY
 * większy odsetek talii i krążą (odrzucone → przetasowane z powrotem)
 * dwa razy częściej niż przy stole. Dokładnie to zgłosił gracz: „w ciągu
 * jednej gry przy 7 problemach jeden z graczy dostał 4 razy kartę ETER11,
 * a drugi ani razu" — test w `gameFlow.test.ts` (komentarz „Start jak w
 * Multiplayer.start()") już zakładał `buildDeck(ALL_CARDS)`, czyli
 * dokumentował zamierzone zachowanie, którego produkcyjny kod nie dowoził.
 */

const players: Record<string, RoomPlayer> = {
  host1: { uid: 'host1', name: 'Host', characterId: 'ch-odkrywca', online: true, ready: false, joinedAt: 1 },
  guest2: { uid: 'guest2', name: 'Gość', characterId: 'ch-artysta', online: true, ready: false, joinedAt: 2 },
};

const lobbyRoom: Room = {
  code: 'ABCD',
  phase: 'lobby',
  hostUid: 'host1',
  players,
  state: null,
  lastAction: null,
  turnStartedAt: 0,
  reactions: [],
  offer: null,
  createdAt: 0,
};

const createGameSpy = vi.fn();

vi.mock('../engine/reducer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../engine/reducer')>();
  return {
    ...actual,
    createGame: (input: Parameters<typeof actual.createGame>[0]) => {
      createGameSpy(input);
      return actual.createGame(input);
    },
  };
});

vi.mock('./room', () => ({
  createRoom: vi.fn(async () => ({ code: 'ABCD', uid: 'host1' })),
  joinRoom: vi.fn(),
  watchRoom: (_code: string, cb: (r: Room) => void) => {
    cb(lobbyRoom);
    return () => {};
  },
  trackPresence: () => () => {},
  playersInOrder: (room: Room) => Object.values(room.players ?? {}).sort((a, b) => a.joinedAt - b.joinedAt),
  revealerUid: (room: Room) =>
    Object.values(room.players ?? {})
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .find((p) => p.online)?.uid,
  startGame: vi.fn(async () => {}),
  setCharacter: vi.fn(),
  leaveRoom: vi.fn(),
  kickPlayer: vi.fn(),
  offerCard: vi.fn(),
  clearOffer: vi.fn(),
  commitMove: vi.fn(),
  commitMoveAsHost: vi.fn(),
  commitReveal: vi.fn(),
  commitSummaryMove: vi.fn(),
  sendReaction: vi.fn(),
  setReady: vi.fn(),
}));

const { Multiplayer } = await import('./Multiplayer');

describe('Multiplayer — rozmiar talii przy starcie gry online', () => {
  it('createGame dostaje zdublowaną talię (buildDeck), nie samą playableCards', async () => {
    render(
      <ToastProvider>
        <Multiplayer content={BUILTIN_CONTENT} onExit={vi.fn()} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Załóż pokój' }));
    fireEvent.change(screen.getByPlaceholderText('Imię'), { target: { value: 'Host' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Załóż pokój' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const startButton = await screen.findByRole('button', { name: /Zaczynamy/ });
    await act(async () => {
      fireEvent.click(startButton);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createGameSpy).toHaveBeenCalledTimes(1);
    const [input] = createGameSpy.mock.calls[0] as [{ deck: unknown[] }];

    const expected = buildDeck(playableCards(BUILTIN_CONTENT.cards)).length;
    const undoubled = playableCards(BUILTIN_CONTENT.cards).length;
    // Bez fixu: input.deck.length === undoubled (o połowę za mała talia).
    expect(input.deck.length).not.toBe(undoubled);
    expect(input.deck.length).toBe(expected);
  });
});
