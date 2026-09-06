import { DEFAULT_ROUND_CARDS, MAX_ROUND_CARDS, liczbaKartRund } from '../data/roundCards';
import { TextField } from '../ui/controls/Field';

interface RoundCardsEditorProps {
  count?: number;
  onChange: (count: number) => void;
}

/**
 * Karty rund — ile wydrukować.
 *
 * Adam: „11 kart, na każdej jedna cyfra". Sam licznik przy stole jest prosty
 * (cyfry 1…n), więc jedyne, co redaktor ustawia, to ile ich ma być — np. gdy
 * zespół zdecyduje, że najwyższy poziom to 8 rund, nie 11.
 */
export function RoundCardsEditor({ count, onChange }: RoundCardsEditorProps) {
  const ile = liczbaKartRund(count);

  return (
    <section className="mt-8 border-t border-edge pt-6" aria-label="Karty rund">
      <h3 className="font-display text-lg font-bold">Karty rund</h3>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Licznik rund przy stole: karty z cyframi 1…{ile}. Przed misją gracze
        ustalają, ile rund dają sobie na problem, i po każdej odwracają kolejną
        kartę. W grze na ekranie liczbę rund ustawia się w Zasadach.
      </p>
      <div className="mt-3 max-w-xs">
        <TextField
          label="Ile kart wydrukować"
          type="number"
          min={1}
          max={MAX_ROUND_CARDS}
          value={String(ile)}
          onChange={(e) => {
            // Puste pole w trakcie kasowania → wracamy do domyślnych 11, nie
            // do NaN ani zera (zero kart rund to gra bez licznika).
            const n = Number(e.target.value);
            onChange(Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_ROUND_CARDS) : DEFAULT_ROUND_CARDS);
          }}
        />
      </div>
    </section>
  );
}
