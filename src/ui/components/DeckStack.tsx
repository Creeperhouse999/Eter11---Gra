import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons/Icon';

interface DeckStackProps {
  /** Ile kart zostało w talii dobierania. */
  count: number;
  /** Etykieta pod stosem — „Talia" albo „Problemy". */
  label: string;
  /** Ikona na rewersie — odróżnia talię kart od talii problemów. */
  icon?: 'spark' | 'clash';
}

/**
 * Widoczny stos kart, z którego karta wylatuje, gdy talia się kurczy.
 *
 * Wcześniej talia była tylko liczbą w nagłówku — dziecko nie widziało, że
 * dobranie coś z niej zabiera. Tu stos to kilka nałożonych rewersów; gdy
 * licznik spada, jeden rewers odlatuje w górę i gaśnie, więc widać, że karta
 * „poszła do ręki". Grubość stosu maleje razem z liczbą kart.
 *
 * Rewersy są czysto dekoracyjne (`aria-hidden`); liczbę czyta czytnik ekranu
 * z etykiety pod spodem.
 */
export function DeckStack({ count, label, icon = 'spark' }: DeckStackProps) {
  const previous = useRef(count);
  // Ile kart odlatuje właśnie teraz — tyle animowanych rewersów w locie.
  const [flying, setFlying] = useState(0);

  useEffect(() => {
    const drawn = previous.current - count;
    previous.current = count;
    // Tylko przy ubytku (dobranie). Dosypanie ze stosu odrzuconych — gdy
    // talia rośnie — nie animujemy, żeby nie mylić kierunku.
    if (drawn <= 0) return;

    // Najwyżej trzy lecące naraz: więcej i tak nie widać, a przy recyklingu
    // talii ubytek bywa duży.
    setFlying(Math.min(drawn, 3));
    const timer = window.setTimeout(() => setFlying(0), 500);
    return () => window.clearTimeout(timer);
  }, [count]);

  // Grubość stosu: liczba widocznych warstw rewersu skaluje się z liczbą
  // kart, ale najwyżej pięć — pełna talia i tak wygląda jak „gruby stos".
  const layers = Math.max(1, Math.min(5, Math.ceil(count / 12)));
  const empty = count === 0;
  // Ostrzeżenie, gdy kart zostało mało — próg niski, bo talia krąży
  // (odrzucone wracają), więc realne wyczerpanie jest rzadkie.
  const low = count > 0 && count <= 5;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-14 w-10">
        {empty ? (
          <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-edge text-ink-dim">
            <Icon name="close" size={14} />
          </div>
        ) : (
          <>
            {/* Warstwy stosu — każda przesunięta o parę pikseli, żeby dać
                wrażenie grubości. */}
            {Array.from({ length: layers }).map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="absolute inset-0 rounded-md border border-edge"
                style={{
                  transform: `translate(${i * 1.5}px, ${-i * 1.5}px)`,
                  background: 'var(--eter-raised)',
                  boxShadow: i === layers - 1 ? '0 2px 8px -2px rgba(0,0,0,0.4)' : undefined,
                }}
              />
            ))}

            {/* Wierzch stosu z ikoną — to on „odlatuje" wizualnie.
                Gdy kart zostało mało, świeci ostrzegawczo: dziecko widzi, że
                talia się kończy, zanim się skończy. */}
            <div
              aria-hidden="true"
              className={[
                'absolute inset-0 flex items-center justify-center rounded-md border',
                low ? 'border-accent-2 text-accent-2' : 'border-accent/40 text-accent',
              ].join(' ')}
              style={{
                transform: `translate(${(layers - 1) * 1.5}px, ${-(layers - 1) * 1.5}px)`,
                background: 'var(--eter-surface)',
              }}
            >
              <Icon name={icon} size={16} />
            </div>

            {/* Rewersy w locie: od stosu w górę i gasną. */}
            {Array.from({ length: flying }).map((_, i) => (
              <div
                key={`fly-${i}`}
                aria-hidden="true"
                className="eter-deck-fly absolute inset-0 flex items-center justify-center rounded-md border border-accent bg-surface text-accent"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Icon name={icon} size={16} />
              </div>
            ))}
          </>
        )}
      </div>

      <span className="font-mono text-[10px] text-ink-dim">
        {label} · {count}
      </span>
    </div>
  );
}
