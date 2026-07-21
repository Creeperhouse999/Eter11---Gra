import { useEffect, useState } from 'react';
import { contentStats, type StatEntry } from './contentStats';
import { loadPlayStats, EMPTY_STATS, type PlayStats } from '../firebase/playStats';
import { loadReports, type Report } from '../firebase/reports';
import { loadDiscussions, type Discussion } from '../firebase/discussions';
import type { GameContent } from '../firebase/validate';
import { Icon } from '../ui/icons/Icon';

interface StatsPanelProps {
  content: GameContent;
}

/** Jedna liczba z podpisem. */
function Tile({ entry }: { entry: StatEntry }) {
  return (
    <div
      className={[
        'rounded-lg border bg-surface p-3',
        entry.warn ? 'border-accent-2' : 'border-edge',
      ].join(' ')}
    >
      <p className="font-mono text-2xl font-bold" style={{ color: entry.warn ? 'var(--eter-accent-2)' : 'var(--eter-accent)' }}>
        {entry.value}
      </p>
      <p className="mt-0.5 text-sm">{entry.label}</p>
      {entry.note && (
        <p className="mt-0.5 text-[11px] leading-snug text-ink-dim">{entry.note}</p>
      )}
    </div>
  );
}

/**
 * Statystyki gry i pracy zespołu.
 *
 * Liczby z treści liczą się na miejscu przy każdym otwarciu — treść zmienia
 * się w tym samym panelu, więc zapisana wartość byłaby nieaktualna, zanim
 * redaktor skończy pisać.
 *
 * Liczniki rozgrywek przychodzą z bazy i są jedynymi, których nie da się
 * wyliczyć z zawartości. Nie ma w nich nic o graczach: cztery liczby zbiorcze,
 * żadnych imion ani identyfikatorów.
 */
export function StatsPanel({ content }: StatsPanelProps) {
  const [play, setPlay] = useState<PlayStats>(EMPTY_STATS);
  const [reports, setReports] = useState<Report[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    void Promise.all([loadPlayStats(), loadReports(), loadDiscussions()])
      .then(([stats, reportList, discussionList]) => {
        if (ignore) return;
        setPlay(stats);
        setReports(reportList);
        setDiscussions(discussionList);
        setLoading(false);
      })
      .catch(() => {
        // Statystyka jest ciekawostką — gdy odczyt padnie, pokazujemy to,
        // co da się policzyć z treści, zamiast straszyć błędem.
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const groups = contentStats(content);

  const winRate =
    play.finished > 0 ? Math.round((play.won / play.finished) * 100) : null;
  const messages = discussions.reduce((sum, d) => sum + d.messages.length, 0);
  const openReports = reports.filter((r) => r.status === 'new' || r.status === 'rejected');
  const doneReports = reports.filter((r) => r.status === 'done');

  return (
    <section aria-label="Statystyki">
      <h2 className="font-display text-lg font-bold">Statystyki</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Co jest w grze, ile w niej tekstu i jak idzie praca zespołu.
      </p>

      <h3 className="mt-5 flex items-center gap-2 font-display font-bold">
        <span className="text-accent">
          <Icon name="rocket" size={16} />
        </span>
        Rozgrywki
      </h3>
      {loading ? (
        <p className="mt-2 text-sm text-ink-dim">Wczytuję…</p>
      ) : (
        <div className="eter-stagger mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            entry={{
              label: 'Ukończone partie',
              value: String(play.finished),
              note: play.finished === 0 ? 'nikt jeszcze nie doszedł do końca' : undefined,
            }}
          />
          <Tile
            entry={{
              label: 'Wygrane drużyny',
              value: winRate === null ? '—' : `${winRate}%`,
              note:
                winRate === null
                  ? 'za mało partii'
                  : `${play.won} z ${play.finished} · cel: 60–75%`,
              // Poza widełkami gra jest za łatwa albo za trudna, a to
              // najważniejsza liczba dla osoby układającej zasady.
              warn: winRate !== null && (winRate < 60 || winRate > 75),
            }}
          />
          <Tile
            entry={{
              label: 'Rozwiązane problemy',
              value: String(play.missionsSolved),
              note:
                play.finished > 0
                  ? `średnio ${(play.missionsSolved / play.finished).toFixed(1)} na partię`
                  : undefined,
            }}
          />
          <Tile
            entry={{
              label: 'Ukończone samouczki',
              value: String(play.tutorialsFinished),
              note: 'ile osób przeszło naukę do końca',
            }}
          />
        </div>
      )}

      <h3 className="mt-6 flex items-center gap-2 font-display font-bold">
        <span className="text-accent">
          <Icon name="megaphone" size={16} />
        </span>
        Praca zespołu
      </h3>
      <div className="eter-stagger mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          entry={{
            label: 'Zgłoszenia',
            value: String(reports.length),
            note: `${reports.filter((r) => r.kind === 'bug').length} błędów, ${reports.filter((r) => r.kind === 'idea').length} pomysłów`,
          }}
        />
        <Tile
          entry={{
            label: 'Czeka na programistę',
            value: String(openReports.length),
            warn: openReports.length > 0,
            note: openReports.length === 0 ? 'nic nie wisi' : undefined,
          }}
        />
        <Tile
          entry={{
            label: 'Potwierdzone naprawy',
            value: String(doneReports.length),
            note: 'zgłaszający sprawdził i działa',
          }}
        />
        <Tile
          entry={{
            label: 'Wątki dyskusji',
            value: String(discussions.length),
            note: `${messages} wypowiedzi, ${discussions.filter((d) => d.closed).length} ustalonych`,
          }}
        />
      </div>

      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="mt-6 flex items-center gap-2 font-display font-bold">
            <span className="text-accent">
              <Icon name="chart" size={16} />
            </span>
            {group.title}
          </h3>
          <div className="eter-stagger mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.entries.map((entry) => (
              <Tile key={entry.label} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
