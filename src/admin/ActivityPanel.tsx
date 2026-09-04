import { useEffect, useState } from 'react';
import { watchReports, type Report, type ReportProgress } from '../firebase/reports';
import { buildActivity } from './activityFeed';
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
  const kolejka = lista.filter((w) => w.progress !== 'working' && w.progress !== 'testing');

  const wiersz = (w: (typeof lista)[number]) => (
    <li key={w.id}>
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
        <ul className="mt-2 space-y-1.5">{teraz.map(wiersz)}</ul>
      )}

      <h3 className="mt-5 font-display text-sm font-bold">
        W kolejce {kolejka.length > 0 && <span className="text-ink-dim">({kolejka.length})</span>}
      </h3>
      {kolejka.length === 0 ? (
        <p className="mt-1 text-sm text-ink-dim">Kolejka pusta.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">{kolejka.map(wiersz)}</ul>
      )}
    </section>
  );
}
