import { useState } from 'react';
import { Icon, type IconName } from '../ui/icons/Icon';
import { REACTIONS, type Reaction, type ReactionKind, type RoomPlayer } from './types';
import { useFreshReactions } from './useRoom';

interface ReactionBarProps {
  reactions: Reaction[];
  players: Record<string, RoomPlayer>;
  uid: string;
  onReact: (kind: ReactionKind, target?: string) => Promise<void>;
}

/**
 * Gotowe reakcje zamiast czatu.
 *
 * Dzieci nie piszą — klikają jedną z gotowych. Świeże reakcje innych wjeżdżają
 * jako dymki z imieniem i gasną same. Panel z przyciskami rozwija się z małej
 * ikonki, żeby nie zajmował miejsca podczas gry.
 */
export function ReactionBar({ reactions, players, uid, onReact }: ReactionBarProps) {
  const [open, setOpen] = useState(false);
  const fresh = useFreshReactions(reactions);

  const nameOf = (id: string) => players[id]?.name ?? 'Ktoś';

  return (
    <>
      {/* Dymki reakcji — nad paskiem, wchodzą i gasną. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-16 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1"
        style={{ zIndex: 'var(--z-toast)' }}
      >
        {fresh.slice(-4).map((reaction, index) => (
          <div
            key={`${reaction.from}-${reaction.at}-${index}`}
            className="eter-pop flex items-center gap-1.5 rounded-full border border-accent bg-surface px-3 py-1 text-sm shadow-lg"
          >
            <span className="text-accent">
              <Icon name={REACTIONS[reaction.kind].icon as IconName} size={14} />
            </span>
            <span className="font-semibold">{nameOf(reaction.from)}:</span>
            <span>
              {REACTIONS[reaction.kind].label}
              {reaction.kind === 'daj-karte' && reaction.target && (
                <> → {nameOf(reaction.target)}</>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Panel z reakcjami — rozwijany. */}
      {open && (
        <div
          className="eter-rise fixed bottom-16 left-3 grid grid-cols-2 gap-1.5 rounded-xl border border-edge bg-surface p-2 shadow-2xl sm:grid-cols-5"
          style={{ zIndex: 'var(--z-dropdown)' }}
        >
          {(Object.keys(REACTIONS) as ReactionKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                void onReact(kind);
                setOpen(false);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 text-xs transition hover:border-accent hover:text-accent"
            >
              <Icon name={REACTIONS[kind].icon as IconName} size={14} />
              {REACTIONS[kind].label}
            </button>
          ))}
        </div>
      )}

      {/* Przycisk otwierający — lewy dolny róg, jak przycisk zgłoszeń, ale
          po drugiej stronie niż on nie występuje (to online). */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Reakcje"
        title="Reakcje"
        className="fixed bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-surface text-ink-dim shadow-lg transition hover:border-accent hover:text-accent"
        style={{ zIndex: 'var(--z-dropdown)' }}
      >
        <Icon name={open ? 'close' : 'message'} size={18} />
      </button>

      {/* uid używany do przyszłego wyróżnienia własnych reakcji — na razie
          pole zachowane w API, bez efektu wizualnego. */}
      <span className="hidden">{uid}</span>
    </>
  );
}
