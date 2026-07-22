import { describe, it, expect } from 'vitest';
import { createGame, reduce, DEFAULT_CONFIG } from '../engine/reducer';
import { ALL_CARDS } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';

/**
 * Start gry online musi zostawić stan z odkrytą misją.
 *
 * Regresja: host wołał samo `createGame`, które kończy w fazie `setup`
 * z `mission: null` — przy stole gracz odkrywa problem ręcznie („Odkryj
 * problem"). Online nikt tego nie klikał, więc wszyscy dostawali pusty ekran:
 * MissionScreen bez `mission` rysuje nic. Zgłoszone jako „gra ruszyła, ale
 * nie widzę planszy".
 *
 * Ten test odtwarza to, co robi teraz `Multiplayer.start()`: createGame →
 * START_MISSION, i sprawdza, że wynik jest już grywalny.
 */
describe('start gry online', () => {
  const players = [
    { id: 'a', name: 'Ala', characterId: 'ch-odkrywca' },
    { id: 'b', name: 'Bartek', characterId: 'ch-odkrywca' },
  ];

  it('samo createGame nie ma jeszcze odkrytej misji', () => {
    const fresh = createGame({
      players,
      deck: ALL_CARDS,
      problems: ALL_PROBLEMS,
      seed: 42,
      config: DEFAULT_CONFIG,
    });
    // To jest właśnie stan, który dawał pusty ekran online.
    expect(fresh.phase).toBe('setup');
    expect(fresh.mission).toBeNull();
  });

  it('createGame + START_MISSION daje grywalną planszę', () => {
    const fresh = createGame({
      players,
      deck: ALL_CARDS,
      problems: ALL_PROBLEMS,
      seed: 42,
      config: DEFAULT_CONFIG,
    });
    const started = reduce(fresh, { type: 'START_MISSION' });

    expect(started.rejected, 'START_MISSION przechodzi').toBeUndefined();
    expect(started.state.phase).toBe('mission');
    // Misja z problemem i ściankami — jest co rysować, MissionScreen nie zwróci
    // już null.
    expect(started.state.mission).not.toBeNull();
    expect(started.state.mission!.problems.length).toBeGreaterThan(0);
    // Aktywny gracz istnieje i ma rękę — inaczej ekran też byłby pusty.
    const active = started.state.players[started.state.activePlayerIndex];
    expect(active).toBeDefined();
    expect(active.hand.length).toBeGreaterThan(0);
  });
});
