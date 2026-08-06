import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
/** Margines od krawędzi ekranu, żeby dymek nigdy nie dotykał brzegu. */
const EDGE = 8;

export function Tooltip({ label, children, className = '' }: TooltipProps) {
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  // Krawędzie elementu-kotwicy zapamiętane przy pokazaniu — potrzebne, by po
  // zmierzeniu wysokości dymka zdecydować, czy zmieści się pod, czy nad nim.
  const anchor = useRef<{ top: number; bottom: number; centerX: number } | null>(null);

  const show = () => {
    const element = wrapRef.current;
    if (!element || !label) return;

    const rect = element.getBoundingClientRect();
    anchor.current = { top: rect.top, bottom: rect.bottom, centerX: rect.left + rect.width / 2 };
    setBox({ top: rect.bottom + GAP, left: anchor.current.centerX });
  };

  const hide = () => setBox(null);

  // Po wyrenderowaniu dymka domykamy jego pozycję do ekranu — z realnych
  // wymiarów dymka, nie na oko.
  //
  // Poziomo: środek clampujemy do kadru (element w rogu — np. przełącznik
  // motywu w prawym górnym — inaczej wypychał dymek poza prawą krawędź).
  //
  // Pionowo: domyślnie pod elementem, ale gdy dymek nie mieści się na dole
  // (element przy dolnej krawędzi — np. „Zgłoś błąd" w rogu ekranu gry),
  // odwracamy go NAD element. Wcześniej pozycja była zawsze `rect.bottom + GAP`
  // bez pionowego domknięcia, więc taki dymek lądował pod kadrem i był
  // niewidoczny.
  useLayoutEffect(() => {
    if (!box || !tipRef.current || !anchor.current) return;
    const tip = tipRef.current;
    const half = tip.offsetWidth / 2;
    const height = tip.offsetHeight;

    const left = Math.max(EDGE + half, Math.min(box.left, window.innerWidth - EDGE - half));

    const { top: aTop, bottom: aBottom } = anchor.current;
    let top = aBottom + GAP;
    if (top + height > window.innerHeight - EDGE) {
      const above = aTop - GAP - height;
      top = above >= EDGE ? above : Math.max(EDGE, window.innerHeight - EDGE - height);
    }

    if (Math.abs(left - box.left) > 0.5 || Math.abs(top - box.top) > 0.5) {
      setBox({ top, left });
    }
  }, [box]);

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
            ref={tipRef}
            role="tooltip"
            // Zawija się i ma sufit szerokości = ekran minus 2×EDGE. `nowrap`
            // sprawiał, że długa podpowiedź (podpowiedzi ścianek mają do 120
            // znaków, a na telefonie tylko one niosą treść — tekst w karcie jest
            // ukryty) była szersza niż ekran; wtedy w clampie `min > max`, środek
            // przyklejał się do lewej, a prawy brzeg uciekał poza kadr. Ze
            // zwijaniem realna szerokość mieści się w kadrze i clamp działa.
            //
            // `w-max` jest tu konieczne, nie kosmetyczne: przy `width: auto`
            // (domyślne) i pozycjonowaniu samym `left` (bez `right`) przeglądarka
            // liczy dostępną szerokość jako odległość od `left` do prawej
            // krawędzi ekranu — mimo że `-translate-x-1/2` wizualnie centruje
            // dymek na `left`. Dla elementu blisko prawej krawędzi (np.
            // przełącznik motywu w rogu) ta „dostępna" szerokość wychodziła
            // parunastopikselowa, a krótka etykieta („Włącz tryb ciemny")
            // zawijała się w wąską wieżyczkę z 2-3 znaków w linii, zamiast
            // zmieścić się w jednej-dwóch liniach. `w-max` liczy szerokość
            // z treści, niezależnie od `left` — `max-w-*` wyżej dalej ją tnie
            // dla naprawdę długich podpowiedzi.
            //
            // `eter-fade-in`, NIE `eter-pop`: `eter-pop` kończy się klatką
            // `to { transform: none }`, a animacja NADPISUJE `transform`
            // z klasy statycznej przez cały czas trwania i po niej (fill-mode
            // `both`) — więc `-translate-x-1/2` wyżej i tak nigdy by nie
            // zadziałał, dymek zostawałby przyklejony lewym brzegiem do
            // `left` zamiast wycentrowany, i uciekał poza ekran (zgłoszenie
            // „Wychodzi poza"). `eter-fade-in` rusza tylko `opacity`, więc nie
            // koliduje z transformem potrzebnym do centrowania.
            className="eter-fade-in pointer-events-none fixed w-max max-w-[calc(100vw-16px)] -translate-x-1/2 whitespace-normal break-words rounded-md border border-edge bg-raised px-2 py-1 font-mono text-[11px] text-ink shadow-xl"
            style={{ top: box.top, left: box.left, zIndex: 'var(--z-tooltip)' }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
