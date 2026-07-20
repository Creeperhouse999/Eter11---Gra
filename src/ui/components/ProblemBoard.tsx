import { cardsInSlot, requiredCountForSlot } from '../../engine/rules';
import type { Card, MissionState, Problem, SlotKey } from '../../engine/types';
import { CardView } from './CardView';
import {
  problemTypeColorVar,
  problemTypeLabel,
  slotColorVar,
  slotIcon,
  slotLabel,
} from './categoryStyles';

interface ProblemBoardProps {
  mission: MissionState;
  problem: Problem;
  /** Karta wybrana z ręki — podświetla pasujące ścianki. */
  selectedCard: Card | null;
  onSlotClick: (problemId: string, slotKey: SlotKey) => void;
  canPlayInSlot: (card: Card, slotKey: SlotKey) => boolean;
}

/**
 * Plansza jednego problemu: opis misji plus cztery ścianki.
 *
 * Ścianki są sygnaturą wizualną gry — pusta ma przerywaną krawędź,
 * zamknięta przechodzi w ciągłą i zapala pasek statusu. Dziecko widzi
 * postęp bez czytania liczb.
 */
export function ProblemBoard({
  mission,
  problem,
  selectedCard,
  onSlotClick,
  canPlayInSlot,
}: ProblemBoardProps) {
  const typeColor = problemTypeColorVar(problem.type);

  return (
    <section
      className="overflow-hidden rounded-xl border bg-surface"
      style={{ borderColor: 'var(--eter-edge)' }}
      aria-label={`Problem: ${problem.name}`}
    >
      {/* Pasek typu problemu — kolor niesie informację o kategorii */}
      <div aria-hidden="true" className="h-1" style={{ background: typeColor }} />

      <header className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <span className="text-4xl leading-none sm:text-5xl" aria-hidden="true">
            {problem.art}
          </span>
          <div className="min-w-0 flex-1">
            <span className="eter-label" style={{ color: typeColor }}>
              {problemTypeLabel(problem.type)}
            </span>
            <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
              {problem.name}
            </h2>
          </div>
        </div>

        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink">
          {problem.story}
        </p>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="eter-label">Cel misji</dt>
            <dd className="mt-0.5 font-semibold text-accent">{problem.goal}</dd>
          </div>
          <div>
            <dt className="eter-label">Przeciwnik</dt>
            <dd className="mt-0.5">{problem.antagonist}</dd>
          </div>
          <div>
            <dt className="eter-label">Jeśli się nie uda</dt>
            <dd className="mt-0.5 text-danger">{problem.consequence}</dd>
          </div>
        </dl>
      </header>

      <div className="grid gap-3 border-t border-edge p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        {problem.slots.map((slot) => {
          const placed = mission.played.filter(
            (p) => p.problemId === problem.id && p.slotKey === slot.key,
          );
          const required = requiredCountForSlot(mission, problem.id, slot.key);
          const filled = cardsInSlot(mission, problem.id, slot.key) >= required;
          const playable =
            Boolean(selectedCard) && !filled && canPlayInSlot(selectedCard!, slot.key);
          const color = slotColorVar(slot.key);

          return (
            <button
              key={slot.key}
              type="button"
              onClick={() => onSlotClick(problem.id, slot.key)}
              disabled={!playable}
              aria-label={
                filled
                  ? `${slotLabel(slot.key)} — ścianka zamknięta`
                  : `${slotLabel(slot.key)} — ${slot.hint}`
              }
              className={[
                'flex min-h-[12rem] flex-col rounded-lg border-2 p-3 text-left transition',
                filled ? 'eter-slot-locked border-solid bg-raised' : 'border-dashed',
                playable ? 'cursor-pointer bg-raised' : 'cursor-default',
              ].join(' ')}
              style={{
                borderColor: filled ? color : playable ? 'var(--eter-accent)' : 'var(--eter-edge)',
                boxShadow: playable ? '0 0 20px -8px var(--eter-accent)' : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">{slotIcon(slot.key)}</span>
                <span className="eter-label" style={{ color: filled ? color : undefined }}>
                  {slotLabel(slot.key)}
                </span>
              </div>

              {filled ? (
                <span className="mt-1 text-xs font-semibold" style={{ color }}>
                  Ścianka zamknięta
                </span>
              ) : (
                <span className="mt-1 text-xs leading-snug text-ink-dim">{slot.hint}</span>
              )}

              {required > 1 && !filled && (
                <span className="mt-1 font-mono text-xs font-bold text-danger">
                  {placed.length} / {required} kart
                </span>
              )}

              <div className="mt-auto flex flex-wrap gap-1 pt-3">
                {placed.map((p) => (
                  <CardView key={p.card.id} card={p.card} compact />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
