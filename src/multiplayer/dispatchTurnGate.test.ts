import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Room } from './types';
import type { GameState } from '../engine/types';

/**
 * Adam, godzinę po pierwszej poprawce blokady ruchów: „wyświetla się
 * informacja, ale teraz gracz 1 nie może dodać karty do problemu pomimo, że
 * pasuje. Pojawił się błąd, który uniemożliwia grę". Druga poprawka
 * (`turnOwner.czyMojaTura`) naprawiła TYLKO ekran (`OnlineGame.allows`) — ale
 * Adam zgłosił to jeszcze raz: „niestety. Nie mogę jako gracz 1 dodać
 * poprawnej karty".
 *
 * Powód: `useRoom.dispatch` liczył „czyja tura" NIEZALEŻNIE od ekranu, własną
 * kopią tej samej logiki — z kolejności graczy POKOJU (`playersInOrder`), nie
 * z `state.players` (silnik), której używa `MissionScreen` i naprawiona
 * `czyMojaTura`. Gdy ktoś opuszcza pokój w trakcie gry, obie listy się
 * rozjeżdżają: ekran poprawnie ODBLOKOWYWAŁ kartę aktywnemu graczowi, a zapis
 * do bazy i tak odrzucał ruch jako „nie Twoja kolej" — bo liczył turę z INNEJ
 * listy niż ta, której ekran właśnie użył do odblokowania.
 */

const commitMove = vi.fn(async () => undefined);
let reduceResult: { rejected: string | null; state: GameState } | null = null;

vi.mock('./room', () => ({
  watchRoom: vi.fn((_code: string, onChange: (room: Room | null) => void) => {
    onChange(currentRoom);
    return () => {};
  }),
  playersInOrder: (room: Room) =>
    Object.values(room.players ?? {}).sort((a, b) => a.joinedAt - b.joinedAt),
  revealerUid: () => undefined,
  commitMove: (...args: unknown[]) => commitMove(...(args as [])),
  commitMoveAsHost: vi.fn(),
  commitSummaryMove: vi.fn(),
  commitReveal: vi.fn(),
  clearOffer: vi.fn(),
  offerCard: vi.fn(),
  sendReaction: vi.fn(),
  setReady: vi.fn(),
  kickPlayer: vi.fn(),
  startGame: vi.fn(),
  trackPresence: vi.fn(() => () => {}),
}));

vi.mock('../engine/reducer', () => ({
  // Podmieniony na atrapę — ten test sprawdza WYŁĄCZNIE bramkę „czyja tura"
  // w `useRoom`, nie logikę silnika (tę mają własne testy reduktora).
  reduce: () => reduceResult,
}));

const { useRoom } = await import('./useRoom');

let currentRoom: Room | null = null;

/**
 * Pokój, w którym gracz „a" wyszedł: w `room.players` (kolejność pokoju wg
 * czasu dołączenia) zostali tylko „b" i „c" — DWA wpisy. Silnik (`state.players`)
 * wciąż pamięta trójkę „a", „b", „c" z chwili startu partii, aktywny na
 * indeksie 2 to „c". Kolejność pokoju ma dla indeksu 2 tylko dwa elementy —
 * `order[2]` nie istnieje. Dokładnie ten rozjazd: ekran (liczący ze
 * `state.players`) poprawnie pokazuje turę „c", a stara wersja bramki
 * (licząca z `order`) nie znajduje NIKOGO na indeksie 2 — więc odrzuca ruch
 * każdemu, łącznie z prawdziwym aktywnym graczem. Partia stoi.
 */
function roomPoWyjsciu(): Room {
  return {
    code: 'ABCD',
    phase: 'playing',
    hostUid: 'b',
    players: {
      b: { uid: 'b', name: 'Bo', characterId: 'c1', online: true, ready: true, joinedAt: 2 },
      c: { uid: 'c', name: 'Cela', characterId: 'c2', online: true, ready: true, joinedAt: 3 },
    },
    state: {
      phase: 'mission',
      missionNumber: 1,
      activePlayerIndex: 2,
      players: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    } as unknown as GameState,
    lastAction: null,
    turnStartedAt: Date.now(),
    reactions: [],
    offer: null,
    createdAt: 0,
  } as Room;
}

beforeEach(() => {
  commitMove.mockClear();
  reduceResult = { rejected: null, state: {} as GameState };
});

describe('useRoom.dispatch — bramka tury zgadza się z tym, co odblokował ekran', () => {
  it('aktywny gracz wg silnika (Cela) może zagrać, mimo że w pokoju jest tylko dwoje', async () => {
    currentRoom = roomPoWyjsciu();
    const { result } = renderHook(() => useRoom('ABCD', 'c'));

    let odpowiedz: string | null = null;
    await act(async () => {
      odpowiedz = await result.current.dispatch({
        type: 'PASS',
        playerId: 'c',
      });
    });

    expect(odpowiedz).toBeNull();
    expect(commitMove).toHaveBeenCalledTimes(1);
  });

  it('gracz, który NIE jest aktywny wg silnika (Bo), dalej nie może grać', async () => {
    currentRoom = roomPoWyjsciu();
    const { result } = renderHook(() => useRoom('ABCD', 'b'));

    let odpowiedz: string | null = null;
    await act(async () => {
      odpowiedz = await result.current.dispatch({
        type: 'PASS',
        playerId: 'b',
      });
    });

    expect(odpowiedz).toBe('To nie Twoja kolej.');
    expect(commitMove).not.toHaveBeenCalled();
  });
});
