import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '../icons/Icon';

type ToastTone = 'info' | 'success' | 'danger';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const TONES: Record<ToastTone, { color: string; icon: IconName }> = {
  info: { color: 'var(--eter-accent)', icon: 'info' },
  success: { color: 'var(--eter-success)', icon: 'check' },
  danger: { color: 'var(--eter-danger)', icon: 'warning' },
};

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

/** Powiadomienie znikające samo — dla potwierdzeń, które nie wymagają reakcji. */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast wymaga ToastProvider w drzewie komponentów.');
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tone, message }]);
  }, []);

  // Stała referencja: `onDone` przekazywany dawniej jako świeża strzałka na
  // każdym renderze restartował efekt każdego toasta przy KAŻDYM dodaniu lub
  // usunięciu — bo dodanie/usunięcie przerysowuje providera. Odliczanie 4 s
  // zerowało się wtedy dla wszystkich, więc przy powiadomieniach częstszych
  // niż co 4 s (np. seria zapisów w panelu) żadne nie znikało. Teraz `remove`
  // jest stabilne, a toast dostaje własne id — jego efekt biegnie raz.
  const remove = useCallback(
    (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        // Szerokość ograniczona do kadru minus marginesy, a nie `w-full` (100vw).
        // Z `right-4` i `w-full` przeglądarka liczyła lewą krawędź jako
        // viewportWidth − 16 − 100vw = −16px, więc na telefonie (≤384px) kolumna
        // była zepchnięta 16px za lewą krawędź, a ikona wiodąca ucięta przez
        // body overflow-x:hidden. `min(100vw−2rem, 24rem)` mieści ją w kadrze,
        // zachowując wyrównanie do prawej i wąską kolumnę na desktopie.
        className="pointer-events-none fixed bottom-4 right-4 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
        style={{ zIndex: 'var(--z-toast)' }}
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Ile trwa wygaszenie — tyle samo, co przejście w stylu poniżej. */
const WYGASZANIE_MS = 200;

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
  const config = TONES[toast.tone];
  /**
   * Wygaszenie przed usunięciem.
   *
   * Komunikat wjeżdżał płynnie, a znikał skokiem — w połowie ekranu nagle
   * ubywało kafla i sąsiednie podskakiwały. Najpierw więc gasimy go na miejscu,
   * a dopiero potem wyjmujemy z listy.
   */
  const [odchodzi, setOdchodzi] = useState(false);

  const zamknij = useCallback(() => {
    setOdchodzi(true);
    window.setTimeout(() => onDone(toast.id), WYGASZANIE_MS);
  }, [onDone, toast.id]);

  useEffect(() => {
    const timer = window.setTimeout(zamknij, 4000);
    return () => window.clearTimeout(timer);
  }, [zamknij]);

  return (
    <div
      className="eter-slide-left pointer-events-auto flex items-center gap-3 rounded-lg border border-edge bg-surface px-4 py-3 shadow-2xl"
      style={{
        borderLeftColor: config.color,
        borderLeftWidth: 4,
        // Wygaszanie na `opacity` i `transform` — nie ruszają układu strony,
        // więc nie zmuszają przeglądarki do przeliczania go co klatkę.
        opacity: odchodzi ? 0 : 1,
        transform: odchodzi ? 'translateX(1rem)' : 'none',
        transition: `opacity ${WYGASZANIE_MS}ms ease, transform ${WYGASZANIE_MS}ms ease`,
      }}
    >
      <span style={{ color: config.color }}>
        <Icon name={config.icon} size={17} />
      </span>
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        type="button"
        onClick={zamknij}
        aria-label="Zamknij powiadomienie"
        className="rounded p-1 text-ink-dim transition hover:text-ink"
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  );
}
