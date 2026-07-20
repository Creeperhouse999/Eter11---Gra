import { useEffect, useState } from 'react';
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

interface Position {
  top: number;
  left: number;
}

const BUBBLE_WIDTH = 340;
const MARGIN = 16;

/**
 * ETER11 mówiący do gracza podczas samouczka.
 *
 * Bąbel trzyma się blisko podświetlonego elementu, ale nigdy go nie zasłania:
 * ustawia się pod nim, a gdy tam nie ma miejsca — nad. Bez wskazanego elementu
 * ląduje na dole ekranu, gdzie nie zakrywa stołu.
 *
 * Tekst pisze się litera po literze. To jedyne miejsce w grze z takim efektem
 * i ma powód: nadaje ETER11 głos, a dziecku daje rytm czytania zamiast ściany
 * tekstu. Efekt znika przy `prefers-reduced-motion`.
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
  const [position, setPosition] = useState<Position | null>(null);
  const [typed, setTyped] = useState('');

  // Pisanie litera po literze. Pełny tekst pojawia się od razu, gdy
  // użytkownik prosi o ograniczenie animacji.
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
    }, 18);

    return () => window.clearInterval(timer);
  }, [message]);

  useEffect(() => {
    const place = () => {
      if (!anchor) {
        setPosition(null);
        return;
      }

      const element = document.querySelector(anchor);
      if (!element) {
        setPosition(null);
        return;
      }

      const box = element.getBoundingClientRect();
      const below = box.bottom + MARGIN;
      const fitsBelow = below + 200 < window.innerHeight;

      setPosition({
        top: fitsBelow ? below : Math.max(MARGIN, box.top - 200 - MARGIN),
        left: Math.min(
          Math.max(MARGIN, box.left + box.width / 2 - BUBBLE_WIDTH / 2),
          window.innerWidth - BUBBLE_WIDTH - MARGIN,
        ),
      });
    };

    place();
    const interval = window.setInterval(place, 250);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor]);

  const skipTyping = () => setTyped(message);
  const typing = typed.length < message.length;

  return (
    <div
      className="eter-pop fixed z-40 w-[21rem] max-w-[calc(100vw-2rem)]"
      style={
        position
          ? { top: position.top, left: position.left }
          : { bottom: MARGIN, left: '50%', transform: 'translateX(-50%)' }
      }
      role="dialog"
      aria-label="Samouczek"
    >
      <div
        className="overflow-hidden rounded-xl border bg-surface shadow-2xl"
        style={{ borderColor: done ? 'var(--eter-success)' : 'var(--eter-accent)' }}
      >
        <div
          aria-hidden="true"
          className="h-1"
          style={{ background: done ? 'var(--eter-success)' : 'var(--eter-accent)' }}
        />

        <div className="flex items-start gap-3 p-4">
          <span
            className="shrink-0 rounded-lg p-1.5"
            style={{
              background: 'var(--eter-raised)',
              color: done ? 'var(--eter-success)' : 'var(--eter-accent)',
            }}
          >
            <Icon name={done ? 'tick' : 'spark'} size={20} />
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

            {/* Klik w tekst pokazuje całość — czytający szybciej nie czekają. */}
            <p
              className="mt-1 min-h-[3.5rem] cursor-default text-sm leading-relaxed"
              onClick={skipTyping}
            >
              {typed}
              {typing && <span className="eter-pulse text-accent">▍</span>}
            </p>
          </div>
        </div>

        {/* Pasek postępu — ile kroków za nami */}
        <div className="h-0.5 bg-edge">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${(step / total) * 100}%`,
              background: done ? 'var(--eter-success)' : 'var(--eter-accent)',
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-edge p-3">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Pomiń samouczek
          </Button>

          {done && (
            <Button variant="primary" size="sm" iconEnd="chevronDown" onClick={onNext}>
              {step === total ? 'Zaczynamy grę' : 'Dalej'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
