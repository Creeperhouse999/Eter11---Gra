import { describe, it, expect, vi } from 'vitest';
import type { Room } from './types';

/**
 * `joinRoom` przeszedł w 7c7ebf3 na czystą `runTransaction` bez wcześniejszego
 * `get()`. Realna RTDB na PIERWSZYM przebiegu transakcji na ścieżce, której
 * klient nigdy wcześniej nie czytał (dokładnie przypadek: wpisujesz kod od
 * znajomego i klikasz „Dołącz") wywołuje funkcję aktualizującą z `null`, choć
 * pokój naprawdę istnieje na serwerze — SDK „zgaduje" z pustego lokalnego
 * cache. `joinRoom` na gałęzi `!room` zwracał `room`, czyli ten `null` —
 * RTDB próbowała więc ZAPISAĆ `null` (skasować) pod istniejącym pokojem.
 * Reguła bazy (`!data.exists()`) to odrzuca jako PERMISSION_DENIED — a to
 * odrzucenie z reguł, nie z nieaktualnych danych, więc SDK NIE ponawia próby
 * z prawdziwym stanem. Efekt: każde dołączenie do istniejącego pokoju z
 * zimnym cache (czyli praktycznie zawsze — dołączenie to pierwszy dotyk tej
 * ścieżki) kończyło się wyjątkiem zamiast realnym sprawdzeniem kodu.
 */

vi.mock('firebase/auth', () => ({
  signInAnonymously: vi.fn(async () => ({ user: { uid: 'newbie' } })),
}));
vi.mock('../firebase/client', () => ({ rtdb: {}, auth: {} }));

let currentRoom: (Room & { kicked?: Record<string, boolean> }) | null = null;

vi.mock('firebase/database', () => ({
  ref: () => ({}),
  get: async () => ({
    exists: () => currentRoom !== null,
    val: () => currentRoom,
  }),
  onDisconnect: vi.fn(),
  onValue: vi.fn(),
  remove: vi.fn(),
  // Symuluje PRAWDZIWĄ dwuetapową transakcję RTDB przy zimnym cache:
  // pierwszy przebieg dostaje `null` (klient nigdy nie czytał tej ścieżki),
  // niezależnie od realnego stanu na serwerze. Jeśli zwrócona wartość różni
  // się od realnego stanu, serwer sprawdza REGUŁY na PRAWDZIWYCH danych —
  // próba zapisania `null` pod istniejącym pokojem łamie `!data.exists()` i
  // kończy się wyjątkiem (bez ponawiania — to nie jest spór o nieaktualność,
  // tylko odmowa z reguł). Zwrot `undefined` na pierwszym przebiegu poprawnie
  // przerywa bez zapisu, a `runTransaction` próbuje drugi raz na realnych
  // danych — tak jak prawdziwe SDK po ponownym odczycie ścieżki.
  runTransaction: vi.fn(async (_ref: unknown, updateFn: (r: unknown) => unknown) => {
    const real = currentRoom;
    const first = updateFn(null);
    if (first === undefined) {
      const second = updateFn(real);
      if (second === undefined) return { committed: false, snapshot: { val: () => real } };
      currentRoom = second as typeof currentRoom;
      return { committed: true, snapshot: { val: () => currentRoom } };
    }
    if (real !== null && first === null) {
      throw new Error('PERMISSION_DENIED: Permission denied');
    }
    currentRoom = first as typeof currentRoom;
    return { committed: true, snapshot: { val: () => currentRoom } };
  }),
  serverTimestamp: () => 0,
  set: vi.fn(),
}));

const { joinRoom } = await import('./room');

function roomWithHost(): Room & { kicked?: Record<string, boolean> } {
  return {
    code: 'QGCA',
    phase: 'lobby',
    hostUid: 'host1',
    players: {
      host1: {
        uid: 'host1',
        name: 'Adam',
        characterId: 'ch-odkrywca',
        online: true,
        ready: false,
        joinedAt: 0,
      },
    },
    state: null,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 0,
  };
}

describe('joinRoom — zimny lokalny cache przy dołączaniu do istniejącego pokoju', () => {
  it('dołącza mimo że transakcja widzi null na pierwszym przebiegu', async () => {
    currentRoom = roomWithHost();

    const result = await joinRoom({ code: 'QGCA', name: 'Ola', characterId: 'ch-mysliwy' });

    expect(result.ok).toBe(true);
    expect(currentRoom!.players.newbie).toBeTruthy();
  });
});
