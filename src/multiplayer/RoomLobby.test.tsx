import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import type { Room, RoomPlayer } from './types';

/**
 * Regresja: każdy gracz startuje z tym samym placeholderem postaci
 * (ALL_CHARACTERS[0]) i nikt nie musi go zmienić. Host mógł więc zacząć grę, w
 * której dwie osoby grają tą samą postacią. Start ma być zablokowany, dopóki
 * wybory postaci nie są różne.
 */

vi.mock('./room', () => ({
  playersInOrder: (room: Room) =>
    Object.values(room.players ?? {}).sort((a, b) => a.joinedAt - b.joinedAt),
  setCharacter: vi.fn(async () => true),
}));

const { RoomLobby } = await import('./RoomLobby');
const { setCharacter } = await import('./room');

const player = (uid: string, characterId: string, joinedAt: number): RoomPlayer => ({
  uid,
  name: uid,
  characterId,
  online: true,
  ready: false,
  joinedAt,
});

function roomWith(players: RoomPlayer[]): Room {
  return {
    code: 'ABCD',
    phase: 'lobby',
    hostUid: 'h',
    players: Object.fromEntries(players.map((p) => [p.uid, p])),
    state: null,
    lastAction: null,
    turnStartedAt: 0,
    reactions: [],
    offer: null,
    createdAt: 0,
  } as unknown as Room;
}

const renderLobby = (players: RoomPlayer[], onStart = vi.fn()) => {
  render(
    <ToastProvider>
      <RoomLobby
        room={roomWith(players)}
        uid="h"
        isHost
        onKick={vi.fn(async () => {})}
        onStart={onStart}
        onLeave={vi.fn()}
      />
    </ToastProvider>,
  );
  return onStart;
};

const startButton = () =>
  screen.getByRole('button', {
    name: /Zaczynamy|różne postacie|Czekamy na graczy/i,
  }) as HTMLButtonElement;

const renderAsGuest = (players: RoomPlayer[], uid: string) => {
  render(
    <ToastProvider>
      <RoomLobby
        room={roomWith(players)}
        uid={uid}
        isHost={false}
        onKick={vi.fn(async () => {})}
        onStart={vi.fn()}
        onLeave={vi.fn()}
      />
    </ToastProvider>,
  );
};

describe('RoomLobby — start dopiero przy różnych postaciach', () => {
  it('blokuje start, gdy dwaj gracze mają tę samą postać', () => {
    renderLobby([
      player('h', 'ch-odkrywca', 1),
      player('g', 'ch-odkrywca', 2),
    ]);
    const btn = startButton();
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toMatch(/różne postacie/i);
  });

  it('pozwala na start, gdy postacie są różne', () => {
    renderLobby([
      player('h', 'ch-odkrywca', 1),
      player('g', 'ch-badacz', 2),
    ]);
    const btn = startButton();
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toMatch(/Zaczynamy \(2\)/);
  });

  it('blokuje start przy jednym graczu', () => {
    renderLobby([player('h', 'ch-odkrywca', 1)]);
    expect(startButton().disabled).toBe(true);
  });
});

/**
 * Adam zgłosił, że zmiana postaci w poczekalni „nie działa" — klika wolną
 * postać i nic się nie dzieje. Przyczyna: `setCharacter(...).then(...)` bez
 * `.catch()` gubił każde odrzucenie zapisu jako nieobsłużone odrzucenie
 * obietnicy — przycisk wyglądał na martwy, bez żadnego komunikatu dla gracza.
 */
describe('RoomLobby — zmiana postaci pokazuje błąd, gdy zapis się nie uda', () => {
  it('nieudany zapis (odrzucona obietnica) kończy się komunikatem, nie ciszą', async () => {
    vi.mocked(setCharacter).mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

    renderLobby([player('h', 'ch-odkrywca', 1), player('g', 'ch-badacz', 2)]);

    // Host (uid „h") klika wolną postać — dowolną, która nie jest już jego
    // ani zajęta przez „g" (`aria-checked="false"` i nie `disabled`).
    const wolna = screen
      .getAllByRole('radio')
      .find((el) => !(el as HTMLButtonElement).disabled && el.getAttribute('aria-checked') === 'false');
    expect(wolna, 'brak wolnej, niezaznaczonej postaci do kliknięcia').toBeTruthy();
    fireEvent.click(wolna!);

    expect(await screen.findByText(/Nie udało się zmienić postaci/i)).toBeTruthy();
  });
});

/**
 * Adam (trzeci raz): zmiana postaci ostatecznie ZAPISYWAŁA SIĘ, ale jedyną
 * oznaką był subtelny przesuw ramki wokół ikony — na telefonie, w biegu,
 * nie do odróżnienia od prawdziwej awarii, którą ten sam raport zgłaszał
 * wcześniej. Udany zapis potrzebuje własnego potwierdzenia, nie tylko brak
 * komunikatu o błędzie.
 */
describe('RoomLobby — udana zmiana postaci potwierdza się komunikatem', () => {
  it('udany zapis pokazuje, JAKĄ postać wybrano', async () => {
    renderLobby([player('h', 'ch-odkrywca', 1), player('g', 'ch-badacz', 2)]);

    const wolna = screen
      .getAllByRole('radio')
      .find((el) => !(el as HTMLButtonElement).disabled && el.getAttribute('aria-checked') === 'false');
    expect(wolna, 'brak wolnej, niezaznaczonej postaci do kliknięcia').toBeTruthy();
    fireEvent.click(wolna!);

    expect(await screen.findByText(/^Wybrano: /i)).toBeTruthy();
  });
});

/**
 * `hostUid` jest nadawany raz przy tworzeniu pokoju i nigdy się nie zmienia
 * (reguły bazy pozwalają go zapisać tylko wtedy, gdy jeszcze nie istnieje).
 * Gdy gospodarz wyjdzie z poczekalni, zostaje po nim wpis w `hostUid`
 * wskazujący na kogoś, kogo już nie ma wśród graczy — i nikt nigdy nie
 * przyciśnie „Zaczynamy" (przycisk widzi tylko `isHost`, a `isHost` nie jest
 * prawdziwe dla nikogo). Reszta drużyny widziała bez końca „Czekamy, aż
 * gospodarz zacznie grę", bez żadnej wskazówki, że ten pokój już nigdy nie
 * ruszy — jedynym wyjściem jest opuszczenie go i założenie nowego.
 */
describe('RoomLobby — gospodarz opuścił poczekalnię', () => {
  it('pokazuje, że pokój jest martwy, zamiast bezterminowego „czekamy"', () => {
    // hostUid w roomWith to zawsze 'h' — pomijamy go z listy graczy, tak jak
    // wygląda pokój po tym, jak gospodarz go opuścił.
    renderAsGuest([player('g', 'ch-badacz', 2)], 'g');

    expect(screen.getByText(/gospodarz opuścił/i)).toBeTruthy();
    expect(screen.queryByText(/Czekamy, aż gospodarz zacznie grę/i)).toBeNull();
  });

  it('gdy gospodarz jest obecny, reszta widzi zwykłe „czekamy"', () => {
    renderAsGuest(
      [player('h', 'ch-odkrywca', 1), player('g', 'ch-badacz', 2)],
      'g',
    );

    expect(screen.getByText(/Czekamy, aż gospodarz zacznie grę/i)).toBeTruthy();
    expect(screen.queryByText(/gospodarz opuścił/i)).toBeNull();
  });
});
