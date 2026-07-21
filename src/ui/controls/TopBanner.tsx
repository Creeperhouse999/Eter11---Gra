import { useEffect, useState } from 'react';
import { Icon, type IconName } from '../icons/Icon';

type BannerTone = 'info' | 'success' | 'warning' | 'danger';

interface TopBannerProps {
  message: string;
  tone?: BannerTone;
  onDismiss: () => void;
  /**
   * Po ilu milisekundach zniknąć samo. `0` zostawia baner do kliknięcia.
   * Domyślnie znika, bo odrzucony ruch to drobiazg — gracz poprawia go
   * od razu i nie chce zamykać okienka po każdej pomyłce.
   */
  autoHideMs?: number;
}

const TONES: Record<BannerTone, { color: string; icon: IconName }> = {
  info: { color: 'var(--eter-accent)', icon: 'info' },
  success: { color: 'var(--eter-success)', icon: 'check' },
  warning: { color: 'var(--eter-cat-social)', icon: 'warning' },
  danger: { color: 'var(--eter-danger)', icon: 'warning' },
};

/**
 * Komunikat wjeżdżający z góry ekranu.
 *
 * Zastępuje paski wstawiane w treść strony. Tamte przesuwały układ w dół
 * w momencie pojawienia się — karta, w którą gracz właśnie celował,
 * uciekała mu spod kursora. Baner leży nad stroną i niczego nie przesuwa.
 *
 * Nie blokuje kliknięć poza sobą: gracz ma poprawić ruch od razu, a nie
 * najpierw zamykać komunikat.
 */
export function TopBanner({
  message,
  tone = 'danger',
  onDismiss,
  autoHideMs = 4000,
}: TopBannerProps) {
  const [entered, setEntered] = useState(false);
  const config = TONES[tone];

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (autoHideMs <= 0) return;
    const timer = window.setTimeout(onDismiss, autoHideMs);
    return () => window.clearTimeout(timer);
    // `message` w zależnościach: kolejny komunikat resetuje odliczanie,
    // inaczej drugi baner dziedziczyłby resztę czasu pierwszego.
  }, [autoHideMs, onDismiss, message]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center p-3">
      <div
        role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
        onClick={onDismiss}
        className="pointer-events-auto flex w-full max-w-md cursor-pointer items-start gap-2.5 rounded-xl border bg-surface px-4 py-3 shadow-2xl transition-all duration-300"
        style={{
          borderColor: config.color,
          boxShadow: `0 12px 40px -12px ${config.color}, 0 0 0 1px var(--eter-bg)`,
          transform: entered ? 'translateY(0)' : 'translateY(-130%)',
          opacity: entered ? 1 : 0,
        }}
      >
        <span className="mt-0.5 shrink-0" style={{ color: config.color }}>
          <Icon name={config.icon} size={18} />
        </span>
        <p className="min-w-0 flex-1 text-sm leading-snug">{message}</p>
        <span className="mt-0.5 shrink-0 text-ink-dim">
          <Icon name="close" size={16} />
        </span>
      </div>
    </div>
  );
}
