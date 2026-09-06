import { useState } from 'react';
import type { GameState } from '../../engine/types';
import { komentarz, odpowiedzNa, ZASADY } from '../narrator';
import { czyOdblokowane } from '../aiUnlock';
import { Icon } from '../icons/Icon';

interface EterPanelProps {
  state: GameState;
  /** Kto patrzy — dzięki temu ETER mówi „Ty masz ruch", nie „Adam ma ruch". */
  viewerId?: string;
}

/**
 * Okno ETER — głos gry, który mówi, co się dzieje i co teraz zrobić.
 *
 * Adam poprosił: „zrób przed rozpoczęciem gry i w trakcie gry okienko czatbota,
 * aby gracz mógł zadać pytanie do ETER o zasady gry (…) i zobaczyć bieżący
 * komentarz ETER na temat tego, co się dzieje w grze (…) niczym narrator filmu
 * (…) plus aby był komentarz, co teraz kto musi zrobić w grze".
 *
 * O kształcie też napisał wprost: „ważne, aby ta ramka wyglądała tak, że widać
 * zmieniające się zdania poprzez widok 2 zdań (na kompie) i 1 zdania na mobile,
 * i poprzez kliknięcie w ramkę móc przeczytać więcej".
 *
 * Zwinięte okno pokazuje więc dwa zdania na szerokim ekranie i jedno na wąskim
 * (o podziale decyduje CSS, nie JavaScript — inaczej trzeba by mierzyć okno
 * i zgadywać przy obracaniu telefonu). Kliknięcie rozwija: pełny komentarz plus
 * pytania o zasady.
 *
 * Komentarz nie kosztuje ani grosza: liczy się ze stanu gry, który silnik i tak
 * zna (patrz `narrator.ts`). Alan przy tym zgłoszeniu napisał tylko „Koszty…
 * i jeszcze raz koszty…".
 */
export function EterPanel({ state, viewerId }: EterPanelProps) {
  const [otwarte, setOtwarte] = useState(false);
  const [pytanie, setPytanie] = useState('');
  const [wybrane, setWybrane] = useState<string | null>(null);
  /** Odpowiedź z modelu — tylko gdy listy zasad zabrakło. */
  const [odAi, setOdAi] = useState<string | null>(null);
  const [czeka, setCzeka] = useState(false);

  const { narracja, wskazowka } = komentarz(state, viewerId);
  const odpowiedz = wybrane ? odpowiedzNa(wybrane) : null;

  /**
   * Pytanie gracza.
   *
   * Kolejność wynika wprost z „Koszty… i jeszcze raz koszty…": najpierw
   * darmowa odpowiedź z listy zasad, a model dopiero wtedy, gdy jej nie ma
   * I gdy ktoś odblokował ETER kodem w menu.
   */
  const zapytaj = (tekst: string) => {
    setWybrane(tekst);
    setPytanie('');
    setOdAi(null);

    if (odpowiedzNa(tekst) || !czyOdblokowane()) return;

    setCzeka(true);
    void import('../../firebase/eterAi')
      .then(({ zapytajEter }) => zapytajEter(tekst, state))
      .then((wynik) => setOdAi(wynik.tekst))
      .catch(() =>
        setOdAi('Nie mogę teraz odpowiedzieć. Zapytaj o coś z listy poniżej.'),
      )
      .finally(() => setCzeka(false));
  };

  if (!otwarte) {
    return (
      <button
        type="button"
        onClick={() => setOtwarte(true)}
        aria-label="Otwórz okno ETER"
        className="eter-fade-in fixed inset-x-2 bottom-2 flex items-start gap-2 rounded-xl border border-accent/40 bg-surface/95 p-2.5 text-left shadow-lg backdrop-blur transition hover:border-accent sm:inset-x-auto sm:right-3 sm:bottom-3 sm:max-w-sm"
        style={{ zIndex: 'var(--z-hint)' }}
      >
        <span className="mt-0.5 shrink-0 text-accent">
          <Icon name="spark" size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs leading-snug font-semibold" style={{ overflowWrap: 'anywhere' }}>
            {narracja}
          </span>
          {/* Drugie zdanie tylko na szerokim ekranie — Adam poprosił o „2 zdania
              na kompie i 1 na mobile". O podziale decyduje CSS, nie pomiar okna
              w JavaScripcie: inaczej po obróceniu telefonu trzeba by zgadywać. */}
          <span className="mt-0.5 hidden text-xs leading-snug text-ink-dim sm:block">
            {wskazowka}
          </span>
        </span>
        <span className="shrink-0 text-ink-dim">
          <Icon name="chevronDown" size={14} className="rotate-180" />
        </span>
      </button>
    );
  }

  return (
    <div
      className="eter-fade-in fixed inset-x-2 bottom-2 rounded-xl border border-accent/40 bg-surface shadow-xl sm:inset-x-auto sm:right-3 sm:bottom-3 sm:w-96"
      style={{ zIndex: 'var(--z-game-overlay)' }}
      role="dialog"
      aria-label="ETER11 — pomoc i komentarz"
    >
      <div className="flex items-center justify-between border-b border-edge px-3 py-2">
        <span className="flex items-center gap-1.5 font-display text-sm font-bold text-accent">
          <Icon name="spark" size={16} />
          ETER11
        </span>
        <button
          type="button"
          onClick={() => setOtwarte(false)}
          aria-label="Zamknij okno ETER"
          className="text-ink-dim transition hover:text-ink"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-3">
        <p className="text-sm leading-snug font-semibold">{narracja}</p>
        <p className="mt-1 text-sm leading-snug text-ink-dim">{wskazowka}</p>

        <div className="mt-3 border-t border-edge pt-3">
          <span className="eter-label text-[10px]">Zapytaj o zasady</span>

          {odpowiedz ? (
            <div className="mt-2">
              <p className="text-xs font-semibold text-accent">{odpowiedz.pytanie}</p>
              <p className="mt-1 text-sm leading-snug">{odpowiedz.odpowiedz}</p>
              <button
                type="button"
                onClick={() => setWybrane(null)}
                className="mt-2 text-xs text-ink-dim underline transition hover:text-ink"
              >
                Zapytaj o coś innego
              </button>
            </div>
          ) : (
            <>
              {/* Pytanie własnymi słowami: dziecko rzadko trafia w gotową
                  formułkę, a przewijanie listy ośmiu pozycji na telefonie jest
                  gorsze niż wpisanie dwóch słów. */}
              <form
                className="mt-2 flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (pytanie.trim()) zapytaj(pytanie);
                }}
              >
                <input
                  value={pytanie}
                  onChange={(e) => setPytanie(e.target.value)}
                  placeholder="O co chcesz zapytać?"
                  aria-label="Pytanie do ETER"
                  className="min-w-0 flex-1 rounded-lg border border-edge bg-raised px-2.5 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={pytanie.trim().length === 0}
                  className="rounded-lg border border-edge px-2.5 py-1.5 text-sm transition hover:border-accent disabled:opacity-40"
                >
                  Pytaj
                </button>
              </form>

              {/* Model odpowiada tylko wtedy, gdy listy zasad zabrakło,
                  a ktoś odblokował ETER kodem w menu. */}
              {czeka && (
                <p className="mt-2 text-xs text-ink-dim">ETER się zastanawia…</p>
              )}

              {odAi && !czeka && (
                <div className="mt-2 rounded-lg border border-accent/30 bg-raised p-2.5">
                  <p className="text-sm leading-snug">{odAi}</p>
                </div>
              )}

              {/* Nierozpoznane pytanie bez ETER: mówimy wprost, że nie wiemy.
                  Zmyślona odpowiedź jest gorsza niż jej brak — dziecko w nią
                  uwierzy. */}
              {wybrane !== null && !czeka && !odAi && (
                <p className="mt-2 text-xs text-ink-dim">
                  Nie znam odpowiedzi na to pytanie. Wybierz coś z listy poniżej.
                </p>
              )}

              <ul className="mt-2 space-y-1">
                {ZASADY.map((zasada) => (
                  <li key={zasada.pytanie}>
                    <button
                      type="button"
                      onClick={() => zapytaj(zasada.pytanie)}
                      className="w-full rounded-lg border border-edge px-2.5 py-1.5 text-left text-xs transition hover:border-accent"
                    >
                      {zasada.pytanie}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
