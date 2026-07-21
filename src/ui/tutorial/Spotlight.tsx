import { useEffect, useState } from 'react';

interface SpotlightProps {
  /** Selektor elementu do podświetlenia. Brak = całe tło przyciemnione. */
  target: string | null;
  /**
   * Drugi podświetlony element — miejsce, SKĄD gracz ma przeciągnąć kartę.
   * Przy przeciąganiu widać wtedy oba końce ruchu, a między nimi strzałkę.
   */
  from?: string | null;
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
 * Pierwszy WIDOCZNY element pasujący do selektora.
 *
 * Plansza renderuje ścianki dwa razy — układ stołowy i wąski — a przełącza
 * je CSS. `querySelector` brał zawsze pierwszy w kodzie, czyli desktopowy,
 * który na telefonie ma `display: none` i zerowe wymiary. Efekt: ETER11
 * mówił „ścianka zaświeciła", a nic się nie świeciło.
 */
export function findVisible(selector: string): Element | null {
  const all = document.querySelectorAll(selector);
  for (const element of all) {
    const box = element.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) return element;
  }
  return null;
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
export function Spotlight({ target, from = null, padding = 8 }: SpotlightProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [fromRect, setFromRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }

    const boxOf = (selector: string): Rect | null => {
      const element = findVisible(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        top: box.top - padding,
        left: box.left - padding,
        width: box.width + padding * 2,
        height: box.height + padding * 2,
      };
    };

    /** Równe prostokąty do 0.5 px — poniżej tego nie widać różnicy. */
    const same = (a: Rect | null, b: Rect | null) => {
      if (a === b) return true;
      if (!a || !b) return false;
      return (
        Math.abs(a.top - b.top) < 0.5 &&
        Math.abs(a.left - b.left) < 0.5 &&
        Math.abs(a.width - b.width) < 0.5 &&
        Math.abs(a.height - b.height) < 0.5
      );
    };

    const measure = () => {
      const next = boxOf(target);
      const nextFrom = from ? boxOf(from) : null;
      setRect((prev) => (same(prev, next) ? prev : next));
      setFromRect((prev) => (same(prev, nextFrom) ? prev : nextFrom));
    };

    // Pomiar w każdej klatce, nie co ćwierć sekundy.
    //
    // Interwał sprawiał, że przy przewijaniu podświetlenie skakało za treścią
    // z opóźnieniem — stąd wrażenie „latania". `requestAnimationFrame` mierzy
    // w tym samym rytmie, w jakim przeglądarka rysuje stronę, więc ramka trzyma
    // się elementu. Aktualizujemy stan tylko przy realnej zmianie, żeby nie
    // wywoływać renderu 60 razy na sekundę bez powodu.
    let frame = 0;
    const loop = () => {
      measure();
      frame = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(frame);
  }, [target, from, padding]);

  if (!target) {
    return (
      <div
        aria-hidden="true"
        className="eter-fade-in pointer-events-none fixed inset-0 z-30 bg-bg/70"
      />
    );
  }

  if (!rect) return null;

  // Dwa otwory naraz wymagają maski SVG: trik z ogromnym cieniem potrafi
  // wyciąć tylko jeden prostokąt.
  const holes = fromRect ? [rect, fromRect] : [rect];
  const arrow = fromRect ? arrowBetween(fromRect, rect) : null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30">
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <mask id="eter-spotlight">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {holes.map((hole, index) => (
              <rect
                key={index}
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx={12}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(10, 16, 32, 0.78)"
          mask="url(#eter-spotlight)"
        />

        {/* Strzałka od karty do ścianki: przy przeciąganiu sam obrys nie
            mówi, w którą stronę ma pójść ruch. */}
        {arrow && (
          <g className="eter-pulse">
            <line
              x1={arrow.x1}
              y1={arrow.y1}
              x2={arrow.x2}
              y2={arrow.y2}
              stroke="var(--eter-accent)"
              strokeWidth={2.5}
              strokeDasharray="7 6"
              strokeLinecap="round"
            />
            <polygon
              points={arrow.head}
              fill="var(--eter-accent)"
            />
          </g>
        )}
      </svg>

      {/* Etykieta przy grocie: sama linia nie mówi, że kartę można też
          po prostu upuścić, a nie tylko kliknąć. */}
      {arrow && (
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[11px] font-bold"
          style={{
            top: (arrow.y1 + arrow.y2) / 2,
            left: (arrow.x1 + arrow.x2) / 2,
            background: 'var(--eter-accent)',
            color: 'var(--eter-bg)',
          }}
        >
          przeciągnij tutaj
        </span>
      )}

      {holes.map((hole, index) => (
        <div
          key={index}
          className="absolute rounded-xl"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            // Cel jaśniejszy niż źródło — gracz ma wiedzieć, dokąd celuje.
            outline: `2px ${index === 0 ? 'solid' : 'dashed'} var(--eter-accent)`,
            outlineOffset: 2,
            boxShadow: index === 0 ? '0 0 32px -4px var(--eter-accent)' : 'none',
            opacity: index === 0 ? 1 : 0.75,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Strzałka prowadząca od jednego obszaru do drugiego.
 *
 * Prowadzimy ją między środkami, ale kończymy na krawędzi celu — linia
 * wchodząca w środek podświetlenia zasłaniałaby to, co pokazuje.
 */
function arrowBetween(from: Rect, to: Rect) {
  const fromX = from.left + from.width / 2;
  const fromY = from.top + from.height / 2;
  const toX = to.left + to.width / 2;
  const toY = to.top + to.height / 2;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  // Odsuwamy końce od obu prostokątów, żeby strzałka ich nie przecinała.
  const startGap = Math.min(from.width, from.height) / 2 + 6;
  const endGap = Math.min(to.width, to.height) / 2 + 10;

  const x1 = fromX + ux * startGap;
  const y1 = fromY + uy * startGap;
  const x2 = toX - ux * endGap;
  const y2 = toY - uy * endGap;

  // Grot: trójkąt na końcu, obrócony zgodnie z kierunkiem.
  const size = 9;
  const px = -uy;
  const py = ux;
  const head = [
    `${x2 + ux * size},${y2 + uy * size}`,
    `${x2 - ux * 2 + px * size * 0.7},${y2 - uy * 2 + py * size * 0.7}`,
    `${x2 - ux * 2 - px * size * 0.7},${y2 - uy * 2 - py * size * 0.7}`,
  ].join(' ');

  return { x1, y1, x2, y2, head };
}
