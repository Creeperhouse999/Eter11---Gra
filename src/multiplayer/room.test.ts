import { describe, expect, it } from 'vitest';
import { makeCode, playersInOrder } from './room';
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
