import {
  CATEGORY_ORDER,
  DEFAULT_CATEGORIES,
  type CategoryMap,
} from '../data/categories';
import type { CardCategory } from '../engine/types';
import { categoryColorVar } from '../ui/components/categoryStyles';
import { TextField } from '../ui/controls/Field';
import { Icon, type IconName } from '../ui/icons/Icon';
import { IconPicker } from './IconPicker';

interface CategoryEditorProps {
  categories?: CategoryMap;
  onChange: (categories: CategoryMap) => void;
}

/** Karty specjalne — nie są ściankami, ale mają nazwę i ikonę. */
const SPECIAL: CardCategory[] = ['eter11', 'blackswan'];

/**
 * Nazwy i ikony kategorii kart.
 *
 * Zmienia się to, co widzi gracz. Klucze zostają — na nich opiera się
 * dopasowanie karty do ścianki, więc kategorii nie da się tu dodać ani
 * usunąć. Pięć ścianek to też układ karty problemu i karty postaci: szósta
 * nie miałaby gdzie się zmieścić.
 *
 * Kolory są w zakładce „Kolory”, razem z resztą palety.
 */
export function CategoryEditor({ categories, onChange }: CategoryEditorProps) {
  const current: CategoryMap = { ...DEFAULT_CATEGORIES, ...categories };

  const update = (key: CardCategory, patch: Partial<CategoryMap[CardCategory]>) => {
    onChange({ ...current, [key]: { ...current[key], ...patch } });
  };

  const row = (key: CardCategory) => {
    const style = current[key];
    const changed =
      style.label !== DEFAULT_CATEGORIES[key].label ||
      style.icon !== DEFAULT_CATEGORIES[key].icon;

    return (
      <div key={key} className="rounded-lg border border-edge bg-surface p-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--eter-raised)', color: categoryColorVar(key) }}
          >
            <Icon name={style.icon as IconName} size={20} />
          </span>

          <div className="min-w-0 flex-1">
            <TextField
              value={style.label}
              maxLength={30}
              aria-label={`Nazwa kategorii ${key}`}
              onChange={(e) => update(key, { label: e.target.value })}
            />
          </div>

          <div className="w-36 shrink-0">
            <IconPicker
              label=""
              value={style.icon}
              onChange={(icon) => update(key, { icon })}
            />
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          {/* Klucz techniczny pod spodem: redaktor zmienia nazwę, ale karty
              i problemy w bazie odwołują się do klucza, nie do nazwy. */}
          <span className="font-mono text-[10px] text-ink-dim">{key}</span>
          {changed && (
            <button
              type="button"
              onClick={() => update(key, DEFAULT_CATEGORIES[key])}
              className="font-mono text-[10px] text-accent hover:underline"
            >
              przywróć domyślne
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <section aria-label="Kategorie">
      <h2 className="font-display text-lg font-bold">Kategorie kart</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Nazwy i ikony, które widzi gracz — na kartach, ściankach i karcie
        postaci. Kolory ustawisz w zakładce „Kolory”.
      </p>

      <div className="eter-stagger mt-4 space-y-2">{CATEGORY_ORDER.map(row)}</div>

      <h3 className="mt-6 font-display font-bold">Karty specjalne</h3>
      <p className="mt-1 max-w-prose text-xs text-ink-dim">
        Nie pasują do żadnej ścianki: ETER11 jest jokerem, a Czarny Łabędź
        utrudnieniem. Nazwę i ikonę mają jak każda inna karta.
      </p>
      <div className="eter-stagger mt-3 space-y-2">{SPECIAL.map(row)}</div>

      <p className="mt-6 max-w-prose rounded-lg border border-edge bg-surface p-3 text-xs leading-relaxed text-ink-dim">
        Kategorii nie da się tu dodać ani usunąć. Pięć ścianek to układ karty
        problemu i karty postaci, a dopasowanie karty do ścianki opiera się na
        kluczach widocznych pod nazwami. Zmiana tej liczby to zmiana zasad gry,
        nie tekstu — daj znać, jeśli będzie potrzebna.
      </p>
    </section>
  );
}
