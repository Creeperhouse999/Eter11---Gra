import { FAMILY_LABELS } from '../../data/families';
import { cardsInSlot, requiredCountForSlot } from '../../engine/rules';
import type { Card, MissionState, Problem, ProblemSlot, SlotKey } from '../../engine/types';
import { Icon, type IconName } from '../icons/Icon';
import { CardView } from './CardView';
import {
  problemTypeColorVar,
  problemTypeLabel,
  slotColorVar,
  slotIcon,
  slotLabel,
} from './categoryStyles';

interface ProblemCardProps {
  mission: MissionState;
  problem: Problem;
  /** Karta wybrana z ręki — podświetla ścianki, do których pasuje. */
  selectedCard: Card | null;
  onSlotClick: (problemId: string, slotKey: SlotKey) => void;
  canPlayInSlot: (card: Card, slotKey: SlotKey, family: ProblemSlot['family']) => boolean;
  /** Właściwości strefy upuszczenia z useCardDrag. */
  dropTargetProps?: (targetId: string) => Record<string, string | undefined>;
  /** Karta trzymana w powietrzu — podświetla ścianki, które ją przyjmą. */
  draggedCard?: Card | null;
}

/**
 * Karta problemu leżąca na środku stołu.
 *
 * Ścianki otaczają kartę zgodnie z ustaleniem zespołu: mentor i talent
 * u góry, psychologiczna po lewej, społeczna po prawej, cyfrowa na dole.
 * Dzięki temu ekran czyta się jak prawdziwa karta na stole, a nie jak
 * lista pól formularza.
 *
 * Poniżej 900 px boki nie mieszczą się obok siebie, więc ścianki układają
 * się w kolumnę pod opisem — kolejność zostaje ta sama.
 */
export function ProblemCard({
  mission,
  problem,
  selectedCard,
  onSlotClick,
  canPlayInSlot,
  dropTargetProps,
  draggedCard,
}: ProblemCardProps) {
  const typeColor = problemTypeColorVar(problem.type);

  const slotOf = (key: SlotKey) => problem.slots.find((s) => s.key === key);

  const renderSlot = (key: SlotKey, extraClass = '') => {
    const slot = slotOf(key);
    if (!slot) return null;

    const placed = mission.played.filter(
      (p) => p.problemId === problem.id && p.slotKey === key,
    );
    const required = requiredCountForSlot(mission, problem.id, key);
    const filled = cardsInSlot(mission, problem.id, key) >= required;
    const playable =
      Boolean(selectedCard) && !filled && canPlayInSlot(selectedCard!, key, slot.family);
    // Ścianka gotowa przyjąć trzymaną kartę — podświetlana podczas przeciągania.
    const accepts =
      Boolean(draggedCard) && !filled && canPlayInSlot(draggedCard!, key, slot.family);
    const dropId = `${problem.id}:${key}`;
    const color = slotColorVar(key);
    const familyColor = `var(--eter-family-${slot.family})`;

    return (
      <button
        key={key}
        type="button"
        onClick={() => playable && onSlotClick(problem.id, key)}
        // Nie `disabled`: wyłączony przycisk nie odbiera zdarzeń wskaźnika,
        // więc nie dałoby się na niego upuścić karty.
        aria-disabled={!playable && !accepts}
        aria-label={
          filled
            ? `${slotLabel(key)} ${FAMILY_LABELS[slot.family]} — ścianka zamknięta`
            : `${slotLabel(key)} ${FAMILY_LABELS[slot.family]} — ${slot.hint}`
        }
        data-slot={dropId}
        // Na wąskim ekranie podpowiedź jest ukryta — tutaj zostaje dostępna
        // po dotknięciu i przytrzymaniu.
        title={filled ? undefined : slot.hint}
        {...(dropTargetProps?.(dropId) ?? {})}
        className={[
          'flex flex-col overflow-hidden rounded-lg border-2 p-2.5 text-left transition',
          // Pusta ścianka to sam nagłówek i podpowiedź — pełną wysokość
          // potrzebuje dopiero karta, która w niej wyląduje. Pięć ścianek po
          // 8.5rem nie mieściło się na telefonie i wymuszało przewijanie.
          // Zamknięta ścianka nie potrzebuje stałej wysokości — mierzy ją
          // leżąca w niej karta. Sztywne 8.5rem dawało przy pięciu zamkniętych
          // ściankach ponad 400 px, przez które plansza nie mieściła się
          // na telefonie. Od `lg` wracamy do równych rozmiarów, bo tam ścianki
          // stoją obok siebie i różna wysokość wyglądałaby niechlujnie.
          filled ? 'lg:min-h-[8.5rem]' : 'min-h-[4.5rem] sm:min-h-[5.5rem]',
          filled ? 'eter-slot-locked border-solid bg-raised' : 'border-dashed',
          playable || accepts ? 'bg-raised' : '',
          playable ? 'cursor-pointer' : 'cursor-default',
          accepts ? 'scale-[1.03]' : '',
          // Strefa pod kursorem dostaje mocniejsze podświetlenie przez atrybut.
          'data-[drag-over=true]:border-success',
          extraClass,
        ].join(' ')}
        style={{
          borderColor: filled
            ? familyColor
            : accepts
              ? 'var(--eter-success)'
              : playable
                ? 'var(--eter-accent)'
                : 'var(--eter-edge)',
          boxShadow: accepts
            ? '0 0 26px -6px var(--eter-success)'
            : playable
              ? '0 0 20px -8px var(--eter-accent)'
              : undefined,
        }}
      >
        {/* Nagłówek ścianki: kategoria plus wymagany kolor rodziny */}
        <div className="flex items-center gap-1.5">
          <span style={{ color: filled ? familyColor : 'var(--eter-ink-dim)' }}>
            <Icon name={filled ? 'lockedSlot' : slotIcon(key)} size={16} />
          </span>
          <span
            className="eter-label truncate"
            style={{ color: filled ? color : undefined }}
          >
            {slotLabel(key)}
          </span>
          <span
            aria-hidden="true"
            className="ml-auto h-3 w-3 shrink-0 rounded-full border"
            style={{
              background: familyColor,
              borderColor: 'var(--eter-bg)',
            }}
          />
        </div>

        {filled ? (
          <span className="mt-1 text-xs font-semibold" style={{ color: familyColor }}>
            Zamknięta
          </span>
        ) : (
          <>
            <span
              className="mt-0.5 font-mono text-[10px] uppercase tracking-wide"
              style={{ color: familyColor }}
            >
              {FAMILY_LABELS[slot.family]}
            </span>
            {/* Przy trzech ściankach w rzędzie zostaje ~105 px szerokości —
                podpowiedź byłaby wtedy dwoma uciętymi słowami. Kolor i
                kategoria wystarczą do ruchu, a pełną treść niesie `title`. */}
            <span
              className="mt-1 hidden line-clamp-3 text-xs leading-snug text-ink-dim sm:block"
              style={{ overflowWrap: 'anywhere' }}
            >
              {slot.hint}
            </span>
          </>
        )}

        {required > 1 && !filled && (
          <span className="mt-1 font-mono text-xs font-bold text-danger">
            {placed.length} / {required}
          </span>
        )}

        <div className="mt-auto flex flex-wrap gap-1 pt-2">
          {placed.map((p) => (
            <CardView key={p.card.id} card={p.card} compact />
          ))}
        </div>
      </button>
    );
  };

  const core = (
    <div
      className="flex flex-col justify-center rounded-xl border-2 bg-surface p-3 text-center sm:p-4"
      style={{ borderColor: typeColor }}
    >
      {/* Na telefonie ikona i tytuł stoją obok siebie: wyśrodkowana kolumna
          zjadała ponad sto pikseli, przez które plansza nie mieściła się
          na ekranie. Od `lg` wraca układ pionowy, bo tam miejsca nie brakuje. */}
      <div className="flex items-center gap-3 text-left lg:block lg:text-center">
        <span className="shrink-0 lg:mx-auto lg:block" style={{ color: typeColor }}>
          <Icon name={problem.icon as IconName} size={32} />
        </span>

        <div className="min-w-0">
          <span className="eter-label block lg:mt-2" style={{ color: typeColor }}>
            {problemTypeLabel(problem.type)}
          </span>
          <h2
            className="font-display text-lg font-bold leading-tight sm:text-xl"
            style={{ overflowWrap: 'anywhere' }}
          >
            {problem.name}
          </h2>
        </div>
      </div>

      {/* Cel zostaje zawsze — to on mówi, po co ten ruch. Reszta opisu jest
          do przeczytania raz i tylko zabiera wysokość, więc na wąskim ekranie
          chowa się pod rozwijaczem. */}
      <p className="eter-label mt-2 text-left lg:mt-3">Cel</p>
      <p
        className="text-left text-xs text-accent"
        style={{ overflowWrap: 'anywhere' }}
      >
        {problem.goal}
      </p>

      <details className="group mt-3 text-left">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-ink-dim transition hover:text-ink">
          <span className="transition-transform group-open:rotate-180">
            <Icon name="chevronDown" size={14} />
          </span>
          Cała historia
        </summary>

        <p
          className="mt-2 text-xs leading-relaxed text-ink-dim"
          style={{ overflowWrap: 'anywhere' }}
        >
          {problem.story}
        </p>

        <dl className="mt-2 space-y-1.5 text-xs">
          <div>
            <dt className="eter-label">Przeciwnik</dt>
            <dd style={{ overflowWrap: 'anywhere' }}>{problem.antagonist}</dd>
          </div>
          <div>
            <dt className="eter-label">Jeśli się nie uda</dt>
            <dd className="text-danger" style={{ overflowWrap: 'anywhere' }}>
              {problem.consequence}
            </dd>
          </div>
        </dl>
      </details>
    </div>
  );

  return (
    <section aria-label={`Problem: ${problem.name}`} className="eter-rise">
      {/* Układ stołowy — ścianki wokół karty. Od 900 px wzwyż. */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_minmax(18rem,22rem)_1fr] lg:gap-3">
        <div className="col-span-3 grid grid-cols-2 gap-3">
          {renderSlot('mentor')}
          {renderSlot('talent')}
        </div>

        {renderSlot('psychological', 'self-center')}
        {core}
        {renderSlot('social', 'self-center')}

        <div className="col-span-3">{renderSlot('digital')}</div>
      </div>

      {/* Układ wąski — ta sama kolejność, dwie ścianki w rzędzie.
          Jedna kolumna dawała ponad 700 px samych ścianek i plansza nie
          mieściła się na ekranie telefonu bez przewijania. */}
      <div className="space-y-2.5 lg:hidden">
        {core}
        {/* Pięć ścianek mieści się w dwóch rzędach: trzy i dwie. Dwie w rzędzie
            dawały trzy rzędy, a każdy rząd to ~80 px, których brakowało na
            dole ekranu. */}
        <div className="grid grid-cols-3 gap-2">
          {renderSlot('mentor')}
          {renderSlot('talent')}
          {renderSlot('psychological')}
          {/* Dwie pozostałe dzielą rząd po połowie. */}
          <div className="col-span-3 grid grid-cols-2 gap-2">
            {renderSlot('social')}
            {renderSlot('digital')}
          </div>
        </div>
      </div>
    </section>
  );
}
