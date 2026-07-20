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

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDone={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const config = TONES[toast.tone];

  useEffect(() => {
    const timer = window.setTimeout(onDone, 4000);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="eter-slide-left pointer-events-auto flex items-center gap-3 rounded-lg border border-edge bg-surface px-4 py-3 shadow-2xl"
      style={{ borderLeftColor: config.color, borderLeftWidth: 4 }}
    >
      <span style={{ color: config.color }}>
        <Icon name={config.icon} size={17} />
      </span>
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        type="button"
        onClick={onDone}
        aria-label="Zamknij powiadomienie"
        className="rounded p-1 text-ink-dim transition hover:text-ink"
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  );
}
