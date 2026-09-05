import { describe, it, expect, vi } from 'vitest';
import type { Room } from './types';

/**
 * Adam: „nie mogę kontynuować gry 2 graczy, bo wybiera się ta sama postać".
 *
 * `joinRoom` liczy „pierwszą wolną postać" z odczytu (`get()`), nie z
 * transakcji — celowo, bo transakcja na całym pokoju psuła sam pierwszy
 * zapis (patrz komentarz w `room.ts`). Dwóch graczy dołączających w TEJ SAMEJ
 * chwili do świeżego pokoju czyta więc IDENTYCZNY, jeszcze pusty stan graczy
 * i oboje liczą tę samą „pierwszą wolną" postać — dokładnie ten wyścig, który
 * zgłosił Adam, bo zdarza się naturalnie, gdy dwie osoby dołączają razem na
 * start wspólnej sesji.
 *
 * Naprawa: po zapisie własnego wpisu `joinRoom` sprawdza w transakcji, czy
 * ktoś inny ma tę samą postać — a jeśli tak, ten, kto dołączył PÓŹNIEJ, sam
 * się przestawia na pierwszą naprawdę wolną. Ten sam wzorzec (kolejność wg
 * czasu dołączenia, remis po id), co przy wyścigu o ostatnie miejsce.
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

// `get()` czeka, aż OBIE równoległe próby dołączenia go wywołają, zanim odda
// wynik — wymusza dokładnie ten wyścig (oba odczyty przed którymkolwiek
// zapisem), zamiast liczyć na przypadkową kolejność mikrozadań.
let getCalls = 0;
let releaseGet: () => void;
const getBarrier = new Promise<void>((resolve) => {
  releaseGet = resolve;
});

let txChain: Promise<unknown> = Promise.resolve();

vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => ({ path }),
  get: async (r: { path?: string }) => {
    // Migawka zamrożona W CHWILI odczytu (jak prawdziwy snapshot RTDB) —
    // obaj gracze mają więc liczyć „pierwszą wolną postać" z tego samego,
    // jeszcze pustego stanu. Bariera puszcza dopiero, gdy OBIE równoległe
    // próby dołączenia zdążyły wywołać swój pierwszy odczyt — potem kolejne
    // odczyty (sprawdzenie limitu po zapisie) przechodzą już bez czekania,
    // bo obietnica jest jednorazowa.
    const snapshot = currentRoom ? structuredClone(currentRoom) : null;
    getCalls += 1;
    if (getCalls >= 2) releaseGet();
    await getBarrier;
    const czyGracze = String(r?.path ?? '').endsWith('/players');
    return {
      exists: () => snapshot !== null,
      val: () => (czyGracze ? (currentRoom ? currentRoom.players : null) : snapshot),
    };
  },
  update: vi.fn(),
  onDisconnect: vi.fn(),
  onValue: vi.fn(),
  remove: vi.fn(async (r: { path?: string }) => {
    const uid = (r.path ?? '').split('/').pop();
    if (currentRoom && uid) delete currentRoom.players[uid];
  }),
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
  set: vi.fn(async (r: { path?: string }, value: unknown) => {
    const uid = (r.path ?? '').split('/').pop();
    if (!currentRoom || !uid) return;
    currentRoom.players[uid] = value as never;
  }),
}));

const { joinRoom } = await import('./room');

function emptyRoom(): Room & { kicked?: Record<string, boolean> } {
  return {
    code: 'ABCD',
    phase: 'lobby',
    hostUid: 'host',
    players: {},
    state: null,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 0,
  };
}

describe('joinRoom — wyścig o tę samą postać', () => {
  it('dwóch nowych graczy dołączających naraz dostaje RÓŻNE postacie', async () => {
    currentRoom = emptyRoom();

    const [a, b] = await Promise.all([
      joinRoom({ code: 'ABCD', name: 'Ala', characterId: '' }),
      joinRoom({ code: 'ABCD', name: 'Bob', characterId: '' }),
    ]);

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);

    const gracze = Object.values(currentRoom!.players);
    expect(gracze).toHaveLength(2);
    // Sedno zgłoszenia: bez naprawy oboje liczyli tę samą „pierwszą wolną" —
    // teraz muszą się różnić, żeby partia dała się w ogóle zacząć.
    expect(gracze[0].characterId).not.toBe(gracze[1].characterId);
  });
});
