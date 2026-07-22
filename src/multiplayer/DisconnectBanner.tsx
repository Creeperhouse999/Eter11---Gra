import { useEffect, useState } from 'react';
import { Icon } from '../ui/icons/Icon';

interface DisconnectBannerProps {
  name: string;
  /** Kiedy zaczęła się tura rozłączonego gracza. */
  turnStartedAt: number;
}

/** Ile czekamy na powrót, zanim tura się skipuje. */
const WAIT_MS = 60_000;

/**
 * „X się rozłączył" z odliczaniem do skipnięcia tury.
 *
 * Gracz ma minutę od początku SWOJEJ tury na powrót. Wróci — gra dalej.
 * Nie zdąży — tura się skipuje (robi to hook liczący timeout). Banner tylko
 * pokazuje, ile zostało, żeby reszta wiedziała, na co czekają.
 */
export function DisconnectBanner({ name, turnStartedAt }: DisconnectBannerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  const left = Math.max(0, Math.ceil((turnStartedAt + WAIT_MS - now) / 1000));

  return (
    <div
      aria-live="polite"
      className="eter-fade-in pointer-events-none fixed inset-x-0 top-0 flex justify-center p-3"
      style={{ zIndex: 'var(--z-toast)' }}
    >
      <div className="flex items-center gap-2 rounded-full border border-accent-2 bg-surface/95 px-4 py-2 shadow-lg backdrop-blur">
        <span className="eter-pulse text-accent-2">
          <Icon name="swan" size={16} />
        </span>
        <span className="text-sm font-semibold">
          <span className="text-accent-2">{name}</span> się rozłączył
          {left > 0 ? (
            <> — czekamy jeszcze {left} s</>
          ) : (
            <> — pomijamy jego turę</>
          )}
        </span>
      </div>
    </div>
  );
}
