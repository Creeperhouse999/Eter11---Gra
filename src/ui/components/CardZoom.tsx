import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Card } from '../../engine/types';
import { Icon, type IconName } from '../icons/Icon';
import { categoryColorVar, categoryLabel, familyLabel } from './categoryStyles';

interface CardZoomProps {
  card: Card | null;
  onClose: () => void;
}

/** Nazwy rodzin — ta sama kolejność co kolory w motywie. */
/**
 * Karta na cały ekran.
 *
 * Karta w ręce ma około 112 px szerokości, a opisy kompetencji bywają na trzy
 * linijki drobnym drukiem. Ośmiolatek czyta wolno i literuje — mrużenie oczu
 * nad kartą, którą właśnie ma zrozumieć, jest dokładnie tym, czego gra
 * edukacyjna robić nie powinna.
 *
 * Otwierane przytrzymaniem, nie kliknięciem: kliknięcie wybiera kartę do
 * zagrania, a podwójne zagrywa ją od razu. Przytrzymanie jest jedynym gestem,
 * który był jeszcze wolny.
 */
export function CardZoom({ card, onClose }: CardZoomProps) {
  useEffect(() => {
    if (!card) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, onClose]);

  if (!card) return null;

  const color = card.family
    ? `var(--eter-family-${card.family})`
    : categoryColorVar(card.category);

  return createPortal(
    <div
      role="dialog"
      aria-label={`Karta ${card.name}`}
      // Zamyka dotknięcie w dowolnym miejscu (także w kartę): dziecko nie
      // szuka krzyżyka, tylko puka w ekran, żeby wrócić do gry. Celowo `onClick`,
      // a nie `onPointerDown` — przewijanie długiego opisu na niskim ekranie
      // zaczyna się od `pointerdown` w treści, więc zamykanie na nim ucinałoby
      // przewijanie, po które okno w ogóle powstało. Gest przewijania (dotknięcie
      // z ruchem) nie wywołuje `click`, samo puknięcie tak — ten sam wzorzec co
      // w oknie Łabędzia.
      onClick={onClose}
      className="eter-fade-in fixed inset-0 flex items-center justify-center bg-bg/85 p-6 backdrop-blur-sm"
      style={{ zIndex: 'var(--z-game-overlay)' }}
    >
      <div
        // `max-h` + kolumna z przewijaną treścią: na niskim ekranie (telefon
        // w poziomie, ~320px wysokości — wspierany przypadek) karta z opisem na
        // trzy linijki była wyższa niż kadr, a wyśrodkowanie w pionie plus
        // `overflow-hidden` ucinały górę i dół — czyli właśnie kategorię i opis,
        // po które dziecko powiększa kartę. Ten sam wzorzec co w oknie Łabędzia.
        className="eter-pop flex max-h-[calc(100dvh-3rem)] w-full max-w-xs flex-col overflow-hidden rounded-2xl border-2 bg-surface shadow-2xl"
        style={{ borderColor: color }}
      >
        <div className="h-2 shrink-0" style={{ background: color }} />

        <div className="overflow-y-auto p-5">
          <span className="eter-label" style={{ color }}>
            {categoryLabel(card.category)}
            {card.family && ` · ${familyLabel(card.family, card.category)}`}
          </span>

          <div className="mt-3 flex items-start gap-3">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--eter-raised)', color }}
            >
              <Icon name={card.icon as IconName} size={32} />
            </span>
            <h2 className="font-display text-xl font-bold leading-tight" style={{ color }}>
              {card.name}
            </h2>
          </div>

          {card.description && (
            <p className="mt-4 text-base leading-relaxed text-ink">{card.description}</p>
          )}
        </div>

        <p className="shrink-0 border-t border-edge px-5 py-2.5 text-center text-xs text-ink-dim">
          Dotknij, żeby wrócić do gry
        </p>
      </div>
    </div>,
    document.body,
  );
}
