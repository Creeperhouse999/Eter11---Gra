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
    const color = slotColorVar(key);
    const familyColor = `var(--eter-family-${slot.family})`;

    return (
      <button
        key={key}
        type="button"
        onClick={() => onSlotClick(problem.id, key)}
        disabled={!playable}
        aria-label={
          filled
            ? `${slotLabel(key)} ${FAMILY_LABELS[slot.family]} — ścianka zamknięta`
            : `${slotLabel(key)} ${FAMILY_LABELS[slot.family]} — ${slot.hint}`
        }
        className={[
          'flex min-h-[8.5rem] flex-col rounded-lg border-2 p-2.5 text-left transition',
          filled ? 'eter-slot-locked border-solid bg-raised' : 'border-dashed',
          playable ? 'cursor-pointer bg-raised' : 'cursor-default',
          extraClass,
        ].join(' ')}
        style={{
          borderColor: filled ? familyColor : playable ? 'var(--eter-accent)' : 'var(--eter-edge)',
          boxShadow: playable ? '0 0 20px -8px var(--eter-accent)' : undefined,
        }}
      >
        {/* Nagłówek ścianki: kategoria plus wymagany kolor rodziny */}
        <div className="flex items-center gap-1.5">
          <span style={{ color: filled ? familyColor : 'var(--eter-ink-dim)' }}>
            <Icon name={filled ? 'lockedSlot' : slotIcon(key)} size={16} />
          </span>
          <span className="eter-label" style={{ color: filled ? color : undefined }}>
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
            <span className="mt-1 text-xs leading-snug text-ink-dim">{slot.hint}</span>
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
      className="flex flex-col justify-center rounded-xl border-2 bg-surface p-4 text-center"
      style={{ borderColor: typeColor }}
    >
      <span className="mx-auto" style={{ color: typeColor }}>
        <Icon name={problem.icon as IconName} size={40} />
      </span>
      <span className="eter-label mt-2" style={{ color: typeColor }}>
        {problemTypeLabel(problem.type)}
      </span>
      <h2 className="font-display text-xl font-bold leading-tight">{problem.name}</h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-dim">{problem.story}</p>

      <dl className="mt-3 space-y-1.5 text-left text-xs">
        <div>
          <dt className="eter-label">Cel</dt>
          <dd className="text-accent">{problem.goal}</dd>
        </div>
        <div>
          <dt className="eter-label">Przeciwnik</dt>
          <dd>{problem.antagonist}</dd>
        </div>
        <div>
          <dt className="eter-label">Jeśli się nie uda</dt>
          <dd className="text-danger">{problem.consequence}</dd>
        </div>
      </dl>
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

      {/* Układ wąski — ta sama kolejność, jedna kolumna. */}
      <div className="space-y-3 lg:hidden">
        {core}
        <div className="grid gap-3 sm:grid-cols-2">
          {renderSlot('mentor')}
          {renderSlot('talent')}
          {renderSlot('psychological')}
          {renderSlot('social')}
          {renderSlot('digital')}
        </div>
      </div>
    </section>
  );
}
