import { useState } from 'react';
import { ALL_CHARACTERS } from '../../data/characters';
import type { Character } from '../../engine/types';
import { Icon, type IconName } from '../icons/Icon';
import type { PlayerSetup } from '../useGame';

interface SetupScreenProps {
  onStart: (players: PlayerSetup[]) => void;
  characters?: Character[];
}

interface Draft {
  name: string;
  characterId: string;
}

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

/** Ekran startowy: imiona graczy i wybór postaci. */
export function SetupScreen({ onStart, characters = ALL_CHARACTERS }: SetupScreenProps) {
  const [drafts, setDrafts] = useState<Draft[]>(() => [
    { name: '', characterId: characters[0].id },
    { name: '', characterId: characters[Math.min(3, characters.length - 1)].id },
  ]);

  const update = (index: number, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addPlayer = () => {
    if (drafts.length >= MAX_PLAYERS) return;
    setDrafts((prev) => [...prev, { name: '', characterId: characters[0].id }]);
  };

  const removePlayer = (index: number) => {
    if (drafts.length <= MIN_PLAYERS) return;
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const namesFilled = drafts.every((d) => d.name.trim().length > 0);

  const start = () => {
    if (!namesFilled) return;
    onStart(
      drafts.map((d, i) => ({
        id: `player-${i + 1}`,
        name: d.name.trim(),
        characterId: d.characterId,
      })),
    );
  };

  return (
    <main className="relative mx-auto max-w-3xl px-4 py-10">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      <header className="relative">
        <span className="eter-label">Misja ratunkowa</span>
        <h1 className="font-display text-5xl font-bold tracking-tight text-accent sm:text-6xl">
          ETER11
        </h1>
        <p className="mt-1 font-display text-xl text-ink-dim">Save the World</p>
        <p className="mt-4 max-w-prose text-sm leading-relaxed">
          Wspólnie rozwiązujecie problemy świata. Każdy dokłada coś od siebie,
          uczycie się od siebie nawzajem i odkrywacie, jakie kompetencje przyszłości
          są dla Was ważne.
        </p>
      </header>

      <section className="relative mt-8 space-y-4" aria-label="Gracze">
        {drafts.map((draft, index) => (
          <div key={index} className="rounded-xl border border-edge bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="eter-label">Gracz {index + 1}</span>
              {drafts.length > MIN_PLAYERS && (
                <button
                  type="button"
                  onClick={() => removePlayer(index)}
                  className="text-xs text-danger underline underline-offset-2"
                >
                  Usuń
                </button>
              )}
            </div>

            <label className="mt-3 block">
              <span className="text-sm text-ink-dim">Imię</span>
              <input
                value={draft.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="Wpisz imię"
                className="mt-1 w-full rounded-lg border border-edge bg-bg px-3 py-2 text-ink placeholder:text-ink-dim/60"
              />
            </label>

            <fieldset className="mt-4">
              <legend className="text-sm text-ink-dim">Postać</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {characters.map((character) => {
                  const chosen = draft.characterId === character.id;
                  return (
                    <label
                      key={character.id}
                      className={[
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition',
                        chosen
                          ? 'border-accent bg-raised'
                          : 'border-edge hover:border-ink-dim',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name={`character-${index}`}
                        checked={chosen}
                        onChange={() => update(index, { characterId: character.id })}
                        className="sr-only"
                      />
                      <span className={chosen ? 'text-accent' : 'text-ink-dim'}>
                        <Icon name={character.icon as IconName} size={26} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display text-sm font-bold">
                          {character.name}
                        </span>
                        <span className="block text-xs leading-snug text-ink-dim">
                          {character.traits}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        ))}
      </section>

      <div className="relative mt-6 flex flex-wrap items-center gap-3">
        {drafts.length < MAX_PLAYERS && (
          <button
            type="button"
            onClick={addPlayer}
            className="rounded-lg border border-edge px-4 py-2 text-sm transition hover:border-ink-dim"
          >
            Dodaj gracza
          </button>
        )}
        <button
          type="button"
          onClick={start}
          disabled={!namesFilled}
          className="rounded-lg bg-accent px-6 py-3 font-display font-bold text-bg transition disabled:opacity-40"
        >
          Zaczynamy misję
        </button>
        {!namesFilled && (
          <p className="text-xs text-ink-dim">Wpisz imię każdego gracza, żeby zacząć.</p>
        )}
      </div>
    </main>
  );
}
