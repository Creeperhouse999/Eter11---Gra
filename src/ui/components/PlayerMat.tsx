import type { Character, Player } from '../../engine/types';
import { fulfillmentProgress } from '../../engine/scoring';
import { Icon, type IconName } from '../icons/Icon';
import { CardView } from './CardView';
import { categoryColorVar, categoryLabel } from './categoryStyles';

interface PlayerMatProps {
  player: Player;
  character?: Character;
  /** Czy to gracz, którego jest ruch. */
  active?: boolean;
  /** Odkrywa karty na macie — przy stole widoczne są tylko własne. */
  revealed?: boolean;
  onCardClick?: (cardId: string) => void;
  selectedCardId?: string | null;
  /** Blokuje karty, gdy gracz użył już karty z postaci w tej misji. */
  cardsDisabled?: boolean;
  compact?: boolean;
}

/** Miejsca na karcie postaci — po jednym na kategorię, w stałej kolejności. */
const SLOTS: Array<{ category: string; icon: IconName }> = [
  { category: 'psychological', icon: 'brain' },
  { category: 'digital', icon: 'chip' },
  { category: 'social', icon: 'handshake' },
  { category: 'mentor', icon: 'compass' },
  { category: 'talent', icon: 'star' },
];

/**
 * Karta postaci gracza — jego miejsce przy stole.
 *
 * Ma zwizualizowane miejsca na karty zdobyte w misjach (po jednym na
 * kategorię) oraz osobny pas na karty doświadczenia. Puste miejsce jest
 * obrysem, więc dziecko widzi, czego mu jeszcze brakuje do spełnienia.
 */
export function PlayerMat({
  player,
  character,
  active,
  revealed,
  onCardClick,
  selectedCardId,
  cardsDisabled,
  compact,
}: PlayerMatProps) {
  const progress = fulfillmentProgress(player);
  const solveCount = player.experience.filter((e) => e.kind === 'solve').length;
  const shareCount = player.experience.filter((e) => e.kind === 'share').length;

  return (
    <section
      aria-label={`Karta postaci: ${player.name}`}
      className={[
        'rounded-xl border bg-surface p-3 transition',
        active ? 'border-accent' : 'border-edge',
      ].join(' ')}
      style={active ? { boxShadow: '0 0 24px -10px var(--eter-accent)' } : undefined}
    >
      <header className="flex items-center gap-2.5">
        <span className={active ? 'text-accent' : 'text-ink-dim'}>
          <Icon name={(character?.icon as IconName) ?? 'compass'} size={compact ? 22 : 26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-bold leading-tight">{player.name}</p>
          <p className="truncate text-xs text-ink-dim">{character?.name ?? 'Postać'}</p>
        </div>
        {active && <span className="eter-label text-accent">Twój ruch</span>}
      </header>

      {/* Miejsca na karty zdobyte — po jednym na kategorię */}
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {SLOTS.map((slot) => {
          const card = player.mat.find((c) => c.category === slot.category);
          const color = categoryColorVar(slot.category as never);
          const received = card && player.receivedCardIds.includes(card.id);

          if (!card) {
            return (
              <div
                key={slot.category}
                title={`Puste miejsce: ${categoryLabel(slot.category as never)}`}
                className="flex aspect-[3/4] flex-col items-center justify-center rounded border border-dashed border-edge text-ink-dim"
              >
                <Icon name={slot.icon} size={compact ? 13 : 16} />
              </div>
            );
          }

          if (!revealed) {
            return (
              <div
                key={slot.category}
                title={categoryLabel(slot.category as never)}
                className="flex aspect-[3/4] items-center justify-center rounded border"
                style={{ borderColor: color, background: 'var(--eter-raised)', color }}
              >
                <Icon name={slot.icon} size={compact ? 13 : 16} />
              </div>
            );
          }

          return (
            <div key={slot.category} className="relative">
              <CardView
                card={card}
                compact
                disabled={cardsDisabled}
                selected={selectedCardId === card.id}
                onClick={onCardClick ? () => onCardClick(card.id) : undefined}
              />
              {received && (
                <span
                  title="Karta od innego gracza"
                  className="absolute -right-1 -top-1 rounded-full bg-accent p-0.5 text-bg"
                >
                  <Icon name="handshake" size={10} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Pas doświadczenia — osobno za rozwiązanie i za uczenie innych */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-edge pt-2.5">
        <span className="flex items-center gap-1.5" title="Doświadczenie za rozwiązane problemy">
          <Icon name="medal" size={14} className="text-accent" />
          <span className="font-mono text-sm font-bold">{solveCount}</span>
          <span className="eter-label">za misje</span>
        </span>

        <span className="flex items-center gap-1.5" title="Doświadczenie za przekazane karty">
          <Icon name="handsOpen" size={14} className="text-accent-2" />
          <span className="font-mono text-sm font-bold">{shareCount}</span>
          <span className="eter-label">za uczenie</span>
        </span>

        {progress.sharedWithOthers && progress.receivedFromOthers && (
          <span className="ml-auto flex items-center gap-1 text-xs text-success">
            <Icon name="tick" size={12} />
            wymiana
          </span>
        )}
      </div>
    </section>
  );
}
