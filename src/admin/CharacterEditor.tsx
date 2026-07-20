import type { Character } from '../engine/types';
import { IconPicker } from './IconPicker';

interface CharacterEditorProps {
  characters: Character[];
  onChange: (characters: Character[]) => void;
}

const KINDS: Array<[Character['kind'], string]> = [
  ['child', 'Dziecko'],
  ['parent', 'Rodzic'],
  ['teacher', 'Nauczyciel'],
];

const inputClass = 'rounded border border-edge bg-bg px-2 py-1.5 text-sm text-ink';

export function CharacterEditor({ characters, onChange }: CharacterEditorProps) {
  const update = (id: string, patch: Partial<Character>) => {
    onChange(characters.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const add = () => {
    onChange([
      ...characters,
      {
        id: `char-${Date.now()}`,
        name: 'Nowa postać',
        kind: 'child',
        traits: '',
        icon: 'compass',
      },
    ]);
  };

  const remove = (id: string) => {
    const character = characters.find((c) => c.id === id);
    // Gra potrzebuje przynajmniej dwóch postaci — tylu graczy siada minimalnie.
    if (characters.length <= 2) {
      window.alert('Muszą zostać co najmniej dwie postacie — tylu graczy siada do gry.');
      return;
    }
    if (window.confirm(`Usunąć postać „${character?.name}"?`)) {
      onChange(characters.filter((c) => c.id !== id));
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Postacie ({characters.length})</h2>
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-accent px-3 py-1.5 text-sm text-accent"
        >
          Dodaj postać
        </button>
      </div>

      <p className="mt-1 text-sm text-ink-dim">
        Gracz wybiera jedną postać na całą rozgrywkę.
      </p>

      <ul className="mt-4 space-y-2">
        {characters.map((character) => (
          <li key={character.id} className="rounded-lg border border-edge bg-surface p-3">
            <div className="grid gap-2 sm:grid-cols-[9rem_1fr_9rem_auto]">
              <IconPicker
                value={character.icon}
                label=""
                onChange={(icon) => update(character.id, { icon })}
              />
              <input
                value={character.name}
                onChange={(e) => update(character.id, { name: e.target.value })}
                aria-label={`Nazwa postaci ${character.name}`}
                className={inputClass}
              />
              <select
                value={character.kind}
                onChange={(e) =>
                  update(character.id, { kind: e.target.value as Character['kind'] })
                }
                aria-label={`Typ postaci ${character.name}`}
                className={inputClass}
              >
                {KINDS.map(([kind, label]) => (
                  <option key={kind} value={kind}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(character.id)}
                className="text-xs text-danger underline underline-offset-2"
              >
                Usuń
              </button>
            </div>

            <input
              value={character.traits}
              onChange={(e) => update(character.id, { traits: e.target.value })}
              placeholder="Cechy postaci — jedno zdanie widoczne przy wyborze"
              aria-label={`Cechy postaci ${character.name}`}
              className={`${inputClass} mt-2 w-full`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
