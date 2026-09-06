import {
  DEFAULT_EXPERIENCE_CARDS,
  EXPERIENCE_KIND_LABELS,
  MAX_EXPERIENCE_COPIES,
  kartyDoswiadczen,
  liczbaKartDoswiadczen,
  type ExperienceCardDef,
} from '../data/experienceCards';
import { Button } from '../ui/controls/Button';
import { TextArea, TextField } from '../ui/controls/Field';

interface ExperienceCardsEditorProps {
  cards?: ExperienceCardDef[];
  onChange: (cards: ExperienceCardDef[]) => void;
}

/**
 * Karty doświadczeń — treść do wydruku, edytowalna w zakładce „Karty".
 *
 * Adam: „dodaj do zakładki »Karty« kategorię karty doświadczeń". To osobna
 * sekcja pod talią, nie kolejna kategoria w liście kart: te kartoniki nie
 * pasują do żadnej ścianki i nie idą do talii — są nagrodą, którą dziecko
 * dostaje do ręki przy stole.
 *
 * Rodzaje są stałe (trzy — tak jak w silniku i w instrukcji); redaktor zmienia
 * tytuł, zdanie i liczbę sztuk.
 */
export function ExperienceCardsEditor({ cards, onChange }: ExperienceCardsEditorProps) {
  const lista = kartyDoswiadczen(cards);

  const update = (kind: ExperienceCardDef['kind'], patch: Partial<ExperienceCardDef>) => {
    onChange(lista.map((d) => (d.kind === kind ? { ...d, ...patch } : d)));
  };

  const zmieniono = JSON.stringify(lista) !== JSON.stringify(DEFAULT_EXPERIENCE_CARDS);

  return (
    <section className="mt-8 border-t border-edge pt-6" aria-label="Karty doświadczeń">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-bold">Karty doświadczeń</h3>
        <span className="font-mono text-xs text-ink-dim">
          do druku: {liczbaKartDoswiadczen(lista)} szt.
        </span>
      </div>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Nagrody do ręki przy grze przy stole. Nie trafiają do talii ani na
        ścianki — w grze na ekranie doświadczenie liczy się samo. Wydruk jest
        w „Drukuj karty", pod kartami do zagrania.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {lista.map((def) => (
          <div key={def.kind} className="rounded-xl border border-edge bg-surface p-3">
            <span className="eter-label text-[10px]">{EXPERIENCE_KIND_LABELS[def.kind]}</span>
            <div className="mt-2">
              <TextField
                label="Tytuł na karcie"
                value={def.title}
                onChange={(e) => update(def.kind, { title: e.target.value })}
              />
            </div>
            <div className="mt-2">
              <TextArea
                label="Za co się ją dostaje"
                value={def.text}
                onChange={(e) => update(def.kind, { text: e.target.value })}
                rows={3}
              />
            </div>
            <div className="mt-2">
              <TextField
                label="Ile sztuk wydrukować"
                type="number"
                min={0}
                max={MAX_EXPERIENCE_COPIES}
                value={String(def.count)}
                onChange={(e) => {
                  // Pole liczbowe potrafi oddać pusty ciąg w trakcie kasowania
                  // — zero, nie NaN, żeby wydruk nie wywrócił się na
                  // `Array.from({ length: NaN })`.
                  const n = Math.max(0, Math.min(MAX_EXPERIENCE_COPIES, Number(e.target.value) || 0));
                  update(def.kind, { count: n });
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {zmieniono && (
        <div className="mt-3">
          <Button size="sm" variant="ghost" icon="undo" onClick={() => onChange(DEFAULT_EXPERIENCE_CARDS)}>
            Przywróć domyślne
          </Button>
        </div>
      )}
    </section>
  );
}
