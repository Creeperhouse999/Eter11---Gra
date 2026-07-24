import { useCallback, useEffect, useState } from 'react';
import {
  addReport,
  deleteReport,
  loadReports,
  setReportStatus,
  updateReport,
  type Report,
  type ReportKind,
  type ReportStatus,
} from '../firebase/reports';
import { canDelete, canModerate, canReport, skipsApproval, type Role } from '../firebase/roles';
import { addDiscussion } from '../firebase/discussions';
import { Alert } from '../ui/controls/Alert';
import { Button } from '../ui/controls/Button';
import { TextArea, TextField } from '../ui/controls/Field';
import { Select } from '../ui/controls/Select';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { ImageUpload } from './ImageUpload';
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
    id: 'pending',
    label: 'Czeka na akceptację',
    icon: 'flask',
    color: 'var(--eter-accent-2)',
    hint: 'Zgłoszenia współpracowników i graczy — admin lub co-admin akceptuje albo odrzuca.',
  },
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
    id: 'reopened',
    label: 'Wróciły',
    icon: 'undo',
    color: 'var(--eter-danger)',
    hint: 'Sprawdzone i dalej nie działa — czekają na kolejną poprawkę.',
  },
  {
    id: 'dismissed',
    label: 'Odrzucone',
    icon: 'close',
    color: 'var(--eter-danger)',
    hint: 'Odrzucone przez admina lub co-admina z komentarzem. Koniec obiegu.',
  },
  {
    id: 'done',
    label: 'Potwierdzone',
    icon: 'tick',
    color: 'var(--eter-success)',
    hint: 'Zgłaszający sprawdził i potwierdził, że działa.',
  },
];

/** Czy dany slug z adresu to znany status zgłoszenia (pod-zakładka). */
export function isReportStatus(value: string): value is ReportStatus {
  return STATUS_TABS.some((s) => s.id === value);
}

const EMPTY_MESSAGE: Record<ReportStatus, string> = {
  pending: 'Nic nie czeka na akceptację.',
  new: 'Brak nowych zgłoszeń.',
  fixed: 'Nic nie czeka na sprawdzenie.',
  reopened: 'Nic nie wróciło do poprawki.',
  dismissed: 'Nic nie zostało odrzucone.',
  done: 'Nic jeszcze nie zostało potwierdzone.',
};

const STATUS_TOAST: Record<ReportStatus, string> = {
  pending: 'Zgłoszenie czeka na akceptację.',
  new: 'Zgłoszenie wróciło do listy nowych.',
  fixed: 'Oznaczono jako naprawione — czeka na sprawdzenie.',
  reopened: 'Odesłane do poprawki.',
  dismissed: 'Zgłoszenie odrzucone.',
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
interface ReportsPanelProps {
  /**
   * Imię zalogowanego — podpisuje zgłoszenie.
   *
   * Wcześniej było tu pole tekstowe oznaczone „opcjonalnie", więc większość
   * zgłoszeń przychodziła bez podpisu i nie było kogo dopytać o szczegóły.
   */
  author: string;
  /**
   * Rola zalogowanego. Decyduje, kto akceptuje/odrzuca zgłoszenia oczekujące
   * (admin, co-admin) i kto może je usuwać (admin).
   */
  role: Role;
  /**
   * Aktywny filtr statusu — z adresu (`/admin/reports/fixed`). Steruje
   * widoczną listą, żeby dało się zalinkować wprost do danej pod-zakładki.
   */
  statusTab?: ReportStatus;
  /** Zgłasza zmianę filtra statusu w górę, żeby trafiła do adresu. */
  onStatusTabChange?: (status: ReportStatus) => void;
  /**
   * Id otwartego zgłoszenia — z adresu (`?open=<id>`). Steruje otwartym
   * oknem, żeby link prowadził wprost do konkretnego zgłoszenia.
   */
  openId?: string | null;
  /** Zgłasza otwarcie/zamknięcie zgłoszenia w górę, żeby trafiło do adresu. */
  onOpenChange?: (id: string | null) => void;
}

export function ReportsPanel({
  author,
  role,
  statusTab,
  onStatusTabChange,
  openId: openIdProp,
  onOpenChange,
}: ReportsPanelProps) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  /** Zrzuty ekranu dołączone do nowego zgłoszenia. */
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<ReportKind>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  /**
   * Zgłoszenie przechodzi przez cztery stany, nie dwa. Wcześniej panel
   * znał tylko „nowe" i „załatwione", więc zgłoszenia oznaczone jako
   * naprawione znikały z obu list — nikt ich już nie widział.
   *
   * Filtr sterowany adresem, gdy podano `statusTab`; inaczej własny stan.
   * Dzięki temu link `/admin/reports/fixed` otwiera właściwą listę, a bez
   * adresu (np. w teście jednostkowym) panel działa jak dawniej.
   */
  const [localTab, setLocalTab] = useState<ReportStatus>('new');
  const tab = statusTab !== undefined ? statusTab : localTab;
  const setTab = (next: ReportStatus) => {
    setLocalTab(next);
    onStatusTabChange?.(next);
  };
  /** Zgłoszenie z otwartym polem komentarza. */
  const [commenting, setCommenting] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  /**
   * Edycja treści zgłoszenia (tytuł + opis) — dla moderatora.
   * `editing` = id zgłoszenia w trybie edycji; osobne pola robocze, żeby
   * anulowanie nie ruszało oryginału, dopóki nie zapiszemy.
   */
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  /**
   * Zgłoszenie otwarte w oknie. Sterowane adresem, gdy podano `openId`;
   * inaczej własny stan — jak filtr statusu wyżej.
   */
  const [localOpenId, setLocalOpenId] = useState<string | null>(null);
  const openId = openIdProp !== undefined ? openIdProp : localOpenId;
  const setOpenId = (next: string | null) => {
    setLocalOpenId(next);
    onOpenChange?.(next);
  };

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
    const result = await addReport({
      kind,
      title,
      description,
      author,
      images,
      // Admin i co-admin wysyłają od razu do realizacji; reszta czeka na
      // akceptację.
      status: skipsApproval(role) ? 'new' : 'pending',
    });
    setSending(false);

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się wysłać zgłoszenia.', 'danger');
      return;
    }

    setTitle('');
    setDescription('');
    setImages([]);
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
      // Czyścimy tylko wtedy, gdy zmiana dotyczy komentowanego zgłoszenia.
      // Inaczej kliknięcie statusu przy innym zgłoszeniu kasowało tekst
      // wpisany dla tego pierwszego.
      if (commenting === report.id) {
        setCommenting(null);
        setComment('');
      }
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
      // Okno pokazywało to zgłoszenie — zostawione otwarte wisiałoby nad pustką.
      setOpenId(null);
      toast('Zgłoszenie usunięte.');
    } catch {
      toast('Nie udało się usunąć. Sprawdź, czy jesteś zalogowany.', 'danger');
    }
  };

  const startEdit = (report: Report) => {
    setEditing(report.id);
    setEditTitle(report.title);
    setEditDescription(report.description);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditTitle('');
    setEditDescription('');
  };

  const saveEdit = async (report: Report) => {
    const title = editTitle.trim();
    if (!title) {
      toast('Tytuł nie może być pusty.', 'danger');
      return;
    }
    setSavingEdit(true);
    try {
      await updateReport(report.id, { title, description: editDescription });
      // Aktualizacja na miejscu, żeby okno pokazało nową treść bez przeładowania.
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id ? { ...r, title, description: editDescription.trim() } : r,
        ),
      );
      cancelEdit();
      toast('Zgłoszenie zapisane.', 'success');
    } catch {
      toast('Nie udało się zapisać. Sprawdź uprawnienia.', 'danger');
    } finally {
      setSavingEdit(false);
    }
  };

  /**
   * Odrzucone zgłoszenie do ponownej rozmowy.
   *
   * Odrzucenie kończy zgłoszenie, ale bywa, że temat wraca — wtedy zamiast
   * pisać od zera zakładamy dyskusję z całym kontekstem: tytuł zgłoszenia,
   * jego opis jako pierwsza wypowiedź, a każda notatka (w tym powód odrzucenia)
   * jako kolejna. Dalej zespół dyskutuje, a gdy coś ustali, robi z wątku
   * zgłoszenie normalnie (przycisk w dyskusjach).
   */
  const toDiscussion = async (report: Report) => {
    const messages = [
      { author: report.author || 'Zgłaszający', text: report.description, at: report.createdAt },
      ...(report.notes ?? []).map((n) => ({
        author: n.from === 'reporter' ? report.author || 'Zgłaszający' : 'Zespół',
        text: n.text,
        at: n.at,
      })),
    ].filter((m) => m.text?.trim());

    const result = await addDiscussion({
      title: report.title,
      description: `Z odrzuconego zgłoszenia „${report.title}".`,
      author,
      messages,
    });

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się założyć dyskusji.', 'danger');
      return;
    }
    toast('Założono dyskusję z tego zgłoszenia — jest w zakładce Dyskusja.', 'success');
  };

  const counts: Record<ReportStatus, number> = {
    pending: reports.filter((r) => r.status === 'pending').length,
    new: reports.filter((r) => r.status === 'new').length,
    fixed: reports.filter((r) => r.status === 'fixed').length,
    reopened: reports.filter((r) => r.status === 'reopened').length,
    dismissed: reports.filter((r) => r.status === 'dismissed').length,
    done: reports.filter((r) => r.status === 'done').length,
  };
  const visible = reports.filter((r) => r.status === tab);
  // Otwarte zgłoszenie bierzemy z listy po id, nie z kopii — status
  // i komentarze zmieniają się w tym samym oknie, więc muszą się w nim
  // odświeżać na miejscu.
  const openReport = reports.find((r) => r.id === openId) ?? null;

  // Otwarcie widoku pełnoekranowego zaczyna od góry.
  //
  // Bez tego wejście w zgłoszenie z listy przewiniętej w dół pokazywało od
  // razu dół rozmowy — okno zajmuje tę samą stronę, więc dziedziczyło jej
  // pozycję przewinięcia.
  useEffect(() => {
    if (openId) window.scrollTo(0, 0);
  }, [openId]);

  const back = () => {
    setOpenId(null);
    setCommenting(null);
    setComment('');
  };

  const renderReport = (report: Report) => {
    // Czy pasek akcji ma cokolwiek pokazać. Bez tego zgłoszenie odrzucone
    // albo oczekujące oglądane bez uprawnień zostawiałoby pustą kreskę.
    const canModeratePending = report.status === 'pending' && canModerate(role);
    const hasStatusActions =
      canModeratePending ||
      report.status === 'new' ||
      report.status === 'reopened' ||
      report.status === 'fixed' ||
      report.status === 'done';
    const canEditReport = canModerate(role);
    const hasActions = hasStatusActions || canDelete(role) || canEditReport;

    return (
          <div>
            <p className="font-mono text-[11px] text-ink-dim">
              {KIND_LABELS[report.kind]} ·{' '}
              {STATUS_TABS.find((s) => s.id === report.status)?.label ?? report.status}
              {' · '}
              {formatDate(report.createdAt)}
              {report.author && ` · ${report.author}`}
            </p>

            {editing === report.id ? (
              // Tryb edycji treści (moderator). Pola robocze — anulowanie nie
              // rusza oryginału.
              <div className="mt-3 space-y-2 rounded-lg border border-accent bg-surface p-3">
                <TextField
                  label="Tytuł"
                  value={editTitle}
                  maxLength={120}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <TextArea
                  label="Opis"
                  value={editDescription}
                  maxLength={4000}
                  rows={5}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={savingEdit}>
                    Anuluj
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon="tick"
                    disabled={savingEdit}
                    onClick={() => void saveEdit(report)}
                  >
                    {savingEdit ? 'Zapisywanie…' : 'Zapisz'}
                  </Button>
                </div>
              </div>
            ) : (
              report.description && (
                <p
                  className="mt-3 whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {report.description}
                </p>
              )
            )}

            {(report.images?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {report.images!.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-24 w-24 overflow-hidden rounded-lg border border-edge transition hover:border-accent"
                  >
                    <img src={url} alt="Zrzut ekranu" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}

            {/* Rozmowa: naprawiam → sprawdzam → potwierdzam albo odsyłam.
                Bez niej druga próba naprawy zaczyna od zera. */}
            {(report.notes?.length ?? 0) > 0 && (
              <div className="mt-4 space-y-2">
                {report.notes!.map((note, index) => {
                  // Dwie strony rozmowy po przeciwnych krawędziach, jak w
                  // komunikatorze: programista po lewej, zgłaszający po prawej.
                  // Kierunek niesie sens obiegu — „naprawiłem" wychodzi od
                  // programisty, „dalej nie działa" wraca od zgłaszającego —
                  // więc widać go, zanim przeczyta się podpis.
                  const dev = note.from === 'dev';
                  return (
                    <div
                      key={index}
                      className={dev ? 'flex justify-start' : 'flex justify-end'}
                    >
                      <div
                        className="max-w-[80%] rounded-lg p-2.5"
                        style={{
                          background: dev ? 'var(--eter-raised)' : 'var(--eter-surface)',
                          border: dev ? 'none' : '1px solid var(--eter-edge)',
                        }}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className="text-xs font-bold"
                            style={{
                              color: dev
                                ? 'var(--eter-accent)'
                                : 'var(--eter-cat-social)',
                            }}
                          >
                            {dev ? 'programista' : 'zgłaszający'}
                          </span>
                          <span className="font-mono text-[10px] text-ink-dim">
                            {formatDate(note.at)}
                          </span>
                        </div>
                        <p
                          className="mt-1 whitespace-pre-wrap text-sm leading-snug"
                          style={{ overflowWrap: 'anywhere' }}
                        >
                          {note.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {commenting === report.id &&
              (report.status === 'pending' ? (
                // Moderator odrzuca zgłoszenie oczekujące — powód jest wymagany,
                // bo „odrzucone" bez wyjaśnienia nic nie mówi zgłaszającemu.
                <div className="eter-fade-in mt-3 rounded-lg border border-danger bg-raised p-3">
                  <TextArea
                    label="Dlaczego odrzucasz to zgłoszenie?"
                    value={comment}
                    rows={3}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Np. to zachowanie jest zgodne z zasadami — karta ma tak działać."
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={comment.trim().length === 0}
                      onClick={() => void changeStatus(report, 'dismissed', 'dev')}
                    >
                      Odrzuć zgłoszenie
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
              ) : (
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
                      onClick={() => void changeStatus(report, 'reopened')}
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
              ))}

            {/* Zgłoszenie oczekujące, którego bieżąca rola nie może moderować:
                sam podgląd, bez przycisków — czeka na admina lub co-admina. */}
            {report.status === 'pending' && !canModerate(role) && (
              <p className="mt-4 border-t border-edge pt-3 text-sm text-ink-dim">
                Czeka na akceptację admina lub co-admina.
              </p>
            )}

            {hasActions && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-edge pt-3">
              {canModeratePending && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    icon="tick"
                    onClick={() => void changeStatus(report, 'new', 'dev')}
                  >
                    Akceptuj
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="close"
                    className="text-danger"
                    onClick={() => {
                      setCommenting(report.id);
                      setComment('');
                    }}
                  >
                    Odrzuć
                  </Button>
                </>
              )}

              {(report.status === 'new' || report.status === 'reopened') && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon="flask"
                  onClick={() => void changeStatus(report, 'fixed', 'dev')}
                >
                  Naprawione
                </Button>
              )}

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

              {/* Odrzucone zgłoszenie można przenieść do dyskusji (moderator):
                  temat wraca, więc rozmawiamy z pełnym kontekstem zamiast
                  pisać od zera. Później z wątku robi się zgłoszenie normalnie. */}
              {report.status === 'dismissed' && canModerate(role) && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="message"
                  onClick={() => void toDiscussion(report)}
                >
                  Zrób z tego dyskusję
                </Button>
              )}

              {/* Edycja treści tylko dla moderatora — reguły bazy i tak nie
                  wpuszczą zmiany tytułu/opisu nikomu innemu. Chowamy przycisk,
                  gdy już edytujemy (formularz ma własny „Zapisz"). */}
              {canEditReport && editing !== report.id && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="brush"
                  className="ml-auto"
                  onClick={() => startEdit(report)}
                >
                  Edytuj
                </Button>
              )}

              {canDelete(role) && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  className={canEditReport && editing !== report.id ? 'text-danger' : 'ml-auto text-danger'}
                  onClick={() => void remove(report)}
                >
                  Usuń
                </Button>
              )}
            </div>
            )}
          </div>
    );
  };

  // Otwarte zgłoszenie na cały ekran, jak wątek dyskusji — modal na
  // telefonie obcinał długą rozmowę i przyciski statusu.
  if (openReport) {
    return (
      <section aria-label={`Zgłoszenie: ${openReport.title}`}>
        {dialog}
        <div
          className="sticky top-0 -mx-4 mb-3 flex items-center gap-2 border-b border-edge bg-bg/95 px-4 py-2 backdrop-blur"
          style={{ zIndex: 'var(--z-sticky)' }}
        >
          <Button variant="ghost" size="sm" icon="arrowLeft" onClick={back}>
            Wróć
          </Button>
          <span className="min-w-0 flex-1 truncate font-display font-bold">
            {openReport.title}
          </span>
        </div>
        {renderReport(openReport)}
      </section>
    );
  }

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

      {/* Formularz — ukryty dla podglądu, który zgłaszać nie może. */}
      {canReport(role) && (
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

        <div className="mt-3">
          <ImageUpload
            label="Zrzuty ekranu (do 5)"
            value={images}
            onChange={setImages}
            folder="reports"
            max={5}
            namePrefix={`report-${author || 'anon'}`}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-ink-dim">
            Podpiszesz się jako <span className="text-ink">{author}</span>
          </span>
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
      )}

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
            <li key={report.id}>
              <button
                type="button"
                onClick={() => setOpenId(report.id)}
                className="flex w-full items-start gap-2.5 rounded-lg border-l-4 border border-edge bg-surface p-3 text-left transition hover:border-accent"
                style={{
                  borderLeftColor:
                    report.kind === 'bug' ? 'var(--eter-danger)' : 'var(--eter-accent)',
                }}
              >
                <span
                  className="mt-0.5 shrink-0"
                  style={{
                    color: report.kind === 'bug' ? 'var(--eter-danger)' : 'var(--eter-accent)',
                  }}
                >
                  <Icon name={report.kind === 'bug' ? 'warning' : 'bulb'} size={16} />
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className="block font-display font-bold"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {report.title}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] text-ink-dim">
                    {KIND_LABELS[report.kind]} · {formatDate(report.createdAt)}
                    {report.author && ` · ${report.author}`}
                    {(report.notes?.length ?? 0) > 0 &&
                      ` · ${report.notes!.length} ${report.notes!.length === 1 ? 'wpis' : 'wpisy'}`}
                    {(report.images?.length ?? 0) > 0 && ` · ${report.images!.length} zdj.`}
                  </span>
                </span>

                <span className="shrink-0 text-ink-dim">
                  <Icon name="chevronDown" size={18} className="-rotate-90" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

    </section>
  );
}
