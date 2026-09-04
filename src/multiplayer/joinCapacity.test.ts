import { describe, it, expect, vi } from 'vitest';
import type { Room } from './types';

/**
 * `joinRoom` liczył limit czterech graczy po SUROWYM `players` ze snapshotu,
 * nie po `hydrateRoom`. `kickPlayer` kasuje węzeł wyrzuconego, ale jego
 * obietnica `onDisconnect(.../online).set(false)` bywa wciąż uzbrojona —
 * po zamknięciu karty serwer odtwarza NIEPEŁNY wpis `{ online: false }` bez
 * `uid`. Taki widmowy wpis liczył się do limitu na zawsze blokując miejsce,
 * mimo że w pokoju siedziało np. tylko 3 prawdziwych graczy.
 */

vi.mock('firebase/auth', () => ({ signInAnonymously: vi.fn() }));
vi.mock('../firebase/client', () => ({ rtdb: {}, auth: { currentUser: { uid: 'newbie' } } }));
vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => ({ path }),
  get: async () => ({
    exists: () => true,
    val: () => currentRoom,
  }),
  update: vi.fn(async () => undefined),
  onDisconnect: vi.fn(),
  onValue: vi.fn(),
  remove: vi.fn(async (r: { path?: string }) => {
    const uid = (r.path ?? '').split('/').pop();
    if (currentRoom && uid) delete (currentRoom.players as Record<string, unknown>)[uid];
  }),
  runTransaction: vi.fn(async (_ref: unknown, updateFn: (r: unknown) => unknown) => {
    const next = updateFn(currentRoom);
    if (next !== undefined) currentRoom = next as typeof currentRoom;
    return { committed: next !== undefined, snapshot: { val: () => currentRoom } };
  }),
  serverTimestamp: () => 0,
  set: vi.fn(async (r: { path?: string }, value: unknown) => {
    // Odwzorowuje zapis pod `rooms/<kod>/players/<uid>` — tak dołącza teraz
    // gracz, zamiast transakcji na całym pokoju.
    const uid = (r.path ?? '').split('/').pop();
    if (!currentRoom || !uid) return;
    if (!currentRoom.players) currentRoom.players = {} as never;
    (currentRoom.players as Record<string, unknown>)[uid] = value;
  }),
}));

let currentRoom: (Room & { kicked?: Record<string, boolean> }) | null = null;

const { joinRoom } = await import('./room');

function ghostRoom(realCount: number): Room & { kicked?: Record<string, boolean> } {
  const players: Room['players'] = {};
  for (let i = 0; i < realCount; i += 1) {
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
  // Wpis-widmo po wyrzuconym graczu: brak uid/name/characterId/joinedAt.
  players.ghost = { online: false } as unknown as Room['players'][string];

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

describe('joinRoom — limit graczy ignoruje wpisy-widma', () => {
  it('3 prawdziwych graczy + widmo nadal wpuszcza czwartego', async () => {
    currentRoom = ghostRoom(3);
    const result = await joinRoom({ code: 'ABCD', name: 'Nowy', characterId: 'ch-odkrywca' });
    expect(result.ok).toBe(true);
  });

  it('4 prawdziwych graczy odrzuca piątego (limit wciąż działa)', async () => {
    currentRoom = ghostRoom(4);
    const result = await joinRoom({ code: 'ABCD', name: 'Nowy', characterId: 'ch-odkrywca' });
    expect(result.ok).toBe(false);
  });
});
