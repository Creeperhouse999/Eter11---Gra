import type { Character, Player } from '../../engine/types';
import { fulfillmentProgress } from '../../engine/scoring';
import { Icon, type IconName } from '../icons/Icon';
import { categoryColorVar, categoryLabel } from './categoryStyles';

interface PlayerMatProps {
  player: Player;
  character?: Character;
  /** Czy to gracz, którego jest ruch. */
  active?: boolean;
  /** Odkrywa karty na macie — przy stole widoczne są tylko własne. */
  revealed?: boolean;
  onCardClick?: (cardId: string) => void;
  /**
   * Podwójne kliknięcie zagrywa kartę z maty od razu, tak samo jak kartę
   * z ręki — inaczej skrót działałby tylko w połowie miejsc, w których
   * gracz trzyma karty.
   */
  onCardDoubleClick?: (cardId: string) => void;
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
  onCardDoubleClick,
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
        'overflow-hidden rounded-xl border bg-surface p-3 transition',
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

      {/*
        Miejsca na karty zdobyte — po jednym na kategorię.
        Siatka skaluje się do szerokości kolumny: przy 240 px pięć kart
        po 96 px nie zmieściłoby się i byłyby obcinane.
      */}
      <div className="mt-3 grid grid-cols-5 gap-1">
        {SLOTS.map((slot) => {
          // Gracz może zebrać kilka kart tej samej kategorii przez wiele
          // misji — pokazujemy wszystkie, bo inaczej znikałyby bez śladu.
          const cards = player.mat.filter((c) => c.category === slot.category);
          const card = cards[0];
          const color = categoryColorVar(slot.category as never);

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
                title={`${categoryLabel(slot.category as never)}: ${cards.length}`}
                className="relative flex aspect-[3/4] items-center justify-center rounded border"
                style={{ borderColor: color, background: 'var(--eter-raised)', color }}
              >
                <Icon name={slot.icon} size={compact ? 13 : 16} />
                {cards.length > 1 && (
                  <span className="absolute bottom-0 right-0.5 font-mono text-[9px]">
                    {cards.length}
                  </span>
                )}
              </div>
            );
          }

          return (
            <div key={slot.category} className="flex flex-col gap-1">
              {cards.map((matCard) => {
                const fromOther = player.receivedCardIds.includes(matCard.id);
                const familyColor = matCard.family
                  ? `var(--eter-family-${matCard.family})`
                  : color;

                return (
                  <div key={matCard.id} className="relative">
                    <button
                      type="button"
                      title={`${matCard.name} — ${categoryLabel(matCard.category)}`}
                      disabled={cardsDisabled || !onCardClick}
                      onClick={onCardClick ? () => onCardClick(matCard.id) : undefined}
                      onDoubleClick={
                        onCardDoubleClick ? () => onCardDoubleClick(matCard.id) : undefined
                      }
                      className={[
                        'flex aspect-[3/4] w-full flex-col items-center justify-center gap-0.5',
                        'overflow-hidden rounded border p-1 text-center transition',
                        cardsDisabled ? 'opacity-40' : '',
                        onCardClick && !cardsDisabled ? 'cursor-pointer hover:brightness-125' : '',
                      ].join(' ')}
                      style={{
                        borderColor:
                          selectedCardId === matCard.id ? familyColor : 'var(--eter-edge)',
                        borderWidth: selectedCardId === matCard.id ? 2 : 1,
                        background: 'var(--eter-raised)',
                        color: familyColor,
                      }}
                    >
                      <Icon name={matCard.icon as IconName} size={compact ? 13 : 16} />
                      {/* Przy pięciu kolumnach na telefonie slot ma ~52 px,
                          więc nazwa schodziła do 8 px — nieczytelnej plamy.
                          Zostaje ikona i kolor, a pełna nazwa jest w `title`
                          przycisku wyżej. */}
                      <span className="hidden line-clamp-2 text-[8px] leading-tight sm:line-clamp-2 sm:block">
                        {matCard.name}
                      </span>
                    </button>

                    {fromOther && (
                      <span
                        title="Karta od innego gracza"
                        className="absolute -right-0.5 -top-0.5 rounded-full bg-accent p-0.5 text-bg"
                      >
                        <Icon name="handshake" size={8} />
                      </span>
                    )}
                  </div>
                );
              })}
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

        {/* Postęp do spełnienia. Bez niego cel był niewidzialny: gracz nie
            wiedział, ilu warunków mu brakuje ani których, więc trafiał w
            spełnienie przypadkiem albo wcale. */}
        {(() => {
          const done = Object.values(progress).filter(Boolean).length;
          const total = Object.values(progress).length;
          const complete = done === total;

          return (
            <span
              className="ml-auto flex items-center gap-1 text-xs"
              style={{ color: complete ? 'var(--eter-success)' : 'var(--eter-ink-dim)' }}
              title={
                complete
                  ? 'Spełnienie osiągnięte'
                  : `Do spełnienia brakuje ${total - done} z ${total} warunków: ` +
                    'karta z każdej kategorii, karta oddana i otrzymana, ' +
                    'doświadczenie za misję i za uczenie.'
              }
            >
              <Icon name={complete ? 'tick' : 'heart'} size={12} />
              <span className="font-mono">
                {done}/{total}
              </span>
              <span className="eter-label">spełnienie</span>
            </span>
          );
        })()}
      </div>
    </section>
  );
}
