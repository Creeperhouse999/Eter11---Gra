import { useEffect, useState } from 'react';
import {
  watchReports,
  setQueueOrder,
  type Report,
  type ReportProgress,
} from '../firebase/reports';
import { buildActivity } from './activityFeed';
import { wgRecznejKolejnosci, poPrzesunieciu } from './reorderQueue';
import { formatDate } from './formatDate';
import { Icon } from '../ui/icons/Icon';

interface ActivityPanelProps {
  /** Skok do zgłoszenia — ten sam mechanizm, co przy powiadomieniach. */
  onOpen: (link: string) => void;
}

/** Kolor plakietki etapu — ten sam, co na liście zgłoszeń. */
const KOLOR: Record<ReportProgress | 'brak', string> = {
  working: 'var(--eter-accent)',
  testing: 'var(--eter-accent-2)',
  queued: 'var(--eter-ink-dim)',
  finished: 'var(--eter-success)',
  brak: 'var(--eter-ink-dim)',
};

/**
 * Aktywność — co się teraz dzieje z pracą nad grą.
 *
 * Adam poprosił: „pokazuj, nad czym w tym momencie pracujesz, a co jest
 * w kolejce (…) chcę widzieć live aktualne Twoje działania". Wcześniej trzeba
 * było przeklikać sześć pod-zakładek zgłoszeń, żeby złożyć sobie ten obraz.
 *
 * Lista jest na żywo (`watchReports`), więc zmiana etapu pojawia się tu bez
 * odświeżania strony — o to właśnie chodziło w słowie „live".
 */
export function ActivityPanel({ onOpen }: ActivityPanelProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [blad, setBlad] = useState<string | null>(null);

  useEffect(() => watchReports(setReports, setBlad), []);

  const lista = buildActivity(reports);
  const teraz = lista.filter((w) => w.progress === 'working' || w.progress === 'testing');

  // Adam poprosił o rozdzielenie kolejki na dwie: to, co wprost oznaczyłem
  // jako „W kolejce" (bo już wiem, że to biorę), i resztę — zgłoszenia,
  // których jeszcze nie tknąłem. Wcześniej leżały razem i nie dało się
  // odróżnić „zaplanowane" od „nieprzejrzane".
  const wKolejce = wgRecznejKolejnosci(
    lista.filter((w) => w.progress === 'queued'),
  );
  const kolejne = wgRecznejKolejnosci(lista.filter((w) => !w.progress));

  /** Przesunięcie pozycji o jedno miejsce w obrębie swojej listy. */
  const przesun = async (
    grupa: typeof lista,
    id: string,
    kierunek: 'gora' | 'dol',
  ) => {
    const rangi = poPrzesunieciu(grupa, id, kierunek);
    if (!rangi) return;
    try {
      await setQueueOrder(rangi);
    } catch {
      setBlad('Nie udało się zapisać kolejności.');
    }
  };

  /**
   * Wiersz listy. `grupa` podana = pozycję da się przestawiać w jej obrębie
   * (Adam: „przesuwając dane ramki w górę i w dół"); brak = wiersz stały,
   * jak w sekcji „W robocie", gdzie kolejność wynika z tego, co robię.
   */
  const wiersz = (w: (typeof lista)[number], grupa?: typeof lista) => (
    <li key={w.id} className="flex items-stretch gap-1">
      {grupa && grupa.length > 1 && (
        <span className="flex shrink-0 flex-col justify-center gap-0.5">
          <button
            type="button"
            aria-label={`Przesuń „${w.title}" w górę`}
            disabled={grupa[0]?.id === w.id}
            onClick={() => void przesun(grupa, w.id, 'gora')}
            className="rounded border border-edge px-1 text-ink-dim transition hover:border-accent hover:text-ink disabled:opacity-30"
          >
            <Icon name="chevronDown" size={12} className="rotate-180" />
          </button>
          <button
            type="button"
            aria-label={`Przesuń „${w.title}" w dół`}
            disabled={grupa[grupa.length - 1]?.id === w.id}
            onClick={() => void przesun(grupa, w.id, 'dol')}
            className="rounded border border-edge px-1 text-ink-dim transition hover:border-accent hover:text-ink disabled:opacity-30"
          >
            <Icon name="chevronDown" size={12} />
          </button>
        </span>
      )}
      <button
        type="button"
        onClick={() => onOpen(w.link)}
        className="flex w-full items-start gap-2 rounded-lg border border-edge bg-surface p-2.5 text-left transition hover:border-accent"
      >
        <span
          className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase"
          style={{
            color: KOLOR[w.progress ?? 'brak'],
            border: `1px solid ${KOLOR[w.progress ?? 'brak']}`,
          }}
        >
          {w.stan}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-bold" style={{ overflowWrap: 'anywhere' }}>
            {w.title}
          </span>
          {(w.priority === 'ultra' || w.priority === 'high') && (
            <span className="font-mono text-[10px] text-danger">
              {w.priority === 'ultra' ? 'krytyczny' : 'wysoki'}
            </span>
          )}
          {/* Adam: „dodaj czas, kiedy zacząłeś robić daną zakładkę" — tylko
              przy tym, co faktycznie jest w robocie. `progressAt` już istnieje
              na zgłoszeniu (ustawiany przy każdej zmianie `progress`),
              wcześniej po prostu nie było go tu widać. */}
          {(w.progress === 'working' || w.progress === 'testing') && w.progressAt && (
            <span className="block font-mono text-[10px] text-ink-dim">
              od {formatDate(w.progressAt)}
            </span>
          )}
        </span>
        <span className="shrink-0 text-ink-dim">
          <Icon name="chevronDown" size={16} className="-rotate-90" />
        </span>
      </button>
    </li>
  );

  return (
    <section>
      <h2 className="font-display text-lg font-bold">Aktywność</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Co się teraz dzieje z Waszymi zgłoszeniami. Lista odświeża się sama —
        kliknij dowolny wpis, żeby przejść wprost do niego.
      </p>

      {blad && (
        <p className="mt-3 text-sm text-danger">Nie udało się wczytać listy: {blad}</p>
      )}

      <h3 className="mt-4 font-display text-sm font-bold">
        W robocie {teraz.length > 0 && <span className="text-ink-dim">({teraz.length})</span>}
      </h3>
      {teraz.length === 0 ? (
        <p className="mt-1 text-sm text-ink-dim">
          Nic nie jest w tej chwili w robocie.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">{teraz.map((w) => wiersz(w))}</ul>
      )}

      <h3 className="mt-5 font-display text-sm font-bold">
        W kolejce {wKolejce.length > 0 && <span className="text-ink-dim">({wKolejce.length})</span>}
      </h3>
      {wKolejce.length === 0 ? (
        <p className="mt-1 text-sm text-ink-dim">Nic nie stoi w kolejce.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">{wKolejce.map((w) => wiersz(w, wKolejce))}</ul>
      )}

      <h3 className="mt-5 font-display text-sm font-bold">
        Lista kolejnych zadań{' '}
        {kolejne.length > 0 && <span className="text-ink-dim">({kolejne.length})</span>}
      </h3>
      <p className="mt-1 text-xs text-ink-dim">
        Zgłoszenia, których jeszcze nie zacząłem. Strzałkami ustawisz, co ma iść
        pierwsze.
      </p>
      {kolejne.length === 0 ? (
        <p className="mt-1 text-sm text-ink-dim">Nic nie czeka.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">{kolejne.map((w) => wiersz(w, kolejne))}</ul>
      )}
    </section>
  );
}
