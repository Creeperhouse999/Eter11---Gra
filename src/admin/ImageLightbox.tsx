import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../ui/icons/Icon';
import { useFocusTrap } from '../ui/controls/useFocusTrap';

interface ImageLightboxProps {
  /** Adres obrazka do pokazania; `null` = zamknięte. */
  src: string | null;
  onClose: () => void;
}

/**
 * Podgląd załączonego obrazka w miejscu, w oknie na całym ekranie.
 *
 * Wcześniej miniatura w zgłoszeniu i w dyskusji była zwykłym linkiem
 * (`<a target="_blank">`) — kliknięcie wyrzucało z panelu na surowy plik w
 * Firebase Storage w nowej karcie. Zgłoszono, że podgląd powinien otwierać się
 * w apce, nie przenosić na Storage. To okno pokazuje obraz na przyciemnionym
 * tle; klik w tło albo Escape zamyka, a sam obraz da się otworzyć w nowej
 * karcie osobnym przyciskiem, gdy ktoś naprawdę chce surowy plik.
 */
export function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape, uwięzienie Tab i powrót fokusu na miniaturę po zamknięciu.
  // `aria-modal` obiecuje czytnikowi, że tła nie ma — bez uwięzienia Tab i tak
  // po nim chodził, więc obietnica była nieprawdziwa: osoba na czytniku nie
  // wiedziała, że podgląd się otworzył, i nie trafiała do „Zamknij".
  useFocusTrap(Boolean(src), panelRef, onClose);

  useEffect(() => {
    if (!src) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [src]);

  if (!src) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 'var(--z-modal)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Podgląd obrazka"
    >
      <div
        className="eter-fade-in absolute inset-0 bg-bg/90 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Pasek akcji: zamknięcie i „otwórz surowy plik" dla tych, którzy
          naprawdę chcą trafić do Storage. */}
      <div
        className="absolute right-3 top-3 flex items-center gap-2"
        style={{ zIndex: 1 }}
      >
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          aria-label="Otwórz obraz w nowej karcie"
          className="rounded-full border border-edge bg-surface/90 p-2 text-ink-dim backdrop-blur transition hover:text-accent"
        >
          <Icon name="upload" size={18} />
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij podgląd"
          className="rounded-full border border-edge bg-surface/90 p-2 text-ink-dim backdrop-blur transition hover:text-ink"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <img
        src={src}
        alt="Podgląd załącznika"
        className="eter-pop relative max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>,
    document.body,
  );
}
