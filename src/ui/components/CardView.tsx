import { useState, type PointerEventHandler } from 'react';
import { useLongPress } from './useLongPress';
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
  /** Przytrzymanie karty — pokazuje ją na cały ekran. */
  onZoom?: () => void;
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
  onZoom,
  beingDragged,
  ...rest
}: CardViewProps) {
  const color = categoryColorVar(card.category);
  const interactive = Boolean(onClick) && !disabled;
  const draggable = Boolean(dragHandlers) && !disabled;
  const hold = useLongPress(() => onZoom?.());
  // Karta z wgraną grafiką pokazuje ją jako awers; przycisk w rogu odwraca na
  // zwykły widok z nazwą i opisem. Nie ruszamy głównego klika ani przeciągania
  // — grafika zachowuje się jak reszta karty (można ją zagrać, przeciągnąć).
  const [showArt, setShowArt] = useState(Boolean(card.image));
  const art = card.image && showArt && !compact;
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

  /**
   * Kontrolka odwracająca kartę (grafika ⇄ szczegóły).
   *
   * `role="button"` na spanie, a nie `<button>`: karta z akcją renderuje się
   * jako `<button>`, a `<button>` w `<button>` to nieprawidłowy HTML —
   * przeglądarki radzą sobie z nim różnie, React ostrzega, a czytnik ekranu
   * gubi wewnętrzny przycisk. Span z rolą jest treścią frazową (wolno mu stać
   * w przycisku), a zachowuje klik i obsługę klawiatury. `stopPropagation`,
   * żeby odwrócenie nie zagrało karty ani nie zaczęło przeciągania.
   */
  const flipControl = (target: boolean, label: string, glyph: IconName) => (
    <span
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        setShowArt(target);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        setShowArt(target);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute bottom-1 right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-edge bg-surface/90 text-ink-dim backdrop-blur transition hover:border-accent hover:text-accent"
    >
      <Icon name={glyph} size={12} />
    </span>
  );

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
      {...(onZoom ? hold : {})}
      // Uchwyty przeciągania i przytrzymania dzielą `onPointerDown`, więc
      // rozlewane obok siebie jeden by drugi nadpisał. Tu wołamy oba.
      onPointerDown={(event) => {
        if (draggable) dragHandlers?.onPointerDown(event);
        if (onZoom) hold.onPointerDown(event);
      }}
      {...rest}
      className={[
        'group relative flex flex-col overflow-hidden rounded-lg border bg-raised text-left transition-transform',
        dealIndex === undefined ? '' : 'eter-deal',
        // Na telefonie karta jest węższa, żeby ręka nie zjadała pół ekranu
        // i cała plansza mieściła się bez przewijania.
        // `shrink-0`: w pasku przewijanym na telefonie karty inaczej ściskałyby
        // się do nieczytelnych pasków zamiast wyjechać poza krawędź.
        'shrink-0 snap-start',
        // Karta wyłożona na ściankę: na telefonie ścianki stoją po trzy w
        // rzędzie (grid-cols-3), więc na ściankę zostaje ~82 px szerokości.
        // Sztywne w-24 (96 px) nie mieściło się i `overflow-hidden` ścianki
        // ucinało kartę z prawej (nazwa, róg) na praktycznie każdym telefonie.
        // Węższa na telefonie, pełne 96 px od `sm` w górę, gdzie ścianki są
        // szerokie. Stała szerokość (nie w-full), żeby element flex nie
        // zapadł się do zera w kurczliwym rodzicu.
        compact ? 'w-20 p-2 pt-2.5 sm:w-24' : 'w-[6.5rem] p-2 pt-2.5 sm:w-36 sm:p-3 sm:pt-3.5',
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
        // `pan-x`: poziome przesunięcie palca oddajemy przeglądarce (przewija
        // pasek ręki w bok), a pionowe zostaje dla nas — karta idzie na
        // ściankę do góry.
        //
        // Wcześniej było `none` — blokowało KAŻDY gest, więc karta dawała się
        // przeciągnąć, ale ręki nie dało się przewinąć w bok na telefonie
        // i część kart była nieosiągalna. `pan-x` godzi oba: w bok scroll,
        // w górę i w dół przeciąganie.
        touchAction: draggable ? 'pan-x' : undefined,
        ...(dealIndex === undefined
          ? {}
          : ({ '--eter-delay': `${dealIndex * 55}ms` } as React.CSSProperties)),
      }}
    >
      {art ? (
        <>
          {/* Awers: wgrana grafika karty. */}
          <img
            src={card.image}
            alt={card.name}
            className="pointer-events-none -m-2 mb-0 h-auto w-[calc(100%+1rem)] sm:-m-3 sm:mb-0 sm:w-[calc(100%+1.5rem)]"
            style={{ objectFit: 'contain' }}
          />
          {/* Odwrócenie na szczegóły — patrz `flipControl`. */}
          {flipControl(false, 'Pokaż szczegóły karty', 'undo')}
        </>
      ) : (
        <>
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

          {/* Karta ma grafikę, ale pokazujemy szczegóły — wrót do niej. */}
          {card.image && !compact && flipControl(true, 'Pokaż grafikę karty', 'lens')}
        </>
      )}
    </Element>
  );
}
