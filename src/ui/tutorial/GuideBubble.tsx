import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '../controls/Button';
import { Icon } from '../icons/Icon';
import { pickPlacement, BUBBLE_WIDTH, BUBBLE_GAP, type Placement } from './placement';
import { findVisible } from './Spotlight';

interface GuideBubbleProps {
  /** Treść wypowiedzi ETER11. */
  message: string;
  /**
   * Klucz animacji pisania. Gdy zmienia się tylko licznik w tym samym
   * komunikacie (etap wymiany: „Zaznaczone: 2" → „3"), klucz zostaje ten sam,
   * więc maszyna do pisania NIE restartuje się przy każdym kliknięciu karty.
   * Domyślnie sam `message` — dla zgodności, gdyby ktoś nie podał klucza.
   */
  typewriterKey?: string;
  /** Numer kroku i ich liczba — pokazują, ile jeszcze zostało. */
  step: number;
  total: number;
  /** Czy krok został wykonany — wtedy bąbel chwali i pozwala iść dalej. */
  done: boolean;
  onNext: () => void;
  /** Powrót do poprzedniego wyjaśnienia. Null ukrywa przycisk. */
  onBack: (() => void) | null;
  onSkip: () => void;
  /** Selektor podświetlonego elementu — bąbel ustawia się obok niego. */
  anchor: string | null;
}

/**
 * Jak często mierzyć położenie celu.
 *
 * Pomiar w każdej klatce dawał ~1900 odczytów układu na sekundę: każdy
 * `getBoundingClientRect` może wymusić przeliczenie układu, a `findVisible`
 * sprawdza wszystkie pasujące elementy (ścianek jest dziesięć, bo plansza
 * renderuje oba układy). Na telefonie było to odczuwalne.
 *
 * 50 ms to trzykrotnie mniej pracy, a przy przewijaniu różnicy nie widać —
 * podświetlenie nadal trzyma się treści.
 */
const MEASURE_MS = 50;

/**
 * ETER11 mówiący do gracza podczas samouczka.
 *
 * Bąbel nigdy nie zasłania tego, co gracz ma kliknąć: sprawdza cztery strony
 * podświetlenia i wybiera pierwszą wolną, a gdy żadna nie pasuje — róg
 * zakrywający najmniej.
 *
 * Tekst pisze się litera po literze. To jedyne miejsce w grze z takim efektem:
 * nadaje ETER11 głos i daje dziecku rytm czytania zamiast ściany tekstu. Klik
 * pokazuje całość, a `prefers-reduced-motion` wyłącza efekt.
 */
export function GuideBubble({
  message,
  typewriterKey,
  step,
  total,
  done,
  onNext,
  onBack,
  onSkip,
  anchor,
}: GuideBubbleProps) {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [typed, setTyped] = useState('');
  const bubbleRef = useRef<HTMLDivElement>(null);
  // Uchwyt bieżącego wystukiwania — żeby klik „pokaż całość" mógł je zatrzymać.
  const typerRef = useRef<number | null>(null);
  // Ostatni klucz animacji — po nim poznajemy, czy to nowy komunikat (pisz od
  // zera), czy tylko zmiana licznika w tym samym (pokaż od razu, bez restartu).
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = typewriterKey ?? message;
    const fresh = lastKeyRef.current !== key;
    lastKeyRef.current = key;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !fresh) {
      // Ten sam komunikat, zmienił się tylko licznik (albo ruch ograniczony) —
      // pokazujemy pełny tekst bez ponownego wystukiwania litera po literze.
      setTyped(message);
      return;
    }

    setTyped('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(message.slice(0, index));
      if (index >= message.length) {
        window.clearInterval(timer);
        typerRef.current = null;
      }
    }, 16);
    typerRef.current = timer;

    return () => window.clearInterval(timer);
  }, [typewriterKey, message]);

  // Klik pokazuje całość — ale najpierw MUSI zatrzymać wystukiwanie. Inaczej
  // interwał na kolejnym ticku wołał `setTyped(message.slice(0, index))`
  // i cofał tekst z powrotem do połowy — klik migał pełną treścią na klatkę.
  const revealAll = () => {
    if (typerRef.current !== null) {
      window.clearInterval(typerRef.current);
      typerRef.current = null;
    }
    setTyped(message);
  };

  useLayoutEffect(() => {
    const place = () => {
      if (!anchor) {
        setPlacement(null);
        return;
      }

      // Ten sam powód co w Spotlight: ścianki istnieją w DOM podwójnie,
      // a tylko jeden układ jest widoczny.
      const element = findVisible(anchor);
      if (!element) {
        setPlacement(null);
        return;
      }

      const target = element.getBoundingClientRect();
      const height = bubbleRef.current?.offsetHeight ?? 190;

      // Ręka nie jest podświetlona, ale gracz sięga po nią w każdym kroku —
      // dymek stojący na kartach blokuje ruch, choć „nie zasłania celu".
      const hand = findVisible('[data-tour="hand"]');
      const avoid = hand ? [hand.getBoundingClientRect()] : [];

      const next = pickPlacement(target, height, window.innerWidth, window.innerHeight, avoid);
      // Render tylko przy realnym przesunięciu — inaczej 60 renderów na
      // sekundę, a dymek i tak stoi w miejscu.
      setPlacement((prev) =>
        prev && Math.abs(prev.top - next.top) < 0.5 && Math.abs(prev.left - next.left) < 0.5
          ? prev
          : next,
      );
    };

    // Ten sam rytm co w Spotlight: klatki, ale nie częściej niż MEASURE_MS.
    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last >= MEASURE_MS) {
        last = now;
        place();
      }
      frame = requestAnimationFrame(loop);
    };
    place();
    frame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frame);
    // Celowo bez `typed`: tekst dopisuje się co 16 ms, a przeliczanie pozycji
    // przy każdej literze to kilkadziesiąt pomiarów układu na sekundę.
    // Rosnącą wysokość dymka dogania pętla powyżej.
  }, [anchor]);

  const typing = typed.length < message.length;

  return (
    <div
      ref={bubbleRef}
      className="eter-pop fixed max-w-[calc(100vw-1.75rem)]"
      style={
        placement
          ? { top: placement.top, left: placement.left, width: BUBBLE_WIDTH, zIndex: 'var(--z-tutorial)' }
          : // Bez podświetlenia: dół ekranu, gdzie nie zasłania stołu.
            {
                bottom: BUBBLE_GAP,
                left: '50%',
                transform: 'translateX(-50%)',
                width: BUBBLE_WIDTH,
                zIndex: 'var(--z-tutorial)',
              }
      }
      role="dialog"
      aria-label="Samouczek"
    >
      <div
        className="overflow-hidden rounded-xl border bg-surface shadow-2xl"
        style={{
          borderColor: done ? 'var(--eter-success)' : 'var(--eter-accent)',
          // Cień odcina bąbel od przyciemnionego tła.
          boxShadow: `0 16px 48px -12px ${done ? 'var(--eter-success)' : 'var(--eter-accent)'}, 0 0 0 1px var(--eter-bg)`,
        }}
      >
        <div className="flex items-start gap-2.5 p-3.5">
          <span
            className="shrink-0 rounded-lg p-1.5"
            style={{
              background: 'var(--eter-raised)',
              color: done ? 'var(--eter-success)' : 'var(--eter-accent)',
            }}
          >
            <Icon name={done ? 'tick' : 'spark'} size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="eter-label"
                style={{ color: done ? 'var(--eter-success)' : 'var(--eter-accent)' }}
              >
                ETER11
              </span>
              <span className="font-mono text-[10px] text-ink-dim">
                {step} / {total}
              </span>
            </div>

            {/* Klik pokazuje całość — czytający szybciej nie czekają. */}
            <p
              className="mt-1 text-sm leading-relaxed"
              onClick={revealAll}
            >
              {typed}
              {typing && <span className="eter-pulse text-accent">▍</span>}
            </p>
          </div>
        </div>

        <div className="h-0.5 bg-edge">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${(step / total) * 100}%`,
              background: done ? 'var(--eter-success)' : 'var(--eter-accent)',
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-edge px-3 py-2">
          <div className="flex items-center gap-1">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} aria-label="Wstecz">
                Wstecz
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Pomiń
            </Button>
          </div>

          {done && (
            <Button variant="primary" size="sm" onClick={onNext}>
              {step === total ? 'Zaczynamy grę' : 'Dalej'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
