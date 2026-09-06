import {
  DEFAULT_FAMILY_SYMBOLS,
  SYMBOL_CHOICES,
  SYMBOL_LABELS,
  symbolRodziny,
  type FamilySymbols,
} from '../data/familySymbols';
import { FAMILY_COLORS, FAMILY_IDS, FAMILY_LABELS } from '../data/families';
import { Icon, type IconName } from '../ui/icons/Icon';
import { ImageUpload } from './ImageUpload';

interface FamilySymbolEditorProps {
  symbols?: Partial<FamilySymbols>;
  onChange: (symbols: Partial<FamilySymbols>) => void;
}

/**
 * Symbole rodzin — znaczki dla graczy, którzy nie rozróżniają kolorów.
 *
 * Adam: „w panelu zrób edytowalny system wymiany tych symboli z listy,
 * z możliwością też wgrania grafiki symbolu".
 *
 * Symbol jest ten sam we wszystkich kategoriach — w odróżnieniu od ikon rodzin
 * wyżej, które opowiadają, czym rodzina JEST („Siła wewnętrzna" ma tarczę).
 * Ten mówi tylko jedno: „to jest czerwona". Dlatego edytuje się go raz,
 * a nie dwadzieścia razy.
 */
export function FamilySymbolEditor({ symbols, onChange }: FamilySymbolEditorProps) {
  const ustaw = (family: string, symbol: string) => {
    onChange({ ...symbols, [family]: symbol });
  };

  return (
    <section className="mt-4 rounded-xl border border-accent/40 bg-surface p-4">
      <h3 className="font-display text-lg font-bold">Symbole kolorów</h3>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Znaczek na górnej krawędzi każdej karty, ten sam we wszystkich
        kategoriach. Dzięki niemu dziecko, które myli kolory, rozpozna rodzinę
        po kształcie — a kolor rodziny decyduje, do której ścianki karta pasuje.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FAMILY_IDS.map((family) => {
          const wybrany = symbolRodziny(family, symbols);
          const kolor = FAMILY_COLORS[family];
          const wgrany = wybrany.startsWith('url:');

          return (
            <div key={family} className="rounded-xl border border-edge bg-surface p-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded"
                  style={{ background: kolor, color: 'var(--eter-bg)' }}
                >
                  <Icon name={wybrany as IconName} size={16} />
                </span>
                <span className="font-display text-sm font-bold">
                  {FAMILY_LABELS[family]}
                </span>
                {wybrany !== DEFAULT_FAMILY_SYMBOLS[family] && (
                  <button
                    type="button"
                    onClick={() => ustaw(family, DEFAULT_FAMILY_SYMBOLS[family])}
                    className="ml-auto text-xs text-ink-dim underline transition hover:text-ink"
                  >
                    Przywróć domyślny
                  </button>
                )}
              </div>

              {/* Kształty z zestawu — klik zamiast listy rozwijanej, bo wybór
                  jest wzrokowy: liczy się sylwetka, nie nazwa. */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SYMBOL_CHOICES.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    aria-label={SYMBOL_LABELS[symbol]}
                    aria-pressed={wybrany === symbol}
                    onClick={() => ustaw(family, symbol)}
                    className={[
                      'flex h-9 w-9 items-center justify-center rounded-lg border transition',
                      wybrany === symbol
                        ? 'border-accent text-accent'
                        : 'border-edge text-ink-dim hover:border-ink-dim hover:text-ink',
                    ].join(' ')}
                  >
                    <Icon name={symbol as IconName} size={16} />
                  </button>
                ))}
              </div>

              {/* Własna grafika — Adam poprosił o nią wprost. Wgrany plik
                  zapisujemy jako `url:…`, tak samo jak ikony rodzin. */}
              <div className="mt-2">
                <ImageUpload
                  value={wgrany ? [wybrany.slice(4)] : []}
                  onChange={(urls) =>
                    ustaw(
                      family,
                      urls[0] ? `url:${urls[0]}` : DEFAULT_FAMILY_SYMBOLS[family],
                    )
                  }
                  // Ten sam folder co ikony rodzin — to ten sam rodzaj pliku,
                  // a reguły Storage dopuszczają zamkniętą listę katalogów.
                  folder="icons"
                  max={1}
                  namePrefix={`symbol-${family}`}
                  label="Własna grafika"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
