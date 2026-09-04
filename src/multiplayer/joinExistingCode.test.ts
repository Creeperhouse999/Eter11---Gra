import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Room } from './types';

/**
 * Kod wpisany przez gracza szukamy najpierw DOKŁADNIE tak, jak go wpisał.
 *
 * Poprawka literówek (`normalizeCode`, 6→G) wprowadziła regresję, którą sam
 * zrobiłem: w bazie leżą pokoje założone starszym zestawem znaków — na
 * przykład `UA6E`, z prawdziwą szóstką. Normalizacja zamieniała wpisane `UA6E`
 * na `UAGE`, czyli na kod, którego nie ma, i dołączenie do ISTNIEJĄCEGO pokoju
 * kończyło się komunikatem „nie ma pokoju o takim kodzie".
 *
 * Kolejność jest więc odwrotna, niż się wydaje: najpierw to, co gracz wpisał
 * (bo najczęściej wpisał dobrze), a poprawianie literówek dopiero wtedy, gdy
 * takiego pokoju nie ma.
 */

vi.mock('firebase/auth', () => ({
  signInAnonymously: vi.fn(async () => ({ user: { uid: 'gosc' } })),
}));
vi.mock('../firebase/client', () => ({ rtdb: {}, auth: {} }));

/** Pokoje „na serwerze", pod swoimi kodami. */
let pokoje: Record<string, Room> = {};
/** Które ścieżki odpytano — po nich widać kolejność szukania. */
let odpytane: string[] = [];

const pokoj = (code: string): Room =>
  ({
    code,
    phase: 'lobby',
    hostUid: 'host',
    players: {
      host: {
        uid: 'host',
        name: 'Adam',
        characterId: 'c1',
        online: true,
        ready: false,
        joinedAt: 1,
      },
    },
    state: null,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 1,
  }) as unknown as Room;

vi.mock('firebase/database', () => ({
  // Atrapa PAMIĘTA ścieżkę — bez tego nie da się odróżnić `UA6E` od `UAGE`,
  // a to jest sedno tego testu.
  ref: (_db: unknown, path: string) => ({ path }),
  get: async (r: { path: string }) => {
    const kod = r.path.split('/').pop() ?? '';
    odpytane.push(kod);
    const znaleziony = pokoje[kod];
    return { exists: () => Boolean(znaleziony), val: () => znaleziony ?? null };
  },
  runTransaction: async (r: { path: string }, updater: (v: Room | null) => Room | null) => {
    const kod = r.path.split('/').pop() ?? '';
    const wynik = updater(pokoje[kod] ?? null);
    if (wynik) pokoje[kod] = wynik;
    return { committed: true };
  },
  onDisconnect: vi.fn(() => ({ set: vi.fn(), cancel: vi.fn() })),
  onValue: vi.fn(),
  remove: vi.fn(),
  serverTimestamp: () => 1,
  set: vi.fn(),
  update: vi.fn(),
}));

const { joinRoom } = await import('./room');

beforeEach(() => {
  pokoje = {};
  odpytane = [];
});

describe('szukanie pokoju po wpisanym kodzie', () => {
  it('wchodzi do pokoju o kodzie ze starego zestawu (UA6E z szóstką)', async () => {
    pokoje.UA6E = pokoj('UA6E');

    const wynik = await joinRoom({ code: 'UA6E', name: 'Gość', characterId: 'c2' });

    expect(wynik.ok).toBe(true);
    // Sedno: wracamy z kodem, pod którym pokój NAPRAWDĘ leży.
    expect(wynik.code).toBe('UA6E');
  });

  it('pyta najpierw o to, co gracz wpisał', async () => {
    pokoje.UA6E = pokoj('UA6E');

    await joinRoom({ code: 'UA6E', name: 'Gość', characterId: 'c2' });

    expect(odpytane[0]).toBe('UA6E');
  });

  it('poprawia literówkę, gdy wpisanego kodu nie ma', async () => {
    // Pokój założono jako UAGE, gracz przepisał z ekranu szóstkę zamiast G.
    pokoje.UAGE = pokoj('UAGE');

    const wynik = await joinRoom({ code: 'UA6E', name: 'Gość', characterId: 'c2' });

    expect(wynik.ok).toBe(true);
    expect(wynik.code).toBe('UAGE');
  });

  it('mówi wprost, gdy pokoju nie ma pod żadną wersją kodu', async () => {
    const wynik = await joinRoom({ code: 'ZZZZ', name: 'Gość', characterId: 'c2' });

    expect(wynik.ok).toBe(false);
    expect(wynik.error).toMatch(/nie ma pokoju/i);
  });

  it('zwraca kod, którego użył — ekran nie może go odtwarzać sam', async () => {
    // Ekran lobby wchodził wcześniej do `code.trim().toUpperCase()`, czyli do
    // pokoju o innej nazwie niż ten, do którego dołączenie właśnie się udało.
    pokoje.UAGE = pokoj('UAGE');

    const wynik = await joinRoom({ code: ' ua6e ', name: 'Gość', characterId: 'c2' });

    expect(wynik.code).toBe('UAGE');
  });
});
