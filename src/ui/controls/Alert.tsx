import type { ReactNode } from 'react';
import { Icon, type IconName } from '../icons/Icon';

type Tone = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
  /** Treść akcji po prawej — np. przycisk „Cofnij". */
  action?: ReactNode;
}

const TONES: Record<Tone, { color: string; icon: IconName; role: 'status' | 'alert' }> = {
  info: { color: 'var(--eter-accent)', icon: 'info', role: 'status' },
  success: { color: 'var(--eter-success)', icon: 'check', role: 'status' },
  warning: { color: 'var(--eter-cat-social)', icon: 'warning', role: 'status' },
  danger: { color: 'var(--eter-danger)', icon: 'warning', role: 'alert' },
};

/**
 * Komunikat w treści strony.
 *
 * Ostrzeżenia i błędy dostają rolę `alert` — czytnik ekranu przerywa i czyta
 * je od razu. Informacje i potwierdzenia mają rolę `status`, żeby nie
 * przerywać pracy w połowie zdania.
 */
export function Alert({ tone = 'info', title, children, onDismiss, action }: AlertProps) {
  const config = TONES[tone];

  return (
    <div
      role={config.role}
      className="eter-rise flex items-start gap-3 rounded-lg border-l-4 border border-edge bg-surface px-4 py-3"
      style={{ borderLeftColor: config.color }}
    >
      <span className="mt-0.5 shrink-0" style={{ color: config.color }}>
        <Icon name={config.icon} size={18} />
      </span>

      <div className="min-w-0 flex-1 text-sm">
        {title && (
          <p className="font-display font-bold" style={{ color: config.color }}>
            {title}
          </p>
        )}
        <div className={title ? 'mt-1 leading-relaxed' : 'leading-relaxed'}>{children}</div>
      </div>

      {action}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Zamknij komunikat"
          className="shrink-0 rounded p-1 text-ink-dim transition hover:text-ink"
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
