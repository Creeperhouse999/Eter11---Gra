import { useCallback, useEffect, useState } from 'react';
import {
  addReport,
  deleteReport,
  loadReports,
  setReportStatus,
  type Report,
  type ReportKind,
} from '../firebase/reports';
import { Alert } from '../ui/controls/Alert';
import { Button } from '../ui/controls/Button';
import { TextArea, TextField } from '../ui/controls/Field';
import { Select } from '../ui/controls/Select';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { Icon } from '../ui/icons/Icon';

const KIND_OPTIONS = [
  { value: 'bug' as const, label: 'Błąd', icon: 'warning' as const, color: 'var(--eter-danger)' },
  { value: 'idea' as const, label: 'Pomysł', icon: 'bulb' as const, color: 'var(--eter-accent)' },
];

const KIND_LABELS: Record<ReportKind, string> = { bug: 'Błąd', idea: 'Pomysł' };

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
  const [showDone, setShowDone] = useState(false);

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

  const toggleStatus = async (report: Report) => {
    const next = report.status === 'new' ? 'done' : 'new';
    await setReportStatus(report.id, next);
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, status: next } : r)),
    );
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

  const open = reports.filter((r) => r.status === 'new');
  const done = reports.filter((r) => r.status === 'done');
  const visible = showDone ? done : open;

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
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="eter-label">
          {showDone ? `Załatwione (${done.length})` : `Otwarte (${open.length})`}
        </h3>
        <Button size="sm" variant="ghost" onClick={() => setShowDone((v) => !v)}>
          {showDone ? 'Pokaż otwarte' : `Pokaż załatwione (${done.length})`}
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-ink-dim">Wczytywanie…</p>
      ) : visible.length === 0 ? (
        <p className="mt-3 text-sm text-ink-dim">
          {showDone ? 'Nic jeszcze nie zostało załatwione.' : 'Brak otwartych zgłoszeń.'}
        </p>
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

                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant={report.status === 'new' ? 'secondary' : 'ghost'}
                    icon={report.status === 'new' ? 'tick' : 'undo'}
                    onClick={() => void toggleStatus(report)}
                  >
                    {report.status === 'new' ? 'Załatwione' : 'Otwórz ponownie'}
                  </Button>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
