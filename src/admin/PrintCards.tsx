import { buildDeck, playableCards } from '../data/cards';
import type { GameContent } from '../firebase/validate';
import { categoryLabel, familyLabel } from '../ui/components/categoryStyles';
import { Button } from '../ui/controls/Button';
import { Icon, type IconName } from '../ui/icons/Icon';

interface PrintCardsProps {
  content: GameContent;
  /**
   * Skok do edycji karty (zakładka „Karty”, przefiltrowana po nazwie).
   *
   * Bez tego lista w „Drukuj karty” była czysto do oglądania — literówkę czy
   * złą grafikę widać tu od razu, ale poprawić dało się tylko po ręcznym
   * odszukaniu tej samej karty w zakładce „Karty”.
   */
  onEdit?: (cardName: string) => void;
}

/**
 * Karty do wydruku — fizyczna talia do gry przy stole.
 *
 * Drukuje dokładnie to, co gracze dostają na ekranie: karty robocze (`draft`)
 * są pominięte, a każda karta kompetencji/talentu/mentora wychodzi w dwóch
 * egzemplarzach, karty specjalne w jednym — tak samo jak buduje talię silnik
 * gry (`buildDeck`). Inaczej fizyczna talia różniłaby się liczbą kart od
 * cyfrowej i test przy stole nie odzwierciedlałby prawdziwego balansu.
 */
export function PrintCards({ content, onEdit }: PrintCardsProps) {
  const deck = buildDeck(playableCards(content.cards));

  return (
    <section>
      {/* Ten blok znika przy druku (print:hidden) — instrukcja i przycisk są
          bez sensu na wydrukowanej stronie. */}
      <div className="print:hidden">
        <h2 className="font-display text-lg font-bold">Drukuj karty</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-dim">
          Pełna talia do gry na papierze — {deck.length} kart, dokładnie tyle,
          ile trafia do cyfrowej rozgrywki (karty robocze pominięte, kompetencje
          i talenty w dwóch egzemplarzach). Wydrukuj i potnij wzdłuż obramowania.
        </p>
        <Button
          variant="primary"
          icon="printer"
          className="mt-3"
          onClick={() => window.print()}
        >
          Drukuj ({deck.length} kart)
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:mt-0 print:grid-cols-3 print:gap-3">
        {deck.map((card) => {
          const label = card.family ? familyLabel(card.family, card.category) : undefined;
          return (
            <article
              key={card.id}
              role={onEdit ? 'button' : undefined}
              tabIndex={onEdit ? 0 : undefined}
              onClick={onEdit ? () => onEdit(card.name) : undefined}
              onKeyDown={
                onEdit
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onEdit(card.name);
                      }
                    }
                  : undefined
              }
              className={[
                'break-inside-avoid-page rounded-lg border-2 border-black bg-white p-3 text-black print:rounded-none',
                onEdit ? 'cursor-pointer transition hover:border-accent print:cursor-auto' : '',
              ].join(' ')}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-black/60">
                {categoryLabel(card.category)}
                {label ? ` · ${label}` : ''}
              </p>
              <span className="mt-1 inline-block text-black">
                <Icon name={card.icon as IconName} size={22} />
              </span>
              <p className="mt-1 font-display text-sm font-bold leading-tight">{card.name}</p>
              <p className="mt-1 text-xs leading-snug text-black/80">{card.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
