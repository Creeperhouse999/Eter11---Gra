import { describe, it, expect, vi } from 'vitest';
import type { Room } from './types';

/**
 * `joinRoom` sprawdzał limit czterech graczy jednym `get()`, a dopisywał
 * gracza osobnym, nietransakcyjnym `update()` — między odczytem a zapisem
 * inny gracz mógł zdążyć dołączyć tą samą ścieżką. Dwóch graczy klikających
 * "Dołącz" w tej samej chwili do pokoju z jednym wolnym miejscem oboje
 * przechodzili sprawdzenie limitu i oboje trafiali do bazy — pokój kończył
 * z pięcioma graczami mimo limitu czterech.
 */

vi.mock('firebase/auth', () => ({
  signInAnonymously: vi.fn(async () => ({ user: { uid: nextUid() } })),
}));
vi.mock('../firebase/client', () => ({ rtdb: {}, auth: {} }));

let uidCounter = 0;
function nextUid(): string {
  uidCounter += 1;
  return `newbie${uidCounter}`;
}

let currentRoom: (Room & { kicked?: Record<string, boolean> }) | null = null;

// `get()` czeka, aż OBIE równoległe próby dołączenia go wywołają, zanim
// odda wynik — wymusza dokładnie ten wyścig (oba odczyty przed zapisem),
// zamiast liczyć na przypadkową kolejność mikrozadań.
let getCalls = 0;
let releaseGet: () => void;
const getBarrier = new Promise<void>((resolve) => {
  releaseGet = resolve;
});

let txChain: Promise<unknown> = Promise.resolve();

vi.mock('firebase/database', () => ({
  ref: () => ({}),
  get: async () => {
    // Migawka jest zamrożona W CHWILI odczytu (jak prawdziwy snapshot RTDB),
    // nie żywym odczytem `currentRoom` — inaczej to, kto obudzi się z bariery
    // pierwszy, przypadkiem czytałby już zmutowany przez drugiego stan.
    const snapshot = currentRoom ? structuredClone(currentRoom) : null;
    getCalls += 1;
    if (getCalls >= 2) releaseGet();
    await getBarrier;
    return { exists: () => snapshot !== null, val: () => snapshot };
  },
  update: vi.fn(async (_ref: unknown, patch: Record<string, unknown>) => {
    // Symuluje `update(ref(.../players), { [uid]: player })` starego kodu:
    // scala klucz wprost do `players`, bez żadnej blokady.
    if (!currentRoom) return;
    Object.assign(currentRoom.players, patch);
  }),
  onDisconnect: vi.fn(),
  onValue: vi.fn(),
  remove: vi.fn(),
  runTransaction: vi.fn((_ref: unknown, updateFn: (r: unknown) => unknown) => {
    // Symuluje atomowość prawdziwej transakcji RTDB: wywołania serializują
    // się jedno po drugim, każde widzi już scalony wynik poprzedniego.
    const run = txChain.then(async () => {
      const next = updateFn(currentRoom);
      if (next !== undefined) currentRoom = next as typeof currentRoom;
      return { committed: next !== undefined, snapshot: { val: () => currentRoom } };
    });
    txChain = run.catch(() => undefined);
    return run;
  }),
  serverTimestamp: () => 0,
  set: vi.fn(),
}));

const { joinRoom } = await import('./room');

function roomWithPlayers(count: number): Room & { kicked?: Record<string, boolean> } {
  const players: Room['players'] = {};
  for (let i = 0; i < count; i += 1) {
    const uid = `p${i}`;
    players[uid] = {
      uid,
      name: uid,
      characterId: 'ch-odkrywca',
      online: true,
      ready: false,
      joinedAt: i,
    };
  }
  return {
    code: 'ABCD',
    phase: 'lobby',
    hostUid: 'p0',
    players,
    state: null,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 0,
  };
}

describe('joinRoom — wyścig dwóch dołączeń do ostatniego wolnego miejsca', () => {
  it('dwóch graczy próbujących wejść naraz na 1 wolne miejsce — najwyżej jeden wchodzi', async () => {
    currentRoom = roomWithPlayers(3); // limit 4, jedno wolne miejsce

    const [a, b] = await Promise.all([
      joinRoom({ code: 'ABCD', name: 'Ala', characterId: 'ch-mysliwy' }),
      joinRoom({ code: 'ABCD', name: 'Bob', characterId: 'ch-zaklinacz' }),
    ]);

    const okCount = [a, b].filter((r) => r.ok).length;
    expect(okCount).toBe(1);
    expect(Object.keys(currentRoom!.players).length).toBe(4);
  });
});
