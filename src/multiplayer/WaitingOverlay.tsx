import { Icon } from '../ui/icons/Icon';

interface WaitingOverlayProps {
  activeName: string;
}

/**
 * Delikatny znak, że teraz gra ktoś inny.
 *
 * Nie zasłania planszy — dziecko ma śledzić cudzy ruch, nie gapić się na
 * przyciemniony ekran. Pasek u góry mówi, na kogo czekamy, a plansza pod nim
 * jest przygaszona i nieklikalna.
 */
export function WaitingOverlay({ activeName }: WaitingOverlayProps) {
  return (
    <div
      aria-live="polite"
      className="eter-fade-in pointer-events-none fixed inset-x-0 top-0 flex justify-center p-3"
      style={{ zIndex: 'var(--z-toast)' }}
    >
      <div className="flex items-center gap-2 rounded-full border border-accent bg-surface/95 px-4 py-2 shadow-lg backdrop-blur">
        <span className="eter-pulse text-accent">
          <Icon name="people" size={16} />
        </span>
        <span className="text-sm font-semibold">
          Teraz gra <span className="text-accent">{activeName}</span> — poczekaj na swoją kolej
        </span>
      </div>
    </div>
  );
}
