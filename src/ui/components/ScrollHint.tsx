import { useEffect, useState } from 'react';
import { Icon } from '../icons/Icon';

/**
 * Strzałka „jest coś niżej", gdy strona nie mieści się na ekranie.
 *
 * Plansza jest projektowana tak, żeby zmieścić się w całości, ale przy
 * dużej czcionce systemowej, poziomym telefonie albo pięciu zamkniętych
 * ściankach potrafi urosnąć. Gracz, który nie wie, że coś jest niżej,
 * po prostu tego nie znajdzie.
 *
 * Znika, gdy nie ma czego przewijać albo gdy gracz już przewinął — wtedy
 * wie o dolnej części ekranu i przypominanie tylko przeszkadza.
 */
export function ScrollHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const doc = document.documentElement;
      const hidden = doc.scrollHeight - doc.clientHeight;
      const scrolled = window.scrollY;
      // 40 px zapasu: przy różnicy mniejszej niż wysokość jednego wiersza
      // strzałka wskazywałaby na nic.
      setVisible(hidden > 40 && scrolled < 24);
    };

    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);

    // Plansza zmienia wysokość w trakcie gry — zamknięta ścianka rośnie.
    // ResizeObserver bywa niedostępny (starsze przeglądarki, środowisko
    // testowe), więc wtedy zostaje samo nasłuchiwanie przewijania.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check);
    observer?.observe(document.body);

    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      observer?.disconnect();
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() =>
        window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' })
      }
      className="eter-fade-in fixed bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-accent bg-surface px-3 py-1.5 text-xs shadow-lg"
      style={{ zIndex: 'var(--z-hint)', boxShadow: '0 6px 24px -8px var(--eter-accent)' }}
    >
      <span className="eter-pulse text-accent">
        <Icon name="chevronDown" size={14} />
      </span>
      Niżej jest więcej
    </button>
  );
}
