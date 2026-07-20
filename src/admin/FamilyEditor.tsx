import { FAMILY_LABELS, type FamilyMap } from '../data/families';
import type { Card, CardCategory } from '../engine/types';
import { categoryLabel } from '../ui/components/categoryStyles';
import { TextField } from '../ui/controls/Field';
import { Icon, type IconName } from '../ui/icons/Icon';
import { IconPicker } from './IconPicker';

interface FamilyEditorProps {
  families: FamilyMap;
  cards: Card[];
  onChange: (families: FamilyMap) => void;
}

/** Kategorie mające rodziny — karty specjalne są poza tym podziałem. */
const CATEGORIES: CardCategory[] = [
  'psychological',
  'digital',
  'social',
  'mentor',
  'talent',
];

/**
 * Edytor rodzin kart.
 *
 * Rodzina to nazwa, kolor i symbol wspólny dla trzech kart. Kolory są
 * współdzielone przez wszystkie kategorie — czerwona rodzina wygląda tak
 * samo wśród kompetencji i wśród talentów — więc zmienia się je w sekcji
 * „Kolory”. Tutaj ustawia się nazwę, symbol i opis dla danej kategorii.
 */
export function FamilyEditor({ families, cards, onChange }: FamilyEditorProps) {
  const update = (
    category: CardCategory,
    familyId: string,
    patch: Partial<{ name: string; icon: IconName; description: string }>,
  ) => {
    onChange({
      ...families,
      [category]: families[category].map((family) =>
        family.id === familyId ? { ...family, ...patch } : family,
      ),
    });
  };

  return (
    <section>
      <h2 className="font-display text-lg font-bold">Rodziny kart</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Każda kategoria dzieli się na cztery rodziny. Ścianka problemu wymaga
        konkretnej rodziny, więc dziecko dopasowuje kolor do koloru. Same kolory
        zmienia się w sekcji „Kolory” — tu ustawiasz nazwę, symbol i opis.
      </p>

      <div className="mt-5 space-y-6">
        {CATEGORIES.map((category) => (
          <div key={category}>
            <h3 className="eter-label">{categoryLabel(category)}</h3>

            <div className="eter-stagger mt-2 grid gap-3 lg:grid-cols-2">
              {families[category].map((family) => {
                const count = cards.filter(
                  (c) => c.category === category && c.family === family.id,
                ).length;

                return (
                  <div
                    key={family.id}
                    className="rounded-lg border-l-4 border border-edge bg-surface p-3"
                    style={{ borderLeftColor: `var(--eter-family-${family.id})` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span style={{ color: `var(--eter-family-${family.id})` }}>
                          <Icon name={family.icon} size={18} />
                        </span>
                        {FAMILY_LABELS[family.id]}
                      </span>
                      <span
                        className={[
                          'font-mono text-[10px]',
                          count === 0 ? 'text-danger' : 'text-ink-dim',
                        ].join(' ')}
                      >
                        {count} {count === 1 ? 'karta' : 'kart'}
                      </span>
                    </div>

                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_9rem]">
                      <TextField
                        label="Nazwa rodziny"
                        value={family.name}
                        onChange={(e) => update(category, family.id, { name: e.target.value })}
                      />
                      <IconPicker
                        label="Symbol"
                        value={family.icon}
                        onChange={(icon) => update(category, family.id, { icon })}
                      />
                    </div>

                    <TextField
                      label="Co łączy te karty"
                      className="mt-2"
                      value={family.description}
                      onChange={(e) =>
                        update(category, family.id, { description: e.target.value })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
