import type { PointerEventHandler } from 'react';
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
  /** Podwójne kliknięcie — skrót zagrania bez wybierania ścianki. */
  onDoubleClick?: () => void;
  /** Wariant kompaktowy — karty wyłożone na stół. */
  compact?: boolean;
  /** Kolejność w rozdaniu — karty wchodzą jedna po drugiej. */
  dealIndex?: number;
  /** Włącza przeciąganie tej karty. */
  dragHandlers?: CardDragHandlers;
  /** Ta karta jest właśnie przeciągana — zostaje po niej ślad. */
  beingDragged?: boolean;
  /** Znacznik dla samouczka — podświetla dokładnie tę kartę. */
  'data-tour'?: string;
}

/**
 * Karta gry.
 *
 * Układ od góry: pasek rodziny, kategoria, ikona, nazwa, opis. Kolor rodziny
 * niesie pasek i nazwa — to rodzina decyduje, do której ścianki karta pasuje,
 * więc musi być widoczna także wtedy, gdy karty leżą na sobie w wachlarzu.
 *
 * Karta ma stałą szerokość, a nazwy bywają długie („Rozwiązywanie problemów"),
 * dlatego wszystkie teksty łamią wyrazy i mają ograniczoną liczbę linii —
 * bez tego wychodziły poza krawędź.
 */
export function CardView({
  card,
  selected,
  disabled,
  onClick,
  onDoubleClick,
  compact,
  dealIndex,
  dragHandlers,
  beingDragged,
  ...rest
}: CardViewProps) {
  const color = categoryColorVar(card.category);
  const interactive = Boolean(onClick) && !disabled;
  const draggable = Boolean(dragHandlers) && !disabled;
  const familyColor = card.family ? `var(--eter-family-${card.family})` : undefined;
  const accent = familyColor ?? color;

  /**
   * Karta bez akcji nie jest przyciskiem.
   *
   * Karty leżące na zamkniętej ściance renderowały się jako `<button>`
   * wewnątrz `<button>` samej ścianki. To nieprawidłowy HTML: przeglądarki
   * radzą sobie z nim różnie, a wewnętrzny przycisk potrafił połykać
   * kliknięcia kierowane do ścianki.
   */
  const Element = onClick || draggable ? 'button' : 'div';

  return (
    <Element
      {...(Element === 'button'
        ? {
            type: 'button' as const,
            onClick,
            onDoubleClick,
            disabled: disabled || !onClick,
            'aria-pressed': onClick ? Boolean(selected) : undefined,
          }
        : {})}
      {...(draggable ? dragHandlers : {})}
      {...rest}
      className={[
        'group relative flex flex-col overflow-hidden rounded-lg border bg-raised text-left transition-transform',
        dealIndex === undefined ? '' : 'eter-deal',
        // Na telefonie karta jest węższa, żeby ręka nie zjadała pół ekranu
        // i cała plansza mieściła się bez przewijania.
        compact ? 'w-24 p-2 pt-2.5' : 'w-[6.5rem] p-2 pt-2.5 sm:w-36 sm:p-3 sm:pt-3.5',
        draggable ? 'cursor-grab active:cursor-grabbing' : '',
        interactive && !draggable ? 'cursor-pointer' : '',
        interactive && !beingDragged ? 'hover:-translate-y-1' : '',
        disabled ? 'opacity-40' : '',
        beingDragged ? 'opacity-30' : '',
      ].join(' ')}
      style={{
        borderColor: selected ? accent : 'var(--eter-edge)',
        borderWidth: selected ? 2 : 1,
        boxShadow: selected ? `0 0 22px -6px ${accent}` : undefined,
        // Bez tego przeciąganie palcem przewija stronę zamiast podnosić kartę.
        touchAction: draggable ? 'none' : undefined,
        ...(dealIndex === undefined
          ? {}
          : ({ '--eter-delay': `${dealIndex * 55}ms` } as React.CSSProperties)),
      }}
    >
      {/* Pasek rodziny — kolor, którego szukają ścianki problemu */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: accent }}
      />

      {/* Kategoria nad nazwą — mówi, do której ścianki karta w ogóle należy */}
      <span
        className="eter-label truncate leading-tight"
        style={{ color: accent, fontSize: compact ? '0.5625rem' : undefined }}
      >
        {categoryLabel(card.category)}
      </span>

      <span className="mt-1" style={{ color: accent }}>
        <Icon name={card.icon as IconName} size={compact ? 20 : 28} />
      </span>

      <span
        className={[
          'mt-1 font-display font-bold leading-tight hyphens-auto',
          compact ? 'line-clamp-3 text-[0.6875rem]' : 'line-clamp-2 text-sm',
        ].join(' ')}
        style={{ color: accent, overflowWrap: 'anywhere' }}
        lang="pl"
      >
        {card.name}
      </span>

      {!compact && (
        <span
          className="mt-1 line-clamp-3 text-xs leading-snug text-ink-dim"
          style={{ overflowWrap: 'anywhere' }}
        >
          {card.description}
        </span>
      )}
    </Element>
  );
}
