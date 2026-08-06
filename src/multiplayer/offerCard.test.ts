import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CardOffer } from './types';

/**
 * `offerCard` ma jeden wspólny slot oferty w pokoju (`room.offer`) — na
 * podsumowaniu misji wielu graczy działa naraz, więc dwie osoby mogły
 * zaproponować przekazanie w tej samej chwili. Zwykły `set()` po prostu
 * nadpisywał: który zapis wygrał wyścig, kasował ofertę tamtego bez śladu —
 * jego okno „Czekasz na odpowiedź" znikało bez żadnego wyjaśnienia. Ten test
 * pilnuje, że transakcja zapisuje TYLKO, gdy slot jest wolny, i odrzuca
 * (z powodem), gdy ktoś już czeka na odpowiedź.
 */

let currentOffer: CardOffer | null = null;
let lastResult: CardOffer | null = null;

vi.mock('firebase/auth', () => ({ signInAnonymously: vi.fn() }));
vi.mock('../firebase/client', () => ({ rtdb: {}, auth: {} }));
vi.mock('firebase/database', () => ({
  ref: () => ({}),
  runTransaction: async (_ref: unknown, updater: (o: CardOffer | null) => CardOffer | null) => {
    lastResult = updater(currentOffer);
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

const { offerCard } = await import('./room');

describe('offerCard — jeden slot propozycji naraz', () => {
  beforeEach(() => {
    currentOffer = null;
    lastResult = null;
  });

  it('propozycja zapisuje się, gdy slot jest wolny', async () => {
    const rejection = await offerCard('ABCD', {
      fromUid: 'g',
      toUid: 'r',
      cardId: 'card-1',
    });

    expect(rejection).toBeNull();
    expect(lastResult).toMatchObject({ fromUid: 'g', toUid: 'r', cardId: 'card-1' });
  });

  it('druga, równoległa propozycja jest odrzucona — nie nadpisuje pierwszej', async () => {
    currentOffer = { fromUid: 'a', toUid: 'b', cardId: 'card-1', at: 100 };

    const rejection = await offerCard('ABCD', {
      fromUid: 'c',
      toUid: 'd',
      cardId: 'card-2',
    });

    // Bez fixu: `set()` nadpisywał bezwarunkowo — pierwsza oferta (a→b)
    // znikałaby bez śladu. Z fixem: transakcja odrzuca, pierwsza zostaje.
    expect(rejection).not.toBeNull();
    expect(lastResult).toEqual(currentOffer);
  });

  it('po zwolnieniu slotu (np. anulowaniu) kolejna propozycja znów przechodzi', async () => {
    currentOffer = null; // odpowiednik `clearOffer` przed tym wywołaniem
    const rejection = await offerCard('ABCD', {
      fromUid: 'c',
      toUid: 'd',
      cardId: 'card-2',
    });

    expect(rejection).toBeNull();
    expect(lastResult).toMatchObject({ fromUid: 'c', toUid: 'd', cardId: 'card-2' });
  });
});
