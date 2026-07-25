import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { Room } from './types';
import { ToastProvider } from '../ui/controls/Toast';
import { BUILTIN_CONTENT } from '../data/builtinContent';

/**
 * Regresja: „Załóż pokój" na wolnej sieci wracało do lobby, jakby nic nie
 * powstało.
 *
 * Zaraz po utworzeniu pokoju `room` jest jeszcze `null` — pierwszy snapshot
 * z bazy nie doszedł. Efekt „pokój zniknął → wróć do lobby" nie odróżniał
 * „jeszcze się nie wczytał" od „naprawdę zniknął" i na telefonie zdążał
 * zresetować ekran, zanim nadszedł pierwszy snapshot. Test trzyma callback
 * `watchRoom` wstrzymany i sprawdza, że ekran czeka („Łączę…"), a nie cofa
 * się do lobby.
 */

// Sterowalny nasłuch: zapamiętujemy callback, żeby test decydował, KIEDY
// przyjdzie pierwszy snapshot — dokładnie tak jak wolna sieć.
let emit: ((room: Room | null) => void) | null = null;

vi.mock('./room', () => ({
  createRoom: vi.fn(async () => ({ code: 'ABCD', uid: 'host-1' })),
  joinRoom: vi.fn(),
  watchRoom: vi.fn((_code: string, onChange: (room: Room | null) => void) => {
    emit = onChange;
    return () => {
      emit = null;
    };
  }),
  playersInOrder: (room: Room) => Object.values(room.players ?? {}),
  revealerUid: (room: Room) =>
    Object.values(room.players ?? {}).find((p) => p.online)?.uid,
  startGame: vi.fn(),
  setReady: vi.fn(),
  setCharacter: vi.fn(),
  kickPlayer: vi.fn(),
  commitMove: vi.fn(),
  commitMoveAsHost: vi.fn(),
  commitSummaryMove: vi.fn(async () => null),
  sendReaction: vi.fn(),
  offerCard: vi.fn(),
  clearOffer: vi.fn(),
  trackPresence: vi.fn(() => () => {}),
}));

// Import po vi.mock, żeby komponent dostał zamockowaną warstwę pokoju.
const { Multiplayer } = await import('./Multiplayer');

const roomWithHost = (): Room =>
  ({
    code: 'ABCD',
    phase: 'lobby',
    hostUid: 'host-1',
    players: {
      'host-1': {
        uid: 'host-1',
        name: 'Ala',
        characterId: BUILTIN_CONTENT.characters[0].id,
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
    createdAt: 0,
  }) as Room;

const renderMp = () =>
  render(
    <ToastProvider>
      <Multiplayer content={BUILTIN_CONTENT} onExit={() => {}} />
    </ToastProvider>,
  );

beforeEach(() => {
  emit = null;
});

/** Zakłada pokój: wpisuje imię i klika przez kreator do „Załóż pokój". */
async function createRoomFlow() {
  fireEvent.click(screen.getByRole('button', { name: /Załóż pokój/ }));
  const name = screen.getByPlaceholderText('Imię');
  fireEvent.change(name, { target: { value: 'Ala' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Załóż pokój/ }));
  });
}

describe('Multiplayer — utworzenie pokoju na wolnej sieci', () => {
  it('czeka na pierwszy snapshot zamiast wracać do lobby', async () => {
    renderMp();
    await createRoomFlow();

    // Pierwszy snapshot jeszcze nie doszedł — ekran ma czekać, a NIE cofać
    // się do ekranu zakładania. To był cały bug.
    expect(screen.getByText(/Łączę z pokojem/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Dołącz kodem' })).toBeNull();
  });

  it('po nadejściu pokoju pokazuje poczekalnię', async () => {
    renderMp();
    await createRoomFlow();

    await act(async () => {
      emit?.(roomWithHost());
    });

    expect(screen.getByText('Poczekalnia')).toBeDefined();
    expect(screen.getByText('ABCD')).toBeDefined();
  });

  it('wraca do lobby dopiero, gdy połączony pokój naprawdę zniknął', async () => {
    renderMp();
    await createRoomFlow();

    // Najpierw pokój jest (połączono)…
    await act(async () => {
      emit?.(roomWithHost());
    });
    expect(screen.getByText('Poczekalnia')).toBeDefined();

    // …a potem znika (host zamknął / nas wyrzucono) — TERAZ wracamy do lobby.
    await act(async () => {
      emit?.(null);
    });
    expect(screen.getByRole('button', { name: 'Dołącz kodem' })).toBeDefined();
  });
});
