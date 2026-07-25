import { useState } from 'react';
import {
  applyTheme,
  DEFAULT_THEME,
  LIGHT_THEME,
  THEME_GROUPS,
  type ThemeColors,
  type ThemeMode,
} from '../data/theme';
import { Button } from '../ui/controls/Button';
import { ColorPicker } from '../ui/controls/ColorPicker';
import { Icon } from '../ui/icons/Icon';

interface ThemeEditorProps {
  /** Kolory trybu ciemnego. */
  theme: ThemeColors;
  /** Kolory trybu jasnego (gdy brak, edytor startuje od wbudowanego). */
  themeLight?: ThemeColors;
  /** Zapisuje zmieniony zestaw właściwego trybu. */
  onChange: (mode: ThemeMode, theme: ThemeColors) => void;
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
export function ThemeEditor({ theme, themeLight, onChange }: ThemeEditorProps) {
  // Który tryb edytujemy. Podgląd na żywo pokazuje właśnie ten tryb.
  const [mode, setMode] = useState<ThemeMode>('dark');
  const editing = mode === 'light' ? themeLight ?? LIGHT_THEME : theme;
  const fallback = mode === 'light' ? LIGHT_THEME : DEFAULT_THEME;

  // Tryb, w którym jest teraz strona (z przełącznika jasny/ciemny). Podgląd
  // na żywo pokazujemy TYLKO wtedy, gdy edytujesz właśnie ten tryb — inaczej
  // edycja jasnego przy ciemnej stronie rozjeżdżałaby jej wygląd. Sam wybór
  // „co edytuję" nie zmienia motywu strony.
  const pageMode: ThemeMode =
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

  const update = (patch: Partial<ThemeColors>) => {
    const next = { ...editing, ...patch };
    onChange(mode, next);
    if (mode === pageMode) applyTheme(next);
  };

  const switchMode = (next: ThemeMode) => {
    // Zmienia tylko to, CO edytujesz — nie przestawia motywu strony.
    setMode(next);
  };

  // Kolory już użyte w grze — najczęściej chce się trafić w istniejący ton.
  const palette = Array.from(new Set(Object.values(editing).filter(isHex)));

  const inkContrast = contrastRatio(editing.ink, editing.surface);
  const dimContrast = contrastRatio(editing.inkDim, editing.surface);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Kolory</h2>
        <Button icon="undo" size="sm" onClick={() => update(fallback)}>
          Przywróć domyślne
        </Button>
      </div>

      {/* Przełącznik trybu: edytujesz osobno kolory ciemnego i jasnego. */}
      <div className="mt-3 inline-flex rounded-lg border border-edge p-0.5" role="tablist">
        {(['dark', 'light'] as ThemeMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={[
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition',
              mode === m ? 'bg-accent text-bg font-semibold' : 'text-ink-dim hover:text-ink',
            ].join(' ')}
          >
            <Icon name={m === 'light' ? 'sun' : 'moon'} size={14} />
            {m === 'light' ? 'Jasny' : 'Ciemny'}
          </button>
        ))}
      </div>

      <p className="mt-2 text-sm text-ink-dim">
        Edytujesz kolory trybu <strong>{mode === 'light' ? 'jasnego' : 'ciemnego'}</strong>.{' '}
        {/* Podgląd na żywo działa TYLKO dla trybu, w którym jest teraz strona
            (update woła applyTheme jedynie przy mode === pageMode). Tekst musiał
            to odzwierciedlać — dawniej mówił „widać natychmiast" zawsze, więc
            edycja jasnego przy ciemnej stronie wyglądała, jakby edytor nie
            działał: kolory się zmieniały w polach, a strona ani drgnęła. */}
        {mode === pageMode ? (
          'Zmiany widać natychmiast.'
        ) : (
          <>
            Podgląd na żywo działa teraz w trybie{' '}
            <strong>{pageMode === 'light' ? 'jasnym' : 'ciemnym'}</strong> — przełącz
            stronę na ten tryb, żeby od razu zobaczyć zmiany.
          </>
        )}{' '}
        Zapisz, żeby zobaczyli je gracze.
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
              {group.fields.map((field) => (
                <div
                  key={field.key}
                  className="eter-rise rounded-lg border border-edge bg-surface p-2 transition hover:border-ink-dim"
                >
                  <ColorPicker
                    label={field.label}
                    value={editing[field.key]}
                    presets={palette}
                    onChange={(color) => update({ [field.key]: color })}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
