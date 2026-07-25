import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
