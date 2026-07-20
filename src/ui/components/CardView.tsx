import type { Card } from '../../engine/types';
import { categoryColorVar, categoryLabel } from './categoryStyles';

interface CardViewProps {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** Wariant kompaktowy — karty wyłożone na stół. */
  compact?: boolean;
}

/**
 * Karta gry.
 *
 * Kolor krawędzi koduje kategorię, emoji zastępuje ilustrację. Pole `art`
 * przyjmie docelową grafikę bez zmian w tym komponencie.
 */
export function CardView({ card, selected, disabled, onClick, compact }: CardViewProps) {
  const color = categoryColorVar(card.category);
  const interactive = Boolean(onClick) && !disabled;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-pressed={onClick ? Boolean(selected) : undefined}
      className={[
        'group relative flex flex-col rounded-lg border bg-raised text-left transition-transform',
        compact ? 'w-24 gap-0.5 p-2' : 'w-36 gap-1 p-3',
        interactive ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default',
        disabled ? 'opacity-40' : '',
      ].join(' ')}
      style={{
        borderColor: selected ? color : 'var(--eter-edge)',
        borderWidth: selected ? 2 : 1,
        boxShadow: selected ? `0 0 22px -6px ${color}` : undefined,
      }}
    >
      {/* Pasek kategorii — czytelny nawet gdy karta jest zasłonięta */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 rounded-t-lg"
        style={{ background: color }}
      />

      <span className={compact ? 'mt-1 text-xl' : 'mt-1 text-3xl'} aria-hidden="true">
        {card.art}
      </span>

      <span
        className={`font-display font-bold leading-tight ${compact ? 'text-xs' : 'text-sm'}`}
        style={{ color }}
      >
        {card.name}
      </span>

      {!compact && (
        <span className="text-xs leading-snug text-ink-dim">{card.description}</span>
      )}

      <span className="eter-label mt-auto pt-2">{categoryLabel(card.category)}</span>
    </button>
  );
}
