import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../icons/Icon';

interface ModalProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  onClose: () => void;
  /** Przyciski akcji. Pierwszy dostaje fokus po otwarciu. */
  footer?: ReactNode;
  /** Wariant ostrzegawczy — dla operacji nieodwracalnych. */
  tone?: 'default' | 'danger';
}

/**
 * Okno modalne.
 *
 * Zastępuje `window.confirm`: tamto blokuje wątek przeglądarki, wygląda
 * obco i nie da się go stylować. Tutaj mamy fokus uwięziony w oknie,
 * zamykanie Escape'em i wygląd spójny z resztą aplikacji.
 */
export function Modal({ open, title, children, onClose, footer, tone = 'default' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    // Fokus na pierwszy przycisk akcji, żeby Enter działał od razu.
    const first = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea',
    );
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      // Uwięzienie fokusu: Tab za ostatnim elementem wraca na pierwszy.
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea',
      );
      if (!focusable || focusable.length === 0) return;

      const list = Array.from(focusable);
      const firstEl = list[0];
      const lastEl = list[list.length - 1];

      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const accent = tone === 'danger' ? 'var(--eter-danger)' : 'var(--eter-accent)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="eter-fade-in absolute inset-0 bg-bg/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="eter-pop relative w-full max-w-md overflow-hidden rounded-xl border bg-surface shadow-2xl"
        style={{ borderColor: accent }}
      >
        <div aria-hidden="true" className="h-1" style={{ background: accent }} />

        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <h2 className="font-display text-lg font-bold" style={{ color: accent }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="rounded p-1 text-ink-dim transition hover:text-ink"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {children && <div className="px-5 pb-4 text-sm leading-relaxed">{children}</div>}

        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-edge p-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
