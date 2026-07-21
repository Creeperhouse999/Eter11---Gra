import { useCallback, useEffect, useState } from 'react';
import {
  addReport,
  deleteReport,
  loadReports,
  setReportStatus,
  type Report,
  type ReportKind,
  type ReportStatus,
} from '../firebase/reports';
import { Alert } from '../ui/controls/Alert';
import { Button } from '../ui/controls/Button';
import { TextArea, TextField } from '../ui/controls/Field';
import { Select } from '../ui/controls/Select';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { Icon, type IconName } from '../ui/icons/Icon';

const KIND_OPTIONS = [
  { value: 'bug' as const, label: 'Błąd', icon: 'warning' as const, color: 'var(--eter-danger)' },
  { value: 'idea' as const, label: 'Pomysł', icon: 'bulb' as const, color: 'var(--eter-accent)' },
];

const KIND_LABELS: Record<ReportKind, string> = { bug: 'Błąd', idea: 'Pomysł' };

/**
 * Obieg zgłoszenia: zgłaszający pisze, programista naprawia, zgłaszający
 * sprawdza. Rozdzielenie „naprawione" od „potwierdzone" jest tu sednem —
 * naprawiający nie zamyka własnego zgłoszenia, bo to on właśnie uznał, że
 * działa. Zamyka je ten, kto zgłosił.
 */
const STATUS_TABS: Array<{
  id: ReportStatus;
  label: string;
  icon: IconName;
  color: string;
  hint: string;
}> = [
  {
    id: 'new',
    label: 'Nowe',
    icon: 'bulb',
    color: 'var(--eter-accent)',
    hint: 'Czekają na programistę.',
  },
  {
    id: 'fixed',
    label: 'Do sprawdzenia',
    icon: 'flask',
    color: 'var(--eter-cat-social)',
    hint: 'Programista twierdzi, że naprawione. Sprawdź i potwierdź albo odeślij z komentarzem.',
  },
  {
    id: 'rejected',
    label: 'Wróciły',
    icon: 'undo',
    color: 'var(--eter-danger)',
    hint: 'Sprawdzone i dalej nie działa — czekają na kolejną poprawkę.',
  },
  {
    id: 'done',
    label: 'Potwierdzone',
    icon: 'tick',
    color: 'var(--eter-success)',
    hint: 'Zgłaszający sprawdził i potwierdził, że działa.',
  },
];

const EMPTY_MESSAGE: Record<ReportStatus, string> = {
  new: 'Brak nowych zgłoszeń.',
  fixed: 'Nic nie czeka na sprawdzenie.',
  rejected: 'Nic nie wróciło do poprawki.',
  done: 'Nic jeszcze nie zostało potwierdzone.',
};

const STATUS_TOAST: Record<ReportStatus, string> = {
  new: 'Zgłoszenie wróciło do listy nowych.',
  fixed: 'Oznaczono jako naprawione — czeka na sprawdzenie.',
  rejected: 'Odesłane do poprawki.',
  done: 'Potwierdzone. Dziękujemy za sprawdzenie!',
};

function formatDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Zgłoszenia błędów i pomysłów.
 *
 * Zespół merytoryczny wpisuje tu, co nie działa albo co warto dodać, zamiast
 * przekazywać uwagi mailem. Zgłoszenia trafiają do osobnej kolekcji, którą
 * odczytuje programista.
 */
export function ReportsPanel() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<ReportKind>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [sending, setSending] = useState(false);
  /**
   * Zgłoszenie przechodzi przez cztery stany, nie dwa. Wcześniej panel
   * znał tylko „nowe" i „załatwione", więc zgłoszenia oznaczone jako
   * naprawione znikały z obu list — nikt ich już nie widział.
   */
  const [tab, setTab] = useState<ReportStatus>('new');
  /** Zgłoszenie z otwartym polem komentarza. */
  const [commenting, setCommenting] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await loadReports());
      setError(null);
    } catch {
      setError('Nie udało się wczytać zgłoszeń. Sprawdź połączenie i reguły bazy.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = async () => {
    setSending(true);
    const result = await addReport({ kind, title, description, author });
    setSending(false);

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się wysłać zgłoszenia.', 'danger');
      return;
    }

    setTitle('');
    setDescription('');
    toast('Zgłoszenie zapisane.', 'success');
    void refresh();
  };

  /**
   * Zmiana statusu z opcjonalnym komentarzem.
   *
   * Komentarz jest wymagany przy odesłaniu do poprawki: „dalej nie działa"
   * bez opisu nie mówi programiście nic, czego by już nie wiedział.
   */
  const changeStatus = async (
    report: Report,
    next: ReportStatus,
    from: 'dev' | 'reporter' = 'reporter',
  ) => {
    const text = commenting === report.id ? comment.trim() : '';

    try {
      await setReportStatus(report.id, next, text ? { from, text } : undefined);
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? {
                ...r,
                status: next,
                notes: text
                  ? [...(r.notes ?? []), { from, text, at: new Date().toISOString() }]
                  : r.notes,
              }
            : r,
        ),
      );
      setCommenting(null);
      setComment('');
      toast(STATUS_TOAST[next]);
    } catch {
      toast('Nie udało się zapisać. Sprawdź, czy jesteś zalogowany.', 'danger');
    }
  };

  const remove = async (report: Report) => {
    const confirmed = await confirm({
      title: 'Usunąć zgłoszenie?',
      message: `„${report.title}" zniknie na dobre. Tego nie da się cofnąć.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteReport(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast('Zgłoszenie usunięte.');
    } catch {
      toast('Nie udało się usunąć. Sprawdź, czy jesteś zalogowany.', 'danger');
    }
  };

  const counts: Record<ReportStatus, number> = {
    new: reports.filter((r) => r.status === 'new').length,
    fixed: reports.filter((r) => r.status === 'fixed').length,
    rejected: reports.filter((r) => r.status === 'rejected').length,
    done: reports.filter((r) => r.status === 'done').length,
  };
  const visible = reports.filter((r) => r.status === tab);

  return (
    <section>
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Zgłoszenia</h2>
        <Button size="sm" icon="undo" onClick={() => void refresh()}>
          Odśwież
        </Button>
      </div>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Napisz, co nie działa albo co warto dodać. Zgłoszenia trafiają do
        programisty.
      </p>

      {/* Formularz */}
      <div className="mt-5 rounded-xl border border-edge bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <Select
            label="Rodzaj"
            value={kind}
            options={KIND_OPTIONS}
            onChange={setKind}
          />
          <TextField
            label="Tytuł"
            value={title}
            maxLength={120}
            placeholder="Krótko: co się dzieje?"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <TextArea
          label="Opis"
          className="mt-3"
          rows={4}
          maxLength={4000}
          value={description}
          placeholder="Co dokładnie, w którym miejscu, co powinno się wydarzyć zamiast tego."
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <TextField
            label="Kto zgłasza (opcjonalnie)"
            value={author}
            maxLength={60}
            placeholder="Imię"
            onChange={(e) => setAuthor(e.target.value)}
          />
          <Button
            variant="primary"
            icon="upload"
            disabled={sending || title.trim().length === 0}
            onClick={() => void submit()}
          >
            {sending ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="mt-6 flex flex-wrap gap-1.5">
        {STATUS_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                // Zaczęty komentarz dotyczy zgłoszenia z poprzedniej listy —
                // po zmianie zakładki nie ma już czego komentować.
                setCommenting(null);
                setComment('');
              }}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition',
                active ? 'border-accent bg-raised' : 'border-edge hover:border-ink-dim',
              ].join(' ')}
            >
              <span style={{ color: active ? item.color : undefined }}>
                <Icon name={item.icon} size={14} />
              </span>
              <span className={active ? 'font-semibold text-accent' : ''}>
                {item.label}
              </span>
              <span className="font-mono text-[11px] text-ink-dim">
                {counts[item.id]}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-ink-dim">{STATUS_TABS.find((s) => s.id === tab)?.hint}</p>

      {error && (
        <div className="mt-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-ink-dim">Wczytywanie…</p>
      ) : /* Przy błędzie nie mówimy „brak zgłoszeń" — to sugerowałoby pustą
             bazę, a lista po prostu się nie wczytała. */
      error ? null : visible.length === 0 ? (
        <p className="mt-3 text-sm text-ink-dim">{EMPTY_MESSAGE[tab]}</p>
      ) : (
        <ul className="eter-stagger mt-3 space-y-2">
          {visible.map((report) => (
            <li
              key={report.id}
              className="rounded-lg border-l-4 border border-edge bg-surface p-3"
              style={{
                borderLeftColor:
                  report.kind === 'bug' ? 'var(--eter-danger)' : 'var(--eter-accent)',
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span
                      style={{
                        color:
                          report.kind === 'bug'
                            ? 'var(--eter-danger)'
                            : 'var(--eter-accent)',
                      }}
                    >
                      <Icon name={report.kind === 'bug' ? 'warning' : 'bulb'} size={15} />
                    </span>
                    <span className="font-display font-bold" style={{ overflowWrap: 'anywhere' }}>
                      {report.title}
                    </span>
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] text-ink-dim">
                    {KIND_LABELS[report.kind]} · {formatDate(report.createdAt)}
                    {report.author && ` · ${report.author}`}
                  </span>
                </div>

                <div className="flex shrink-0 flex-wrap gap-1">
                  {/* Nowe i odesłane: programista oznacza, że poprawił. */}
                  {(report.status === 'new' || report.status === 'rejected') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="flask"
                      onClick={() => void changeStatus(report, 'fixed', 'dev')}
                    >
                      Naprawione
                    </Button>
                  )}

                  {/* Do sprawdzenia: decyduje zgłaszający, nie programista. */}
                  {report.status === 'fixed' && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        icon="tick"
                        onClick={() => void changeStatus(report, 'done')}
                      >
                        Działa
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="undo"
                        className="text-danger"
                        onClick={() => {
                          setCommenting(report.id);
                          setComment('');
                        }}
                      >
                        Dalej nie działa
                      </Button>
                    </>
                  )}

                  {report.status === 'done' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="undo"
                      onClick={() => void changeStatus(report, 'new')}
                    >
                      Otwórz ponownie
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    aria-label={`Usuń zgłoszenie: ${report.title}`}
                    className="text-danger"
                    onClick={() => void remove(report)}
                  />
                </div>
              </div>

              {report.description && (
                <p
                  className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-dim"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {report.description}
                </p>
              )}

              {/* Historia rozmowy — bez niej druga próba naprawy zaczyna
                  się od zera, bo nikt nie pamięta, co już sprawdzano. */}
              {(report.notes?.length ?? 0) > 0 && (
                <ul className="mt-3 space-y-1.5 border-l-2 border-edge pl-3">
                  {report.notes!.map((note, index) => (
                    <li key={index} className="text-xs">
                      <span
                        className="font-mono font-bold"
                        style={{
                          color:
                            note.from === 'dev'
                              ? 'var(--eter-accent)'
                              : 'var(--eter-cat-social)',
                        }}
                      >
                        {note.from === 'dev' ? 'programista' : 'zgłaszający'}
                      </span>
                      <span className="ml-2 text-ink-dim">{formatDate(note.at)}</span>
                      <p
                        className="mt-0.5 whitespace-pre-wrap leading-snug"
                        style={{ overflowWrap: 'anywhere' }}
                      >
                        {note.text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {commenting === report.id && (
                <div className="eter-fade-in mt-3 rounded-lg border border-danger bg-raised p-3">
                  <TextArea
                    label="Co dokładnie nadal nie działa?"
                    value={comment}
                    rows={3}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Np. nadal mogę położyć zieloną kartę na czerwoną ściankę."
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={comment.trim().length === 0}
                      onClick={() => void changeStatus(report, 'rejected')}
                    >
                      Odeślij do poprawki
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCommenting(null);
                        setComment('');
                      }}
                    >
                      Anuluj
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
