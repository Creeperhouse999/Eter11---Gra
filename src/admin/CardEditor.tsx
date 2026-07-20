import { useState } from 'react';
import type { BlackSwanKind, Card, CardCategory } from '../engine/types';
import { categoryColorVar, categoryLabel } from '../ui/components/categoryStyles';
import { Button } from '../ui/controls/Button';
import { Checkbox } from '../ui/controls/Checkbox';
import { TextField } from '../ui/controls/Field';
import { Select } from '../ui/controls/Select';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { IconPicker } from './IconPicker';

interface CardEditorProps {
  cards: Card[];
  problemBonusIds: Set<string>;
  onChange: (cards: Card[]) => void;
}

const CATEGORIES: CardCategory[] = [
  'psychological', 'digital', 'social', 'talent', 'mentor', 'eter11', 'blackswan',
];

const SWAN_KINDS: Array<[BlackSwanKind, string]> = [
  ['extraProblem', 'Dodatkowy problem'],
  ['doubleRequirements', 'Podwojone wymagania'],
  ['swapHands', 'Wymiana rąk'],
];

const CATEGORY_OPTIONS = CATEGORIES.map((category) => ({
  value: category,
  label: categoryLabel(category),
  color: categoryColorVar(category),
}));

export function CardEditor({ cards, problemBonusIds, onChange }: CardEditorProps) {
  const [filter, setFilter] = useState<CardCategory | 'all'>('all');
  const { confirm, dialog } = useConfirm();
  const toast = useToast();

  const visible = filter === 'all' ? cards : cards.filter((c) => c.category === filter);

  const update = (id: string, patch: Partial<Card>) => {
    onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const add = () => {
    const category: CardCategory = filter === 'all' ? 'psychological' : filter;
    onChange([
      ...cards,
      {
        id: `card-${Date.now()}`,
        name: 'Nowa karta',
        category,
        description: '',
        icon: 'star',
        draft: true,
        ...(category === 'blackswan' ? { blackSwanKind: 'extraProblem' as BlackSwanKind } : {}),
      },
    ]);
  };

  const remove = async (id: string) => {
    const card = cards.find((c) => c.id === id);
    // Karta użyta jako bonus zablokowałaby zapis — ostrzegamy zawczasu.
    const usedAsBonus = problemBonusIds.has(id);
    const confirmed = await confirm({
      title: 'Usunąć kartę?',
      message: usedAsBonus
        ? `„${card?.name}" jest kartą bonusową jednego z problemów. Usuń ją najpierw z listy bonusów — inaczej zapis zostanie odrzucony.`
        : `„${card?.name}" zniknie z talii. Zmiana wejdzie w życie po zapisaniu.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (confirmed) {
      onChange(cards.filter((c) => c.id !== id));
      toast(`Usunięto kartę „${card?.name}".`);
    }
  };

  return (
    <section>
      {dialog}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-lg font-bold">
          Karty ({visible.length}
          {filter !== 'all' && ` z ${cards.length}`})
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <Select
            value={filter}
            ariaLabel="Filtruj kategorię"
            className="w-52"
            options={[
              { value: 'all' as const, label: 'Wszystkie kategorie' },
              ...CATEGORY_OPTIONS,
            ]}
            onChange={setFilter}
          />
          <Button icon="plus" onClick={add}>
            Dodaj kartę
          </Button>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {visible.map((card) => (
          <li
            key={card.id}
            className="eter-rise rounded-lg border-l-4 border border-edge bg-surface p-3"
            style={{ borderLeftColor: categoryColorVar(card.category) }}
          >
            <div className="grid gap-2 sm:grid-cols-[9rem_1fr_10rem_auto]">
              <IconPicker
                value={card.icon}
                label=""
                onChange={(icon) => update(card.id, { icon })}
              />
              <TextField
                value={card.name}
                onChange={(e) => update(card.id, { name: e.target.value })}
                aria-label={`Nazwa karty ${card.name}`}
              />
              <Select
                value={card.category}
                ariaLabel={`Kategoria karty ${card.name}`}
                options={CATEGORY_OPTIONS}
                onChange={(category) => update(card.id, { category })}
              />
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                onClick={() => remove(card.id)}
                className="self-start text-danger"
              >
                Usuń
              </Button>
            </div>

            <TextField
              value={card.description}
              onChange={(e) => update(card.id, { description: e.target.value })}
              placeholder="Opis karty"
              aria-label={`Opis karty ${card.name}`}
              className="mt-2"
            />

            <div className="mt-2 flex flex-wrap items-center gap-4">
              {card.category === 'blackswan' && (
                <Select
                  value={card.blackSwanKind ?? 'extraProblem'}
                  label="Wariant"
                  className="w-56"
                  options={SWAN_KINDS.map(([kind, label]) => ({ value: kind, label }))}
                  onChange={(blackSwanKind) => update(card.id, { blackSwanKind })}
                />
              )}

              <Checkbox
                checked={Boolean(card.draft)}
                onChange={(draft) => update(card.id, { draft })}
              >
                Wymaga weryfikacji merytorycznej
              </Checkbox>

              {problemBonusIds.has(card.id) && (
                <span className="font-mono text-[10px] text-accent">karta bonusowa</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
