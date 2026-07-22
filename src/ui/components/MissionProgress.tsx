import { isSlotFilled } from '../../engine/rules';
import type { MissionState } from '../../engine/types';
import { Icon } from '../icons/Icon';
import { slotColorVar, slotIcon, slotLabel } from './categoryStyles';

interface MissionProgressProps {
  mission: MissionState;
}

/**
 * Postęp misji: które ścianki są zamknięte.
 *
 * Ścianki na karcie problemu leżą wokół niej i przy dwóch problemach nie
 * mieszczą się w jednym spojrzeniu. Ten pasek zbiera je w jedno miejsce,
 * żeby gracz wiedział, ile zostało, nie licząc ich wzrokiem.
 */
export function MissionProgress({ mission }: MissionProgressProps) {
  const slots = mission.problems.flatMap((problem) =>
    problem.slots.map((slot) => ({
      problemId: problem.id,
      problemName: problem.name,
      key: slot.key,
      filled: isSlotFilled(mission, problem.id, slot.key),
    })),
  );

  const closed = slots.filter((slot) => slot.filled).length;

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="eter-label">Ścianki</span>
        {/* `key={closed}`: liczba podbija się przy zamknięciu ścianki —
            to jedyny moment sukcesu w misji, więc go podkreślamy. */}
        <span key={closed} className="eter-bump font-mono text-sm font-bold">
          {closed}
          <span className="text-ink-dim">/{slots.length}</span>
        </span>
      </div>

      <div
        className="mt-1.5 flex flex-wrap gap-1"
        role="img"
        aria-label={`Zamknięte ścianki: ${closed} z ${slots.length}.`}
      >
        {slots.map((slot) => (
          <span
            key={`${slot.problemId}:${slot.key}`}
            title={`${slotLabel(slot.key)}${
              mission.problems.length > 1 ? ` — ${slot.problemName}` : ''
            }: ${slot.filled ? 'zamknięta' : 'otwarta'}`}
            className={[
              'flex h-6 w-6 items-center justify-center rounded border transition',
              slot.filled ? '' : 'border-dashed border-edge text-ink-dim',
            ].join(' ')}
            style={
              slot.filled
                ? {
                    borderColor: slotColorVar(slot.key),
                    color: slotColorVar(slot.key),
                    background: 'var(--eter-raised)',
                  }
                : undefined
            }
          >
            <Icon name={slot.filled ? 'tick' : slotIcon(slot.key)} size={13} />
          </span>
        ))}
      </div>
    </div>
  );
}
