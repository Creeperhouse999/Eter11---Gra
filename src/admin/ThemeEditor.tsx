import { applyTheme, DEFAULT_THEME, THEME_GROUPS, type ThemeColors } from '../data/theme';
import { Button } from '../ui/controls/Button';
import { Icon } from '../ui/icons/Icon';

interface ThemeEditorProps {
  theme: ThemeColors;
  onChange: (theme: ThemeColors) => void;
}

/**
 * Relatywna luminancja wg WCAG — potrzebna do sprawdzenia kontrastu.
 */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

/**
 * Edytor motywu z podglądem na żywo.
 *
 * Zmiana koloru od razu przestawia zmienne CSS całej strony — administrator
 * widzi efekt bez zapisywania. Kontrast tekstu jest sprawdzany na bieżąco,
 * bo odbiorcą gry jest ośmiolatek.
 */
export function ThemeEditor({ theme, onChange }: ThemeEditorProps) {
  const update = (patch: Partial<ThemeColors>) => {
    const next = { ...theme, ...patch };
    onChange(next);
    // Podgląd na żywo: same zmienne CSS, bez zapisu do bazy.
    applyTheme(next);
  };

  const inkContrast = contrastRatio(theme.ink, theme.surface);
  const dimContrast = contrastRatio(theme.inkDim, theme.surface);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Kolory</h2>
        <Button icon="undo" size="sm" onClick={() => update(DEFAULT_THEME)}>
          Przywróć domyślne
        </Button>
      </div>

      <p className="mt-1 text-sm text-ink-dim">
        Zmiany widać natychmiast na całej stronie. Zapisz, żeby zobaczyli je gracze.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-edge bg-surface p-3">
          <span className="eter-label">Kontrast tekstu głównego</span>
          <p
            className="mt-1 flex items-center gap-1.5 font-mono text-lg font-bold"
            style={{ color: inkContrast >= 4.5 ? 'var(--eter-success)' : 'var(--eter-danger)' }}
          >
            <Icon name={inkContrast >= 4.5 ? 'tick' : 'warning'} size={16} />
            {inkContrast.toFixed(1)}:1{inkContrast >= 4.5 ? '' : ' — za mało'}
          </p>
          <span className="text-xs text-ink-dim">Wymagane minimum 4.5:1</span>
        </div>
        <div className="rounded-lg border border-edge bg-surface p-3">
          <span className="eter-label">Kontrast tekstu wtórnego</span>
          <p
            className="mt-1 flex items-center gap-1.5 font-mono text-lg font-bold"
            style={{ color: dimContrast >= 4.5 ? 'var(--eter-success)' : 'var(--eter-danger)' }}
          >
            <Icon name={dimContrast >= 4.5 ? 'tick' : 'warning'} size={16} />
            {dimContrast.toFixed(1)}:1{dimContrast >= 4.5 ? '' : ' — za mało'}
          </p>
          <span className="text-xs text-ink-dim">Podpowiedzi, etykiety, opisy kart</span>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {THEME_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="eter-label">{group.title}</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {group.fields.map((field) => {
                const value = theme[field.key];
                const valid = isHex(value);
                return (
                  <div
                    key={field.key}
                    className="eter-rise rounded-lg border border-edge bg-surface p-2 transition hover:border-ink-dim"
                  >
                    <span className="block text-xs">{field.label}</span>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="color"
                        value={valid ? value : '#000000'}
                        onChange={(e) => update({ [field.key]: e.target.value })}
                        aria-label={`Kolor: ${field.label}`}
                        className="h-8 w-8 cursor-pointer rounded border border-edge bg-bg"
                      />
                      <input
                        value={value}
                        onChange={(e) => update({ [field.key]: e.target.value })}
                        aria-label={`Kod koloru: ${field.label}`}
                        className={[
                          'w-full rounded border bg-bg px-2 py-1 font-mono text-xs',
                          valid ? 'border-edge' : 'border-danger',
                        ].join(' ')}
                      />
                    </div>
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
