import type { PointerEventHandler } from 'react';
import { FAMILY_LABELS } from '../../data/families';
import type { Card } from '../../engine/types';
import { Icon, type IconName } from '../icons/Icon';
import { categoryColorVar, categoryLabel } from './categoryStyles';

/** Uchwyty przeciągania z `useCardDrag` — przekazywane bez zmian. */
export interface CardDragHandlers {
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
}

interface CardViewProps {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** Wariant kompaktowy — karty wyłożone na stół. */
  compact?: boolean;
  /** Kolejność w rozdaniu — karty wchodzą jedna po drugiej. */
  dealIndex?: number;
  /** Włącza przeciąganie tej karty. */
  dragHandlers?: CardDragHandlers;
  /** Ta karta jest właśnie przeciągana — zostaje po niej ślad. */
  beingDragged?: boolean;
}

/**
 * Karta gry.
 *
 * Kolor krawędzi koduje kategorię, kropka pokazuje rodzinę (kolor wymagany
 * przez ścianki). Kartę można przeciągnąć na ściankę albo kliknąć i wybrać
 * ściankę — obie drogi prowadzą do tego samego ruchu.
 */
export function CardView({
  card,
  selected,
  disabled,
  onClick,
  compact,
  dealIndex,
  dragHandlers,
  beingDragged,
}: CardViewProps) {
  const color = categoryColorVar(card.category);
  const interactive = Boolean(onClick) && !disabled;
  const draggable = Boolean(dragHandlers) && !disabled;
  const familyColor = card.family ? `var(--eter-family-${card.family})` : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-pressed={onClick ? Boolean(selected) : undefined}
      {...(draggable ? dragHandlers : {})}
      className={[
        'group relative flex flex-col rounded-lg border bg-raised text-left transition-transform',
        dealIndex === undefined ? '' : 'eter-deal',
        compact ? 'w-24 gap-0.5 p-2' : 'w-36 gap-1 p-3',
        draggable ? 'cursor-grab active:cursor-grabbing' : '',
        interactive && !draggable ? 'cursor-pointer' : '',
        interactive && !beingDragged ? 'hover:-translate-y-1' : '',
        disabled ? 'opacity-40' : '',
        beingDragged ? 'opacity-30' : '',
      ].join(' ')}
      style={{
        borderColor: selected ? color : 'var(--eter-edge)',
        borderWidth: selected ? 2 : 1,
        boxShadow: selected ? `0 0 22px -6px ${color}` : undefined,
        // Bez tego przeciąganie palcem przewija stronę zamiast podnosić kartę.
        touchAction: draggable ? 'none' : undefined,
        ...(dealIndex === undefined
          ? {}
          : ({ '--eter-delay': `${dealIndex * 55}ms` } as React.CSSProperties)),
      }}
    >
      {/* Pasek kategorii — czytelny nawet gdy karta jest zasłonięta */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 rounded-t-lg"
        style={{ background: color }}
      />

      {/* Kropka rodziny — kolor, którego szukają ścianki */}
      {familyColor && (
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-2 h-2.5 w-2.5 rounded-full border"
          style={{ background: familyColor, borderColor: 'var(--eter-bg)' }}
        />
      )}

      <span className="mt-1.5" style={{ color }}>
        <Icon name={card.icon as IconName} size={compact ? 22 : 32} />
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

      <span className="eter-label mt-auto pt-2">
        {categoryLabel(card.category)}
        {card.family && (
          <span style={{ color: familyColor }}> · {FAMILY_LABELS[card.family]}</span>
        )}
      </span>
    </button>
  );
}
