import { useEffect, useState } from 'react';
import type { BlackSwanEvent, BlackSwanKind } from '../../engine/types';
import { Button } from '../controls/Button';
import { Icon } from '../icons/Icon';

interface BlackSwanBannerProps {
  events: BlackSwanEvent[];
  onDismiss: () => void;
}

/**
 * Co dokładnie zrobił Łabędź — językiem gracza, nie nazwą wariantu.
 *
 * Sam „doubleRequirements" nic dziecku nie mówi; komunikat musi
 * powiedzieć, co się zmieniło na planszy i co z tego wynika dla ruchu.
 */
const EFFECTS: Record<BlackSwanKind, { title: string; body: string }> = {
  extraProblem: {
    title: 'Pojawił się drugi problem',
    body: 'Na stole leży teraz dodatkowy problem. Żeby wygrać misję, musicie zamknąć ścianki obu.',
  },
  doubleRequirements: {
    title: 'Wymagania się podwoiły',
    body: 'Każda niezamknięta ścianka potrzebuje teraz dwóch kart zamiast jednej. Te już zamknięte zostają.',
  },
  swapHands: {
    title: 'Wymiana rąk',
    body: 'Wszyscy oddali swoje karty sąsiadowi zgodnie z ruchem wskazówek zegara. Sprawdź, co masz teraz w ręku.',
  },
};

/**
 * Powiadomienie o Czarnym Łabędziu, który sam wszedł do gry.
 *
 * Wjeżdża z góry i zostaje, dopóki gracz go nie zamknie. Świadomie nie
 * znika samo: karta zmienia zasady w trakcie misji, a komunikat, który
 * zgaśnie po trzech sekundach, zostawia gracza z planszą, której nie
 * rozumie. Blokuje też kliknięcia pod spodem, żeby nikt nie wykonał
 * ruchu, nie przeczytawszy, co się właśnie stało.
 */
export function BlackSwanBanner({ events, onDismiss }: BlackSwanBannerProps) {
  const [entered, setEntered] = useState(false);

  // Wejście animujemy po pierwszym renderze — inaczej element pojawia się
  // od razu na docelowej pozycji i ruchu nie widać.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Escape zamyka tak samo jak przycisk — to jest okno modalne.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  if (events.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label="Czarny Łabędź"
      onClick={onDismiss}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-bg/70 transition-opacity duration-300"
        style={{ opacity: entered ? 1 : 0 }}
      />

      <div
        // Klik w treść nie zamyka — zamykają tło i przycisk.
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-md rounded-xl border-2 bg-surface shadow-2xl transition-all duration-300"
        style={{
          borderColor: 'var(--eter-danger)',
          boxShadow: '0 20px 60px -15px var(--eter-danger)',
          transform: entered ? 'translateY(0)' : 'translateY(-140%)',
          opacity: entered ? 1 : 0,
        }}
      >
        <div className="flex items-start gap-3 border-b border-edge p-4">
          <span className="shrink-0 rounded-lg p-2" style={{ background: 'var(--eter-raised)', color: 'var(--eter-danger)' }}>
            <Icon name="clash" size={22} />
          </span>
          <div className="min-w-0">
            <span className="eter-label" style={{ color: 'var(--eter-danger)' }}>
              Czarny Łabędź
            </span>
            <p className="font-display text-lg font-bold leading-tight">
              {events.length === 1
                ? 'Coś poszło nie tak'
                : `${events.length} niespodzianki naraz`}
            </p>
          </div>
        </div>

        <ul className="space-y-3 p-4">
          {events.map((event, index) => {
            const effect = EFFECTS[event.kind];
            return (
              <li key={`${event.playerId}-${index}`}>
                <p className="text-sm">
                  <strong>{event.playerName}</strong> dobrał kartę{' '}
                  <strong>{event.cardName}</strong>.
                </p>
                {event.applied ? (
                  <div className="mt-1.5 rounded-lg border border-edge bg-raised p-2.5">
                    <p className="text-sm font-bold" style={{ color: 'var(--eter-danger)' }}>
                      {effect.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-ink-dim">
                      {effect.body}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-ink-dim">
                    Tym razem bez skutku — plansza zostaje bez zmian.
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end border-t border-edge px-4 py-3">
          <Button variant="primary" onClick={onDismiss} autoFocus>
            Rozumiem, gramy dalej
          </Button>
        </div>
      </div>
    </div>
  );
}
