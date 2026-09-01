import { useEffect, useMemo, useRef, useState } from 'react';
import {
  markChecked,
  saveSession,
  watchChecked,
  watchSessions,
  type BoredomSession,
  type BoredomVerdict,
} from '../firebase/boredom';
import { addReport, watchReports, type Report } from '../firebase/reports';
import type { Role } from '../firebase/roles';
import type { GameContent } from '../firebase/validate';
import { Alert } from '../ui/controls/Alert';
import { Button } from '../ui/controls/Button';
import { TextArea } from '../ui/controls/Field';
import { useToast } from '../ui/controls/Toast';
import { Icon, type IconName } from '../ui/icons/Icon';
import { counted } from '../ui/plural';
import { formatDate } from './formatDate';
import { buildBoredomQueue, type BoredomKind } from './boredomQueue';

interface BoredomPanelProps {
  content: GameContent;
  role: Role;
  /** Imię zalogowanego — podpisuje odhaczenia i sesję. */
  author: string;
  /** Otwiera miejsce, którego dotyczy fiszka. */
  onOpen: (link: string) => void;
}

/** Jak wygląda fiszka danego rodzaju — ikona i kolor akcentu. */
const KIND_STYLE: Record<BoredomKind, { icon: IconName; color: string; label: string }> = {
  blocker: { icon: 'warning', color: 'var(--eter-danger)', label: 'Blokuje zapis' },
  verify: { icon: 'flask', color: 'var(--eter-cat-social)', label: 'Do sprawdzenia' },
  draft: { icon: 'bulb', color: 'var(--eter-accent-2)', label: 'Robocze' },
  empty: { icon: 'clipboard', color: 'var(--eter-ink-dim)', label: 'Puste pole' },
};

/** Czas trwania po ludzku: „6 min 20 s". */
function czasTrwania(sekundy: number): string {
  const min = Math.floor(sekundy / 60);
  const sek = sekundy % 60;
  if (min === 0) return `${sek} s`;
  return `${min} min ${sek} s`;
}

/**
 * Strefa Nudy.
 *
 * Pomysł Alana: zamiast szukać po zakładkach, co jeszcze wymaga uwagi,
 * przeklikujesz fiszki, kiedy masz chwilę. Jedna fiszka to jedna decyzja.
 *
 * Kolejka jest wspólna — rzecz odhaczona przez jedną osobę znika wszystkim,
 * żeby dwie nie oceniały tej samej karty. Ale nie każdy widzi to samo: fiszka
 * trafia wyłącznie do kogoś, kto ma prawo ją rozstrzygnąć (patrz
 * `buildBoredomQueue`) — Milena nie potwierdzi za Marcina, że jego zgłoszenie
 * działa.
 */
export function BoredomPanel({ content, role, author, onOpen }: BoredomPanelProps) {
  const toast = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [sessions, setSessions] = useState<BoredomSession[]>([]);

  useEffect(() => watchReports(setReports), []);
  useEffect(() => watchChecked(setDone), []);
  useEffect(() => watchSessions(setSessions), []);

  const queue = useMemo(
    () => buildBoredomQueue({ content, reports, role, author, done }),
    [content, reports, role, author, done],
  );

  /** Trwająca sesja: od kiedy i co w niej zrobiono. */
  const [session, setSession] = useState<{
    startedAt: string;
    ok: number;
    fix: number;
    skip: number;
  } | null>(null);
  /** Podsumowanie ostatnio zakończonej sesji — pokazujemy zamiast fiszek. */
  const [summary, setSummary] = useState<
    { ok: number; fix: number; skip: number; seconds: number } | null
  >(null);
  const [comment, setComment] = useState('');

  // Blokada natychmiastowa: przy szybkim klikaniu dwa werdykty zdążyłyby
  // wejść, zanim stan się przerysuje, i drugi trafiłby w następną fiszkę.
  const inFlight = useRef(false);

  const current = queue[0];

  const start = () => {
    setSummary(null);
    setSession({ startedAt: new Date().toISOString(), ok: 0, fix: 0, skip: 0 });
  };

  const finish = async () => {
    if (!session) return;
    const finishedAt = new Date().toISOString();
    const seconds = Math.max(
      0,
      Math.round((Date.parse(finishedAt) - Date.parse(session.startedAt)) / 1000),
    );

    setSummary({ ok: session.ok, fix: session.fix, skip: session.skip, seconds });
    setSession(null);

    const result = await saveSession({
      author,
      startedAt: session.startedAt,
      finishedAt,
      ok: session.ok,
      fix: session.fix,
      skip: session.skip,
      seconds,
    });
    if (!result.ok) toast(result.error ?? 'Nie udało się zapisać sesji.', 'danger');
  };

  const judge = async (verdict: BoredomVerdict) => {
    if (!current || !session || inFlight.current) return;
    inFlight.current = true;

    const result = await markChecked({ itemId: current.id, verdict, author });
    inFlight.current = false;

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się zapisać.', 'danger');
      return;
    }

    // „Do poprawki" bez słowa wyjaśnienia jest bezużyteczne dla następnej
    // osoby — zamieniamy je na zgłoszenie, jeśli ktoś wpisał komentarz.
    if (verdict === 'fix' && comment.trim()) {
      await addReport({
        kind: 'bug',
        title: `Do poprawki: ${current.title}`.slice(0, 120),
        description: `${comment.trim()}\n\n(ze Strefy Nudy)`,
        author,
        priority: 'medium',
        status: 'pending',
      });
    }
    setComment('');

    setSession({ ...session, [verdict]: session[verdict] + 1 });
  };

  const styl = current ? KIND_STYLE[current.kind] : null;

  return (
    <section>
      <h2 className="font-display text-lg font-bold">Strefa Nudy</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Drobiazgi czekające na sprawdzenie, po jednym na raz. Klikaj, kiedy masz
        chwilę — kolejka jest wspólna, więc to, co odhaczysz, znika reszcie
        zespołu.
      </p>

      {/* Trwająca sesja: licznik i zakończenie zawsze pod ręką. */}
      {session && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-accent bg-raised p-3">
          <span className="font-mono text-sm">
            <span className="text-success">{session.ok} ok</span>
            {' · '}
            <span className="text-danger">{session.fix} do poprawki</span>
            {' · '}
            <span className="text-ink-dim">{session.skip} pominięte</span>
          </span>
          <Button size="sm" variant="ghost" onClick={() => void finish()}>
            Zakończ sesję
          </Button>
        </div>
      )}

      {summary && (
        <div className="mt-4">
          <Alert tone="success" title="Sesja zakończona">
            {counted(summary.ok + summary.fix + summary.skip, 'rzecz', 'rzeczy', 'rzeczy')} w{' '}
            {czasTrwania(summary.seconds)}: {summary.ok} ok, {summary.fix} do poprawki,{' '}
            {summary.skip} pominięte.
            {queue.length > 0 && ` W kolejce zostało jeszcze ${queue.length}.`}
          </Alert>
        </div>
      )}

      {!session && (
        <div className="mt-4">
          {queue.length === 0 ? (
            <Alert tone="success" title="Nic nie czeka">
              Kolejka pusta — wszystko sprawdzone. Wróć, gdy dojdą nowe karty
              robocze albo zgłoszenia.
            </Alert>
          ) : (
            <Button variant="primary" icon="rocket" onClick={start}>
              Zacznij sesję ({counted(queue.length, 'rzecz', 'rzeczy', 'rzeczy')})
            </Button>
          )}
        </div>
      )}

      {session && current && styl && (
        <div
          className="eter-pop mt-4 rounded-xl border-2 bg-surface p-5"
          style={{ borderColor: styl.color }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: styl.color }}>
              <Icon name={styl.icon} size={18} />
            </span>
            <span className="eter-label" style={{ color: styl.color }}>
              {styl.label}
            </span>
            <span className="ml-auto font-mono text-xs text-ink-dim">
              zostało {queue.length}
            </span>
          </div>

          <h3
            className="mt-2 font-display text-lg font-bold"
            style={{ overflowWrap: 'anywhere' }}
          >
            {current.title}
          </h3>
          <p
            className="mt-2 whitespace-pre-wrap text-sm leading-relaxed"
            style={{ overflowWrap: 'anywhere' }}
          >
            {current.body}
          </p>

          {current.link && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => onOpen(current.link!)}
            >
              Otwórz w zakładce
            </Button>
          )}

          {/* Komentarz idzie jako zgłoszenie — „do poprawki" bez słowa
              wyjaśnienia nic nie mówi następnej osobie. */}
          <TextArea
            label="Komentarz (trafi jako zgłoszenie)"
            className="mt-3"
            rows={2}
            value={comment}
            maxLength={2000}
            placeholder="Opcjonalnie: co dokładnie jest nie tak?"
            onChange={(e) => setComment(e.target.value)}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" icon="tick" onClick={() => void judge('ok')}>
              W porządku
            </Button>
            <Button variant="danger" icon="warning" onClick={() => void judge('fix')}>
              Do poprawki
            </Button>
            <Button variant="ghost" onClick={() => void judge('skip')}>
              Pomiń
            </Button>
          </div>
        </div>
      )}

      {session && !current && (
        <div className="mt-4">
          <Alert tone="success" title="Kolejka pusta">
            Przerobiłeś wszystko. Zakończ sesję, żeby zapisać podsumowanie.
          </Alert>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="mt-8">
          <h3 className="eter-label">Ostatnie sesje zespołu</h3>
          <ul className="mt-2 space-y-1">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline gap-x-2 rounded-lg border border-edge bg-surface px-3 py-2 text-sm"
              >
                <span className="font-bold">{s.author}</span>
                <span className="font-mono text-xs text-ink-dim">
                  {formatDate(s.finishedAt)}
                </span>
                <span className="ml-auto font-mono text-xs">
                  {counted(s.ok + s.fix + s.skip, 'rzecz', 'rzeczy', 'rzeczy')} w{' '}
                  {czasTrwania(s.seconds)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
