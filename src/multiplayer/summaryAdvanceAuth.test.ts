import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Room } from './types';
import type { GameState } from '../engine/types';

/**
 * Zamknięcie podsumowania misji jest decyzją WSPÓLNĄ, nie indywidualną.
 *
 * `END_MISSION_SUMMARY` wyrzuca wszystkie niezabrane karty na stos odrzuconych
 * i przestawia grę do kolejnej misji albo do finału — a przy okazji kasuje
 * wiszącą ofertę przekazania karty. Dopóki mógł to zrobić dowolny gracz
 * w pokoju, najszybciej klikające dziecko ucinało reszcie zabieranie karty na
 * matę (jedyna nagroda z misji) i kasowało cudzą ofertę przekazania — bez
 * ostrzeżenia i bez cofnięcia.
 *
 * Autoryzujemy więc tak samo jak `START_MISSION` w fazie `setup`: decyduje
 * wyznaczony gracz (pierwszy online w kolejności), a reszta czeka. Sprawdzenie
 * siedzi w transakcji, nie tylko w UI — inaczej drugi klient obszedłby je,
 * wołając funkcję wprost.
 */

let currentRoom: Room | null = null;
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

const { commitSummaryMove } = await import('./room');
const { setupGame } = await import('../ui/useGame');
const { reduce } = await import('../engine/reducer');

/** Stan w fazie podsumowania misji — tam, gdzie zabiera się karty na matę. */
function summaryState(): GameState {
  let state = setupGame(
    [
      { id: 'p1', name: 'Ala', characterId: 'ch-odkrywca' },
      { id: 'p2', name: 'Bo', characterId: 'ch-odkrywca' },
    ],
    7,
  );
  state = reduce(state, { type: 'START_MISSION' }).state;
  return { ...state, phase: 'missionSummary' };
}

// `playersInOrder` sortuje po joinedAt, więc kolejność to [p1 (1), p2 (2)],
// a wyznaczonym graczem jest pierwszy online — czyli p1.
function roomWith(state: GameState, onlineP1 = true): Room {
  return {
    code: 'ABCD',
    phase: 'playing',
    hostUid: 'p1',
    players: {
      p1: { uid: 'p1', name: 'Ala', characterId: 'ch-odkrywca', online: onlineP1, ready: true, joinedAt: 1 },
      p2: { uid: 'p2', name: 'Bo', characterId: 'ch-odkrywca', online: true, ready: true, joinedAt: 2 },
    },
    state,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 0,
  };
}

const advance = { type: 'END_MISSION_SUMMARY' } as const;

describe('commitSummaryMove — kto kończy podsumowanie', () => {
  beforeEach(() => {
    currentRoom = null;
    lastResult = null;
  });

  it('wyznaczony gracz kończy podsumowanie', async () => {
    currentRoom = roomWith(summaryState());
    const rejection = await commitSummaryMove('ABCD', 'p1', advance);

    expect(rejection).toBeNull();
    expect(lastResult?.state?.phase).not.toBe('missionSummary');
  });

  it('inny gracz NIE kończy podsumowania za wszystkich', async () => {
    currentRoom = roomWith(summaryState());
    const rejection = await commitSummaryMove('ABCD', 'p2', advance);

    // Ala nadal zabiera swoją kartę — faza się nie zmieniła.
    expect(rejection).toBeTruthy();
    expect(lastResult?.state?.phase).toBe('missionSummary');
    expect(lastResult?.lastAction).toBeNull();
  });

  it('gdy wyznaczony gracz padł, kończy następny online', async () => {
    // p1 offline → wyznaczonym zostaje p2 i partia nie stoi w miejscu.
    currentRoom = roomWith(summaryState(), false);
    const rejection = await commitSummaryMove('ABCD', 'p2', advance);

    expect(rejection).toBeNull();
    expect(lastResult?.state?.phase).not.toBe('missionSummary');
  });

  it('bramka dotyczy tylko zamknięcia — inne ruchy w podsumowaniu przechodzą', async () => {
    // Sedno: zabieranie karty na matę zostaje indywidualne, każdy robi je
    // u siebie, kiedy chce. Blokujemy WYŁĄCZNIE zamknięcie podsumowania, więc
    // ruch innego typu od nie-wyznaczonego gracza nie może odbić się o bramkę.
    currentRoom = roomWith(summaryState());
    const take = { type: 'TAKE_CARD_TO_MAT', playerId: 'p2', cardId: 'brak-takiej' } as const;

    const rejection = await commitSummaryMove('ABCD', 'p2', take);

    // Reduktor odrzuci go z własnego powodu (nie ma takiej karty), ale NIE
    // dlatego, że p2 nie jest wyznaczonym graczem.
    expect(rejection).not.toMatch(/czeka|wyznaczon/i);
    expect(lastResult?.state?.phase).toBe('missionSummary');
  });
});
