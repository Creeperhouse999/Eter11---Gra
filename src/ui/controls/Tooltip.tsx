import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  /** Tekst podpowiedzi. Pusty łańcuch nie pokazuje niczego. */
  label: string;
  children: ReactNode;
  /** Dodatkowe klasy owijki — domyślnie zachowuje się jak `inline-flex`. */
  className?: string;
}

/** Odstęp między elementem a dymkiem. */
const GAP = 8;

/**
 * Podpowiedź w stylu ETER11.
 *
 * Zastępuje atrybut `title`. Natywna podpowiedź przeglądarki ma szary
 * systemowy wygląd, pojawia się po sekundzie zwłoki i nie da się jej
 * ostylować — w panelu, gdzie wszystko inne jest ciemne i zaokrąglone,
 * wyglądała jak element obcej aplikacji.
 *
 * Dymek renderuje się w portalu na `body`, bo elementy z podpowiedzią
 * siedzą w przewijanych kontenerach, które by go przycięły.
 *
 * Pozycja liczona jest przy pokazaniu, nie w pętli: dymek żyje, dopóki
 * kursor stoi na elemencie, a wtedy nic się nie przesuwa.
 */
export function Tooltip({ label, children, className = '' }: TooltipProps) {
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    const element = wrapRef.current;
    if (!element || !label) return;

    const rect = element.getBoundingClientRect();
    setBox({ top: rect.bottom + GAP, left: rect.left + rect.width / 2 });
  };

  const hide = () => setBox(null);

  return (
    <span
      ref={wrapRef}
      className={`inline-flex ${className}`}
      onPointerEnter={show}
      onPointerLeave={hide}
      // Podpowiedź musi być dostępna z klawiatury, nie tylko spod myszy.
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {box &&
        createPortal(
          <span
            role="tooltip"
            className="eter-pop pointer-events-none fixed -translate-x-1/2 whitespace-nowrap rounded-md border border-edge bg-raised px-2 py-1 font-mono text-[11px] text-ink shadow-xl"
            style={{ top: box.top, left: box.left, zIndex: 'var(--z-tooltip)' }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
