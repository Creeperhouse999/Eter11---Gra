import type { Card } from '../../engine/types';
import { Icon, type IconName } from '../icons/Icon';
import { categoryColorVar } from './categoryStyles';

interface DragGhostProps {
  card: Card;
  x: number;
  y: number;
  /** Czy kursor jest nad ścianką, która przyjmie tę kartę. */
  overValidTarget: boolean;
}

/**
 * Karta „w powietrzu" podczas przeciągania.
 *
 * Umieszczona nad punktem dotyku, nie pod nim — palec zasłaniałby dokładnie
 * to, co gracz próbuje zobaczyć. Nie przechwytuje zdarzeń, więc szukanie
 * strefy pod kursorem działa poprawnie.
 */
export function DragGhost({ card, x, y, overValidTarget }: DragGhostProps) {
  const color = categoryColorVar(card.category);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-50"
      style={{
        left: x,
        top: y,
        // 60 px w górę: karta ląduje nad palcem, poza jego zasięgiem.
        transform: 'translate(-50%, calc(-100% - 60px))',
      }}
    >
      <div
        className="flex w-28 flex-col gap-1 rounded-lg border-2 bg-raised p-2 shadow-2xl transition-transform"
        style={{
          borderColor: overValidTarget ? 'var(--eter-success)' : color,
          transform: overValidTarget ? 'scale(1.06) rotate(0deg)' : 'rotate(-4deg)',
          boxShadow: `0 12px 32px -8px ${overValidTarget ? 'var(--eter-success)' : color}`,
        }}
      >
        <span style={{ color }}>
          <Icon name={card.icon as IconName} size={24} />
        </span>
        <span className="font-display text-xs font-bold leading-tight" style={{ color }}>
          {card.name}
        </span>
      </div>

      {/* Wskaźnik ostrza — pokazuje dokładny punkt upuszczenia */}
      <span
        className="absolute left-1/2 top-full h-14 w-px -translate-x-1/2"
        style={{
          background: `linear-gradient(to bottom, ${
            overValidTarget ? 'var(--eter-success)' : 'var(--eter-edge)'
          }, transparent)`,
        }}
      />
    </div>
  );
}
