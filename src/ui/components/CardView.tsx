import type { PointerEventHandler } from 'react';
import { FAMILY_LABELS } from '../../data/families';
import type { Card } from '../../engine/types';
import { Icon, type IconName } from '../icons/Icon';
import { categoryColorVar, categoryLabel } from './categoryStyles';

/**
 * Uchwyt rozpoczynający przeciąganie. Dalsze śledzenie gestu odbywa się
 * na oknie — patrz useCardDrag.
 */
export interface CardDragHandlers {
  onPointerDown: PointerEventHandler<HTMLElement>;
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
        borderColor: selected ? (familyColor ?? color) : 'var(--eter-edge)',
        borderWidth: selected ? 2 : 1,
        boxShadow: selected ? `0 0 22px -6px ${familyColor ?? color}` : undefined,
        // Bez tego przeciąganie palcem przewija stronę zamiast podnosić kartę.
        touchAction: draggable ? 'none' : undefined,
        ...(dealIndex === undefined
          ? {}
          : ({ '--eter-delay': `${dealIndex * 55}ms` } as React.CSSProperties)),
      }}
    >
      {/*
        Pasek niesie kolor rodziny — to on decyduje, do której ścianki karta
        pasuje, więc musi być widoczny nawet gdy karty leżą na sobie w wachlarzu.
        Kategoria schodzi do kropki: jest już zapisana w ikonie i podpisie.
      */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5 rounded-t-lg"
        style={{ background: familyColor ?? color }}
      />

      <span className="mt-2" style={{ color: familyColor ?? color }}>
        <Icon name={card.icon as IconName} size={compact ? 22 : 32} />
      </span>

      <span
        className={`font-display font-bold leading-tight ${compact ? 'text-xs' : 'text-sm'}`}
        style={{ color: familyColor ?? color }}
      >
        {card.name}
      </span>

      {!compact && (
        <span className="text-xs leading-snug text-ink-dim">{card.description}</span>
      )}

      {/*
        Podpis w kolorze rodziny — ten sam kolor co pasek u góry, więc nawet
        gdy karta jest częściowo zasłonięta, widać, do której ścianki pasuje.
      */}
      <span className="eter-label mt-auto pt-2" style={{ color: familyColor ?? color }}>
        {categoryLabel(card.category)}
        {card.family && <> · {FAMILY_LABELS[card.family]}</>}
      </span>
    </button>
  );
}
