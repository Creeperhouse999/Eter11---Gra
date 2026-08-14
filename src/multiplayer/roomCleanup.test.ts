import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Room } from './types';

/**
 * Pusty pokój znika z bazy.
 *
 * Rozpoczęta partia nie kasowała się NIGDY: wychodzący szedł tylko na
 * `online: false`, a węzeł pokoju zostawał z pełnym stanem (talia, ręce, log)
 * na zawsze. Przy każdej rozegranej partii dochodził kolejny. Kod pokoju ma
 * cztery znaki, więc uzbierane śmieci zaczęłyby zjadać pulę kodów: zakładanie
 * pokoju trafiałoby w zajęte, a ktoś wpisujący kod na chybił trafił wchodziłby
 * do martwej partii (`phase` zostawał na zawsze `playing`).
 */

let currentRoom: Room | null = null;
let lastResult: Room | null | undefined;
const removed: string[] = [];
const setCalls: Array<[string, unknown]> = [];

vi.mock('firebase/auth', () => ({ signInAnonymously: vi.fn() }));
vi.mock('../firebase/client', () => ({ rtdb: {}, auth: {} }));
vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => ({ path }),
  runTransaction: async (
    _ref: unknown,
    updater: (r: Room | null) => Room | null,
  ) => {
    lastResult = updater(currentRoom);
    return { committed: true, snapshot: { val: () => lastResult } };
  },
  remove: async (r: { path: string }) => {
    removed.push(r.path);
  },
  set: async (r: { path: string }, value: unknown) => {
    setCalls.push([r.path, value]);
  },
  onDisconnect: () => ({ cancel: async () => {}, set: async () => {} }),
  get: vi.fn(),
  onValue: vi.fn(),
  serverTimestamp: () => 0,
  update: vi.fn(),
}));

const { leaveRoom, roomBecomesEmpty } = await import('./room');

function roomWith(players: Record<string, { online: boolean }>): Room {
  return {
    code: 'ABCD',
    phase: 'playing',
    hostUid: 'p1',
    players: Object.fromEntries(
      Object.entries(players).map(([uid, { online }]) => [
        uid,
        { uid, name: uid, characterId: 'ch', online, ready: true, joinedAt: 1 },
      ]),
    ),
    state: null,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 0,
  } as unknown as Room;
}

beforeEach(() => {
  currentRoom = null;
  lastResult = undefined;
  removed.length = 0;
  setCalls.length = 0;
});

describe('roomBecomesEmpty — czy zostaje pusto', () => {
  it('ostatni obecny gracz opróżnia pokój', () => {
    const room = roomWith({ p1: { online: true }, p2: { online: false } });
    expect(roomBecomesEmpty(room, 'p1')).toBe(true);
  });

  it('gdy ktoś jeszcze gra, pokój zostaje', () => {
    const room = roomWith({ p1: { online: true }, p2: { online: true } });
    expect(roomBecomesEmpty(room, 'p1')).toBe(false);
  });

  it('gracz spoza pokoju niczego nie opróżnia', () => {
    const room = roomWith({ p1: { online: true } });
    expect(roomBecomesEmpty(room, 'obcy')).toBe(false);
  });
});

describe('leaveRoom — sprzątanie po partii', () => {
  it('wyjście ostatniego gracza KASUJE pokój', async () => {
    const room = roomWith({ p1: { online: true }, p2: { online: false } });
    currentRoom = room;

    await leaveRoom('ABCD', 'p1', room);

    // `null` z transakcji kasuje węzeł — pokój nie zostaje w bazie.
    expect(lastResult).toBeNull();
  });

  it('gdy druga osoba nadal gra, pokój zostaje, a wychodzący idzie offline', async () => {
    const room = roomWith({ p1: { online: true }, p2: { online: true } });
    currentRoom = room;

    await leaveRoom('ABCD', 'p1', room);

    // Nie kasujemy niczego — partia drugiego gracza toczy się dalej, a
    // wychodzący trafia na `online: false` przez tę samą transakcję (nie
    // osobny `set`), żeby decyzja i zapis widziały to samo, świeże dane.
    expect(removed).toHaveLength(0);
    expect(lastResult).not.toBeNull();
    expect(lastResult?.players.p1.online).toBe(false);
  });

  it('gdy ktoś dołączy między odczytem a zapisem, pokój NIE znika', async () => {
    // Wychodzący widział pusty pokój, ale w bazie ktoś już jest — transakcja
    // musi to zobaczyć i wycofać się z kasowania.
    const seen = roomWith({ p1: { online: true }, p2: { online: false } });
    currentRoom = roomWith({ p1: { online: true }, p2: { online: true } });

    await leaveRoom('ABCD', 'p1', seen);

    expect(lastResult).not.toBeNull();
    expect(lastResult?.players.p1.online).toBe(false);
  });

  it('dwa niemal równoczesne wyjścia wciąż kasują pokój, mimo nieaktualnego lokalnego stanu', async () => {
    // Odwrotność testu wyżej: lokalny widok wychodzącego jest NIEAKTUALNY w
    // drugą stronę — wciąż widzi drugiego gracza jako online (bo ten wyszedł
    // chwilę wcześniej, a jego `watchRoom` jeszcze nie zdążył się odświeżyć),
    // choć w bazie już nikogo online nie ma. Decyzja o kasowaniu musi się
    // opierać na świeżym stanie z transakcji, nie na tym przekazanym widoku —
    // inaczej pokój z pełnym stanem partii zostaje w bazie na zawsze.
    const staleLocalView = roomWith({ p1: { online: true }, p2: { online: true } });
    currentRoom = roomWith({ p1: { online: true }, p2: { online: false } });

    await leaveRoom('ABCD', 'p1', staleLocalView);

    expect(lastResult).toBeNull();
  });
});
