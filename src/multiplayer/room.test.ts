import { describe, expect, it } from 'vitest';
import { leaveActionFor, makeCode, playersInOrder } from './room';
import type { Room, RoomPlayer } from './types';

/**
 * Czyste kawałki warstwy pokoju — bez sieci. Kod pokoju i kolejność tur muszą
 * być przewidywalne, bo od nich zależy, kto gra i czy dziecko przepisze kod.
 */
describe('kod pokoju', () => {
  it('ma cztery znaki', () => {
    // Deterministyczny „random", żeby test się nie sypał losowo.
    const code = makeCode(() => 0);
    expect(code).toHaveLength(4);
  });

  it('nie używa znaków mylących się dziecku', () => {
    // 0/O/1/I/L wypadają — sprawdzamy na wielu losowaniach.
    let seed = 0;
    const rng = () => {
      seed = (seed + 0.137) % 1;
      return seed;
    };
    for (let i = 0; i < 200; i += 1) {
      const code = makeCode(rng);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });
});

describe('kolejność graczy', () => {
  const player = (uid: string, joinedAt: number): RoomPlayer => ({
    uid,
    name: uid,
    characterId: 'ch-odkrywca',
    online: true,
    ready: false,
    joinedAt,
  });

  it('ustala się po czasie dołączenia, nie po kluczu', () => {
    // Klucze w obiekcie bywają w innej kolejności niż dołączenie — porządek
    // tur musi iść po `joinedAt`, inaczej kto pierwszy gra zależałoby od
    // przypadku.
    const room = {
      players: {
        c: player('c', 30),
        a: player('a', 10),
        b: player('b', 20),
      },
    } as unknown as Room;

    expect(playersInOrder(room).map((p) => p.uid)).toEqual(['a', 'b', 'c']);
  });

  it('pusty pokój daje pustą listę', () => {
    const room = { players: {} } as unknown as Room;
    expect(playersInOrder(room)).toEqual([]);
  });
});

describe('dobrowolne wyjście z pokoju', () => {
  const player = (uid: string, joinedAt: number): RoomPlayer => ({
    uid,
    name: uid,
    characterId: 'ch-odkrywca',
    online: true,
    ready: false,
    joinedAt,
  });

  const roomWith = (phase: Room['phase'], uids: string[]): Room =>
    ({
      phase,
      players: Object.fromEntries(uids.map((uid, i) => [uid, player(uid, i * 10)])),
    }) as unknown as Room;

  it('w poczekalni usuwa wpis — zwalnia miejsce i postać', () => {
    // Gra jeszcze nie zbudowała kolejności ze stanu, więc wpis można skasować
    // w całości. Zostawienie go zajmowałoby slot i blokowało wybraną postać.
    expect(leaveActionFor(roomWith('lobby', ['a', 'b']), 'a')).toBe('remove');
  });

  it('w trakcie gry oznacza gracza offline zamiast usuwać', () => {
    // Kolejność tur mapuje `state.players` po indeksie z `playersInOrder(room)`.
    // Usunięcie wpisu rozjechałoby ten indeks u wszystkich. Zostawiamy wpis, ale
    // offline — inaczej `leave()` nic nie zapisywał, gracz zostawał online:true,
    // a w grze we dwoje koordynator (warunek `!online`) NIGDY nie spasował jego
    // tury: partia wisiała na stałe. To był realny błąd tej łatki.
    expect(leaveActionFor(roomWith('playing', ['a', 'b']), 'a')).toBe('offline');
  });

  it('po zakończeniu gry też tylko offline', () => {
    expect(leaveActionFor(roomWith('finished', ['a', 'b']), 'a')).toBe('offline');
  });

  it('gdy gracza nie ma w pokoju, nic nie robi', () => {
    expect(leaveActionFor(roomWith('playing', ['a', 'b']), 'zzz')).toBe('none');
    expect(leaveActionFor(null, 'a')).toBe('none');
  });
});
