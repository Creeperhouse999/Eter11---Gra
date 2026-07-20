import { useState } from 'react';
import type { BlackSwanKind, Card, CardCategory } from '../engine/types';
import { categoryColorVar, categoryLabel } from '../ui/components/categoryStyles';
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

const inputClass = 'rounded border border-edge bg-bg px-2 py-1.5 text-sm text-ink';

export function CardEditor({ cards, problemBonusIds, onChange }: CardEditorProps) {
  const [filter, setFilter] = useState<CardCategory | 'all'>('all');

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

  const remove = (id: string) => {
    const card = cards.find((c) => c.id === id);
    // Karta użyta jako bonus zablokowałaby zapis — ostrzegamy zawczasu.
    const usedAsBonus = problemBonusIds.has(id);
    const warning = usedAsBonus
      ? '\n\nUWAGA: ta karta jest kartą bonusową jakiegoś problemu. Usuń ją najpierw z listy bonusów, inaczej zapis zostanie odrzucony.'
      : '';
    if (window.confirm(`Usunąć kartę „${card?.name}"?${warning}`)) {
      onChange(cards.filter((c) => c.id !== id));
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">
          Karty ({visible.length}
          {filter !== 'all' && ` z ${cards.length}`})
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as CardCategory | 'all')}
            aria-label="Filtruj kategorię"
            className={inputClass}
          >
            <option value="all">Wszystkie kategorie</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            className="rounded-lg border border-accent px-3 py-1.5 text-sm text-accent"
          >
            Dodaj kartę
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {visible.map((card) => (
          <li
            key={card.id}
            className="rounded-lg border-l-4 border border-edge bg-surface p-3"
            style={{ borderLeftColor: categoryColorVar(card.category) }}
          >
            <div className="grid gap-2 sm:grid-cols-[9rem_1fr_10rem_auto]">
              <IconPicker
                value={card.icon}
                label=""
                onChange={(icon) => update(card.id, { icon })}
              />
              <input
                value={card.name}
                onChange={(e) => update(card.id, { name: e.target.value })}
                aria-label={`Nazwa karty ${card.name}`}
                className={inputClass}
              />
              <select
                value={card.category}
                onChange={(e) => update(card.id, { category: e.target.value as CardCategory })}
                aria-label={`Kategoria karty ${card.name}`}
                className={inputClass}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabel(category)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(card.id)}
                className="text-xs text-danger underline underline-offset-2"
              >
                Usuń
              </button>
            </div>

            <input
              value={card.description}
              onChange={(e) => update(card.id, { description: e.target.value })}
              placeholder="Opis karty"
              aria-label={`Opis karty ${card.name}`}
              className={`${inputClass} mt-2 w-full`}
            />

            <div className="mt-2 flex flex-wrap items-center gap-4">
              {card.category === 'blackswan' && (
                <label className="text-sm">
                  <span className="text-ink-dim">Wariant</span>
                  <select
                    value={card.blackSwanKind ?? 'extraProblem'}
                    onChange={(e) =>
                      update(card.id, { blackSwanKind: e.target.value as BlackSwanKind })
                    }
                    className={`${inputClass} ml-2`}
                  >
                    {SWAN_KINDS.map(([kind, label]) => (
                      <option key={kind} value={kind}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(card.draft)}
                  onChange={(e) => update(card.id, { draft: e.target.checked })}
                />
                <span className="text-ink-dim">Wymaga weryfikacji merytorycznej</span>
              </label>

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
