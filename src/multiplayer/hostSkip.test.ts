import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Room } from './types';
import type { GameState } from '../engine/types';

/**
 * Host spasowuje za rozłączonego gracza — ale NIE wolno mu nadpisać ruchu
 * gracza, który zdążył wrócić i zagrać tuż przed upływem minuty.
 *
 * Wcześniej `commitMoveAsHost` sprawdzał tylko „czy piszę ja, host", po czym
 * zapisywał z góry policzone „pasuję" bezwarunkowo. Wyścig: aktywny gracz jest
 * offline, timer hosta ma zaraz strzelić; gracz wraca i robi ruch (commitMove
 * przesuwa turę), a strzelający timer hosta liczy PASS ze starego stanu i
 * zapisuje go, kasując dopiero co wykonany ruch i cofając turę. Poprawka:
 * transakcja przelicza PASS na aktualnym stanie i pisze tylko, gdy skipowany
 * WCIĄŻ jest aktywny i WCIĄŻ offline.
 */

// Sterowany z testu „obecny stan pokoju" widziany przez transakcję.
let currentRoom: Room | null = null;
// Wynik ostatniego przebiegu funkcji aktualizującej transakcji.
let lastResult: Room | null = null;

vi.mock('firebase/auth', () => ({ signInAnonymously: vi.fn() }));
vi.mock('../firebase/client', () => ({ rtdb: {}, auth: {} }));
vi.mock('firebase/database', () => ({
  ref: () => ({}),
  runTransaction: async (_ref: unknown, updater: (r: Room | null) => Room | null) => {
    lastResult = updater(currentRoom);
    return { committed: true, snapshot: { val: () => lastResult } };
  },
  get: vi.fn(),
  onDisconnect: vi.fn(),
  onValue: vi.fn(),
  remove: vi.fn(),
  serverTimestamp: () => 0,
  set: vi.fn(),
  update: vi.fn(),
}));

// Import PO zamockowaniu zależności sieciowych.
const { commitMoveAsHost } = await import('./room');
const { setupGame } = await import('../ui/useGame');
const { reduce } = await import('../engine/reducer');

/** Stan w trakcie misji, w którym aktywny jest gracz o indeksie `activeIndex`. */
function missionState(activeIndex: number): GameState {
  let state = setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: 'ch-odkrywca' },
      { id: 'p2', name: 'Bo', characterId: 'ch-odkrywca' },
    ],
    7,
  );
  state = reduce(state, { type: 'START_MISSION' }).state;
  return { ...state, activePlayerIndex: activeIndex };
}

function roomWith(state: GameState, p2online: boolean, p1online = true): Room {
  return {
    code: 'ABCD',
    phase: 'playing',
    hostUid: 'p1',
    players: {
      p1: { uid: 'p1', name: 'Ala', characterId: 'ch-odkrywca', online: p1online, ready: true, joinedAt: 1 },
      p2: { uid: 'p2', name: 'Bo', characterId: 'ch-odkrywca', online: p2online, ready: true, joinedAt: 2 },
    },
    state,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 0,
  };
}

describe('commitMoveAsHost — skip rozłączonego', () => {
  beforeEach(() => {
    currentRoom = null;
    lastResult = null;
  });

  it('spasowuje, gdy skipowany wciąż aktywny i offline', async () => {
    currentRoom = roomWith(missionState(1), /* p2online */ false);
    await commitMoveAsHost('ABCD', 'p1', 'p2', { type: 'PASS', playerId: 'p2' });

    // Ruch zapisany: PASS przesunął turę z gracza 1 (Bo) dalej.
    expect(lastResult?.lastAction).toEqual({ type: 'PASS', playerId: 'p2' });
    expect(lastResult?.state?.activePlayerIndex).not.toBe(1);
  });

  it('NIE nadpisuje, gdy skipowany zdążył wrócić (online)', async () => {
    currentRoom = roomWith(missionState(1), /* p2online */ true);
    await commitMoveAsHost('ABCD', 'p1', 'p2', { type: 'PASS', playerId: 'p2' });

    // Bez zmian — jego ruch (który go połączył) zostaje nietknięty.
    expect(lastResult?.lastAction).toBeNull();
    expect(lastResult?.state?.activePlayerIndex).toBe(1);
  });

  it('NIE nadpisuje, gdy tura już przeszła na kogoś innego', async () => {
    // Aktywny jest już gracz 0 (Ala), skipowany to p2 — jego chwila minęła.
    currentRoom = roomWith(missionState(0), /* p2online */ false);
    await commitMoveAsHost('ABCD', 'p1', 'p2', { type: 'PASS', playerId: 'p2' });

    expect(lastResult?.lastAction).toBeNull();
    expect(lastResult?.state?.activePlayerIndex).toBe(0);
  });

  it('gdy to HOST jest rozłączonym aktywnym graczem, spasuje go koordynator (nie host)', async () => {
    // Regresja soft-locka: host (p1) padł na własnej turze (indeks 0). Timer
    // hosta nie zadziała — host jest offline. Pierwszy obecny gracz (p2) jest
    // teraz rewelatorem/koordynatorem i to on zapisuje spasowanie.
    currentRoom = roomWith(missionState(0), /* p2online */ true, /* p1online */ false);
    await commitMoveAsHost('ABCD', 'p2', 'p1', { type: 'PASS', playerId: 'p1' });

    // Tura hosta spasowana, gra rusza dalej — koniec zawieszenia.
    expect(lastResult?.lastAction).toEqual({ type: 'PASS', playerId: 'p1' });
    expect(lastResult?.state?.activePlayerIndex).not.toBe(0);
  });

  it('NIE pozwala pisać komuś, kto nie jest już koordynatorem', async () => {
    // Ten sam pokój (host p1 offline, aktywny to p1), ale strzela timer
    // rozłączonego p1 — p1 nie jest już rewelatorem (jest offline), więc
    // transakcja odrzuca: autoryzacja idzie po rewelatorze, nie po hostUid.
    currentRoom = roomWith(missionState(0), /* p2online */ true, /* p1online */ false);
    await commitMoveAsHost('ABCD', 'p1', 'p1', { type: 'PASS', playerId: 'p1' });

    expect(lastResult?.lastAction).toBeNull();
    expect(lastResult?.state?.activePlayerIndex).toBe(0);
  });
});
