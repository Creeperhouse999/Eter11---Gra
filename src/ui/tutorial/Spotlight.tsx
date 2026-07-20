import { useEffect, useState } from 'react';

interface SpotlightProps {
  /** Selektor elementu do podświetlenia. Brak = całe tło przyciemnione. */
  target: string | null;
  /** Margines wokół wyciętego obszaru. */
  padding?: number;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Przyciemnienie ekranu z wyciętym otworem na wskazany element.
 *
 * Otwór robiony jest ogromnym cieniem wokół małego prostokąta, a nie maską
 * SVG — działa w każdej przeglądarce i nie wymaga drugiego drzewa elementów.
 *
 * Warstwa nie przechwytuje kliknięć: gracz ma móc kliknąć podświetlony
 * element, a nie walczyć z zasłoną.
 */
export function Spotlight({ target, padding = 8 }: SpotlightProps) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }

    const measure = () => {
      const element = document.querySelector(target);
      if (!element) {
        setRect(null);
        return;
      }

      const box = element.getBoundingClientRect();
      setRect({
        top: box.top - padding,
        left: box.left - padding,
        width: box.width + padding * 2,
        height: box.height + padding * 2,
      });
    };

    measure();

    // Element może się pojawić dopiero po renderze albo przesunąć przy
    // przewijaniu — mierzymy ponownie, zamiast zapamiętywać raz.
    const interval = window.setInterval(measure, 250);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [target, padding]);

  if (!target) {
    return (
      <div
        aria-hidden="true"
        className="eter-fade-in pointer-events-none fixed inset-0 z-30 bg-bg/70"
      />
    );
  }

  if (!rect) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30">
      <div
        className="absolute rounded-xl transition-all duration-300 ease-out"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          // Cień o promieniu większym niż ekran przyciemnia wszystko dookoła,
          // zostawiając ten prostokąt czysty.
          boxShadow: '0 0 0 9999px rgba(10, 16, 32, 0.78)',
          outline: '2px solid var(--eter-accent)',
          outlineOffset: 2,
        }}
      />
      <div
        className="eter-pulse absolute rounded-xl"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow: '0 0 32px -4px var(--eter-accent)',
        }}
      />
    </div>
  );
}
