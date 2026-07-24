import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { GameState } from '../engine/types';
import type { Room } from './types';

/**
 * Regresja: przekazanie karty w grze online w ogóle nie działało.
 *
 * Ofertę tworzy DAJĄCY, ale `SHARE_CARD` wysyła BIORĄCY, klikając „Przyjmij"
 * (patrz CardOfferModal — przycisk widzi tylko odbiorca). Strażnik fazy
 * podsumowania w `useRoom` liczył jednak aktora z `fromPlayerId` (dającego),
 * więc u odbiorcy `actor !== uid` i ruch leciał jako „To nie Twoja karta." —
 * cicho, bo `acceptOffer` i tak czyścił ofertę. Przekazanie to jedyne źródło
 * doświadczenia „za uczenie", warunku koniecznego spełnienia, więc online
 * spełnienie było nieosiągalne.
 */

let emit: ((room: Room | null) => void) | null = null;
const commitSummaryMove = vi.fn(
  async (_code: string, _uid: string, _action: unknown): Promise<string | null> => null,
);

vi.mock('./room', () => ({
  watchRoom: vi.fn((_code: string, onChange: (room: Room | null) => void) => {
    emit = onChange;
    return () => {
      emit = null;
    };
  }),
  playersInOrder: (room: Room) => Object.values(room.players ?? {}),
  commitMove: vi.fn(),
  commitMoveAsHost: vi.fn(),
  commitSummaryMove: (code: string, uid: string, action: unknown) =>
    commitSummaryMove(code, uid, action),
  clearOffer: vi.fn(),
  offerCard: vi.fn(),
  sendReaction: vi.fn(),
  setReady: vi.fn(),
  kickPlayer: vi.fn(),
  startGame: vi.fn(),
}));

const { useRoom } = await import('./useRoom');

/** Pokój w podsumowaniu misji: dający `g`, biorący `r`. */
const summaryRoom = (): Room =>
  ({
    code: 'ABCD',
    phase: 'playing',
    hostUid: 'g',
    players: {
      g: { uid: 'g', name: 'Dający', characterId: 'c1', online: true, ready: true, joinedAt: 1 },
      r: { uid: 'r', name: 'Biorący', characterId: 'c2', online: true, ready: true, joinedAt: 2 },
    },
    state: { phase: 'missionSummary', players: [] } as unknown as GameState,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: { fromUid: 'g', toUid: 'r', cardId: 'card-1', at: 0 },
    createdAt: 0,
  }) as Room;

beforeEach(() => {
  emit = null;
  commitSummaryMove.mockClear();
});

describe('useRoom — przyjęcie przekazanej karty online', () => {
  it('biorący może przyjąć kartę od dającego', async () => {
    // uid = 'r' (biorący) — to on klika „Przyjmij" i wysyła SHARE_CARD.
    const { result } = renderHook(() => useRoom('ABCD', 'r'));
    act(() => {
      emit?.(summaryRoom());
    });

    let ret: string | null = 'nieustawione';
    await act(async () => {
      ret = await result.current.dispatch({
        type: 'SHARE_CARD',
        fromPlayerId: 'g',
        toPlayerId: 'r',
        cardId: 'card-1',
      });
    });

    // Ruch nie może zostać odrzucony jako „nie Twoja karta" — biorący jest
    // uprawniony do przyjęcia. Przed poprawką zwracało „To nie Twoja karta.".
    expect(ret).toBeNull();
    expect(commitSummaryMove).toHaveBeenCalledTimes(1);
  });

  it('nie pozwala dającemu przyjąć karty za biorącego', async () => {
    // uid = 'g' (dający) — nie on zatwierdza przyjęcie, więc strażnik ma go
    // odrzucić. Guard nadal chroni przed graniem za kogoś innego.
    const { result } = renderHook(() => useRoom('ABCD', 'g'));
    act(() => {
      emit?.(summaryRoom());
    });

    let ret: string | null = null;
    await act(async () => {
      ret = await result.current.dispatch({
        type: 'SHARE_CARD',
        fromPlayerId: 'g',
        toPlayerId: 'r',
        cardId: 'card-1',
      });
    });

    expect(ret).toBe('To nie Twoja karta.');
    expect(commitSummaryMove).not.toHaveBeenCalled();
  });
});
