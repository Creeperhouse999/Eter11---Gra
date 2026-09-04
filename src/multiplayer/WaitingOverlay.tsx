import { Icon } from '../ui/icons/Icon';

interface WaitingOverlayProps {
  activeName: string;
}

/**
 * Znak, że teraz gra ktoś inny.
 *
 * Adam poprosił wprost: „powinna się wyświetlić wyraźna informacja na środku
 * w ramce: teraz ruch gracza …". Wcześniej był to wąski pasek u samej góry —
 * przy grze na telefonie, gdzie wzrok siedzi na kartach na dole, dziecko go
 * po prostu nie widziało i próbowało grać poza kolejką.
 *
 * Ramka stoi na środku, ale planszy nie zasłania: tło jest przezroczyste,
 * a `pointer-events-none` przepuszcza dotyk niżej — śledzenie cudzego ruchu
 * to połowa nauki w tej grze. Same karty blokuje osobno `allows` w
 * `OnlineGame`, więc kliknięcie i tak nic nie zrobi.
 */
export function WaitingOverlay({ activeName }: WaitingOverlayProps) {
  return (
    <div
      aria-live="polite"
      className="eter-fade-in pointer-events-none fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 'var(--z-toast)' }}
    >
      <div className="flex w-full max-w-sm min-w-0 flex-col items-center gap-2 rounded-2xl border-2 border-accent bg-surface/95 px-5 py-5 text-center shadow-2xl backdrop-blur">
        <span className="eter-pulse text-accent">
          <Icon name="people" size={28} />
        </span>
        <p className="min-w-0 font-display text-lg font-bold break-words">
          Teraz ruch gracza <span className="text-accent">{activeName}</span>
        </p>
        <p className="text-sm text-ink-dim">Poczekaj na swoją kolej — zagrać możesz dopiero po nim.</p>
      </div>
    </div>
  );
}
