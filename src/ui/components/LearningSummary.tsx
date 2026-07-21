import type { GameState, SlotKey } from '../../engine/types';
import { CATEGORY_ORDER } from '../../data/categories';
import { categoryColorVar, categoryLabel } from './categoryStyles';
import { counted } from '../plural';
import { Icon, type IconName } from '../icons/Icon';
import { slotIcon } from './categoryStyles';

interface LearningSummaryProps {
  state: GameState;
}

/**
 * Co drużyna faktycznie przećwiczyła przez całą grę.
 *
 * Reszta ekranu końcowego liczy punkty i tytuły — czyli mówi, jak dobrze
 * poszło. Ta sekcja mówi, CZEGO było, i to jest jedyny powód, dla którego
 * ta gra istnieje: nie chodzi o wynik, tylko o to, żeby dziecko wyszło od
 * stołu z nazwami kompetencji w głowie.
 *
 * Liczymy karty leżące na kartach postaci, bo tylko te ktoś świadomie
 * wybrał i zatrzymał. Karty zagrane i odrzucone przeszły przez ręce, ale
 * nikt ich nie „nauczył się" w sensie tej gry.
 */
export function LearningSummary({ state }: LearningSummaryProps) {
  const counts = new Map<SlotKey, number>();

  for (const player of state.players) {
    for (const card of player.mat) {
      const key = card.category as SlotKey;
      if (!CATEGORY_ORDER.includes(key)) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return null;

  const most = CATEGORY_ORDER.reduce((best, key) =>
    (counts.get(key) ?? 0) > (counts.get(best) ?? 0) ? key : best,
  );
  const highest = counts.get(most) ?? 0;

  const solved = state.solvedProblems.length;

  return (
    <section
      aria-label="Czego się nauczyliście"
      className="mt-6 rounded-xl border border-edge bg-surface p-4"
    >
      <h2 className="font-display text-lg font-bold">Czego się nauczyliście</h2>

      <p className="mt-1 text-sm leading-relaxed text-ink-dim">
        Przez całą grę zatrzymaliście {counted(total, 'kartę', 'karty', 'kart')} na
        kartach postaci
        {solved > 0 && (
          <> i rozwiązaliście {counted(solved, 'problem', 'problemy', 'problemów')}</>
        )}
        .
        {highest > 1 && (
          <>
            {' '}
            Najwięcej było kompetencji z kategorii{' '}
            <span style={{ color: categoryColorVar(most) }}>{categoryLabel(most)}</span>.
          </>
        )}
      </p>

      <ul className="mt-3 space-y-1.5">
        {CATEGORY_ORDER.map((key) => {
          const count = counts.get(key) ?? 0;
          const share = total > 0 ? (count / total) * 100 : 0;
          const color = categoryColorVar(key);

          return (
            <li key={key} className="flex items-center gap-2.5">
              <span className="shrink-0" style={{ color }}>
                <Icon name={slotIcon(key) as IconName} size={16} />
              </span>
              <span className="w-28 shrink-0 truncate text-xs">{categoryLabel(key)}</span>

              {/* Pasek zamiast samej liczby: dziecko widzi proporcję, zanim
                  przeczyta cyfrę, a to właśnie proporcja jest tu treścią. */}
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-raised">
                <span
                  className="block h-full rounded-full transition-all"
                  style={{ width: `${share}%`, background: color }}
                />
              </span>

              <span className="w-6 shrink-0 text-right font-mono text-xs text-ink-dim">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
