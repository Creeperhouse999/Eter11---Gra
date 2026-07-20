import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '../controls/Button';
import { Icon } from '../icons/Icon';

interface GuideBubbleProps {
  /** Treść wypowiedzi ETER11. */
  message: string;
  /** Numer kroku i ich liczba — pokazują, ile jeszcze zostało. */
  step: number;
  total: number;
  /** Czy krok został wykonany — wtedy bąbel chwali i pozwala iść dalej. */
  done: boolean;
  onNext: () => void;
  onSkip: () => void;
  /** Selektor podświetlonego elementu — bąbel ustawia się obok niego. */
  anchor: string | null;
}

interface Placement {
  top: number;
  left: number;
}

const WIDTH = 320;
const GAP = 14;

/**
 * ETER11 mówiący do gracza podczas samouczka.
 *
 * Bąbel nigdy nie zasłania tego, co gracz ma kliknąć. Sprawdza kolejno cztery
 * strony podświetlonego elementu i wybiera pierwszą, na której się mieści;
 * gdy żadna nie pasuje, ląduje w rogu najdalszym od podświetlenia.
 *
 * Tekst pisze się litera po literze — to jedyne miejsce w grze z takim
 * efektem. Nadaje ETER11 głos i daje dziecku rytm czytania zamiast ściany
 * tekstu. Klik pokazuje całość, a `prefers-reduced-motion` wyłącza efekt.
 */
export function GuideBubble({
  message,
  step,
  total,
  done,
  onNext,
  onSkip,
  anchor,
}: GuideBubbleProps) {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [typed, setTyped] = useState('');
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setTyped(message);
      return;
    }

    setTyped('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(message.slice(0, index));
      if (index >= message.length) window.clearInterval(timer);
    }, 16);

    return () => window.clearInterval(timer);
  }, [message]);

  useLayoutEffect(() => {
    const place = () => {
      if (!anchor) {
        setPlacement(null);
        return;
      }

      const element = document.querySelector(anchor);
      if (!element) {
        setPlacement(null);
        return;
      }

      const target = element.getBoundingClientRect();
      const height = bubbleRef.current?.offsetHeight ?? 190;
      const { innerWidth: vw, innerHeight: vh } = window;

      const clampX = (x: number) => Math.min(Math.max(GAP, x), vw - WIDTH - GAP);
      const clampY = (y: number) => Math.min(Math.max(GAP, y), vh - height - GAP);

      // Kandydaci w kolejności preferencji: pod, nad, obok.
      const candidates: Array<Placement & { fits: boolean }> = [
        {
          top: target.bottom + GAP,
          left: clampX(target.left + target.width / 2 - WIDTH / 2),
          fits: target.bottom + GAP + height <= vh,
        },
        {
          top: target.top - height - GAP,
          left: clampX(target.left + target.width / 2 - WIDTH / 2),
          fits: target.top - height - GAP >= 0,
        },
        {
          top: clampY(target.top + target.height / 2 - height / 2),
          left: target.right + GAP,
          fits: target.right + GAP + WIDTH <= vw,
        },
        {
          top: clampY(target.top + target.height / 2 - height / 2),
          left: target.left - WIDTH - GAP,
          fits: target.left - WIDTH - GAP >= 0,
        },
      ];

      const chosen = candidates.find((candidate) => candidate.fits);

      if (chosen) {
        setPlacement({ top: chosen.top, left: chosen.left });
        return;
      }

      // Nic się nie mieści obok — idziemy do rogu po przeciwnej stronie
      // ekranu niż podświetlenie, żeby go nie przykryć.
      const targetOnLeft = target.left + target.width / 2 < vw / 2;
      const targetOnTop = target.top + target.height / 2 < vh / 2;

      setPlacement({
        top: targetOnTop ? vh - height - GAP : GAP,
        left: targetOnLeft ? vw - WIDTH - GAP : GAP,
      });
    };

    place();
    const interval = window.setInterval(place, 200);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor, typed]);

  const typing = typed.length < message.length;

  return (
    <div
      ref={bubbleRef}
      className="eter-pop fixed z-40 max-w-[calc(100vw-1.75rem)]"
      style={
        placement
          ? { top: placement.top, left: placement.left, width: WIDTH }
          : // Bez podświetlenia: dół ekranu, gdzie nie zasłania stołu.
            { bottom: GAP, left: '50%', transform: 'translateX(-50%)', width: WIDTH }
      }
      role="dialog"
      aria-label="Samouczek"
    >
      <div
        className="overflow-hidden rounded-xl border bg-surface shadow-2xl"
        style={{
          borderColor: done ? 'var(--eter-success)' : 'var(--eter-accent)',
          // Cień odcina bąbel od przyciemnionego tła.
          boxShadow: `0 16px 48px -12px ${done ? 'var(--eter-success)' : 'var(--eter-accent)'}, 0 0 0 1px var(--eter-bg)`,
        }}
      >
        <div className="flex items-start gap-2.5 p-3.5">
          <span
            className="shrink-0 rounded-lg p-1.5"
            style={{
              background: 'var(--eter-raised)',
              color: done ? 'var(--eter-success)' : 'var(--eter-accent)',
            }}
          >
            <Icon name={done ? 'tick' : 'spark'} size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="eter-label"
                style={{ color: done ? 'var(--eter-success)' : 'var(--eter-accent)' }}
              >
                ETER11
              </span>
              <span className="font-mono text-[10px] text-ink-dim">
                {step} / {total}
              </span>
            </div>

            {/* Klik pokazuje całość — czytający szybciej nie czekają. */}
            <p
              className="mt-1 text-sm leading-relaxed"
              onClick={() => setTyped(message)}
            >
              {typed}
              {typing && <span className="eter-pulse text-accent">▍</span>}
            </p>
          </div>
        </div>

        <div className="h-0.5 bg-edge">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${(step / total) * 100}%`,
              background: done ? 'var(--eter-success)' : 'var(--eter-accent)',
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-edge px-3 py-2">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Pomiń samouczek
          </Button>

          {done && (
            <Button variant="primary" size="sm" onClick={onNext}>
              {step === total ? 'Zaczynamy grę' : 'Dalej'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
