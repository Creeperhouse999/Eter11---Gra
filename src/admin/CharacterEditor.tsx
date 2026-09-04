import type { Character } from '../engine/types';
import { Button } from '../ui/controls/Button';
import { TextField } from '../ui/controls/Field';
import { Select } from '../ui/controls/Select';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { IconPicker } from './IconPicker';
import { kolorPostaci } from '../data/characters';
import { newId } from './newId';

interface CharacterEditorProps {
  characters: Character[];
  onChange: (characters: Character[]) => void;
}

const KINDS: Array<[Character['kind'], string]> = [
  ['child', 'Dziecko'],
  ['parent', 'Rodzic'],
  ['teacher', 'Nauczyciel'],
];

export function CharacterEditor({ characters, onChange }: CharacterEditorProps) {
  const { confirm, dialog } = useConfirm();
  const toast = useToast();

  const update = (id: string, patch: Partial<Character>) => {
    onChange(characters.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const add = () => {
    // Na początku listy — na końcu byłaby poza widokiem.
    onChange([
      {
        // `newId`, nie `Date.now()`: dwa dodania w tej samej milisekundzie
        // dawały identyczne id, a wtedy dwie postacie zlewały się w jedną
        // (edycja/usuwanie trafiały obie, a gracz wskazywał je niejednoznacznie).
        id: newId('char'),
        name: 'Nowa postać',
        kind: 'child',
        traits: '',
        icon: 'compass',
      },
      ...characters,
    ]);
    toast('Dodano postać na górze listy.');
  };

  const remove = async (id: string) => {
    const character = characters.find((c) => c.id === id);
    // Gra potrzebuje przynajmniej dwóch postaci — tylu graczy siada minimalnie.
    if (characters.length <= 2) {
      toast('Muszą zostać co najmniej dwie postacie — tylu graczy siada do gry.', 'danger');
      return;
    }
    const confirmed = await confirm({
      title: 'Usunąć postać?',
      message: `„${character?.name}" zniknie z listy do wyboru. Zmiana wejdzie w życie po zapisaniu.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (confirmed) {
      onChange(characters.filter((c) => c.id !== id));
      toast(`Usunięto postać „${character?.name}".`);
    }
  };

  return (
    <section>
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Postacie ({characters.length})</h2>
        <Button icon="plus" size="sm" onClick={add}>
          Dodaj postać
        </Button>
      </div>

      <p className="mt-1 text-sm text-ink-dim">
        Gracz wybiera jedną postać na całą rozgrywkę.
      </p>

      <ul className="mt-4 space-y-2">
        {characters.map((character) => (
          <li key={character.id} className="eter-rise rounded-lg border border-edge bg-surface p-3">
            <div className="grid gap-2 sm:grid-cols-[9rem_1fr_9rem_auto]">
              <span className="flex items-center gap-2">
                <IconPicker
                  value={character.icon}
                  label=""
                  onChange={(icon) => update(character.id, { icon })}
                />
                {/* Kolor karty postaci — Adam poprosił, żeby każda miała inny
                    i żeby dało się go zmienić stąd. Przy stole karty leżą obok
                    siebie i jednakowe wyglądają jak komplet. */}
                <input
                  type="color"
                  value={kolorPostaci(character, characters)}
                  aria-label={`Kolor karty postaci ${character.name}`}
                  onChange={(e) => update(character.id, { color: e.target.value })}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded border border-edge bg-surface"
                />
              </span>
              <TextField
                value={character.name}
                onChange={(e) => update(character.id, { name: e.target.value })}
                aria-label={`Nazwa postaci ${character.name}`}
              />
              <Select
                value={character.kind}
                ariaLabel={`Typ postaci ${character.name}`}
                options={KINDS.map(([kind, label]) => ({ value: kind, label }))}
                onChange={(kind) => update(character.id, { kind })}
              />
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                aria-label="Usuń"
                onClick={() => remove(character.id)}
                className="self-start text-danger"
              >
                Usuń
              </Button>
            </div>

            <TextField
              value={character.traits}
              onChange={(e) => update(character.id, { traits: e.target.value })}
              placeholder="Cechy postaci — jedno zdanie widoczne przy wyborze"
              aria-label={`Cechy postaci ${character.name}`}
              className="mt-2"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
