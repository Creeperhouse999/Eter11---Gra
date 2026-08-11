import { useEffect, useState } from 'react';
import {
  addNote,
  editNote,
  removeNote,
  watchNotes,
  MAX_LENGTH,
  type MemoryNote,
} from '../firebase/memory';
import { canDelete, canEdit, type Role } from '../firebase/roles';
import { Alert } from '../ui/controls/Alert';
import { Button } from '../ui/controls/Button';
import { TextArea } from '../ui/controls/Field';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { Avatar } from './Avatar';
import { Icon } from '../ui/icons/Icon';

interface MemoryPanelProps {
  /** Imię zalogowanego — podpisuje wpis. */
  author: string;
  /** Konto zalogowanego — po nim poznajemy właściciela wpisu, nie po imieniu. */
  authorUid: string;
  /** Rola: viewer tylko czyta, admin sprząta cudze wpisy. */
  role: Role;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Pamięć zespołu — wspólny notatnik o projekcie i o nas samych.
 *
 * Jedno zdanie na wpis, bez tytułu i bez odpowiadania sobie nawzajem. Nie czat
 * (nie ma rozmowy) i nie zgłoszenie (nie ma statusu) — miejsce na fakty, które
 * warto pamiętać między spotkaniami: dla kogo robimy grę, kto za co odpowiada,
 * co już raz ustaliliśmy. Claude czyta to samo co zespół, więc kolejna rozmowa
 * z nim zaczyna się od tego, co już wiadomo, zamiast od tłumaczenia od zera.
 *
 * Kto pisze: każdy poza podglądem. Swój wpis autor poprawia i kasuje sam;
 * cudze sprząta admin.
 */
export function MemoryPanel({ author, authorUid, role }: MemoryPanelProps) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  /** Wpis w trybie poprawki (id) i jego treść robocza. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const stop = watchNotes((next) => {
      setNotes(next);
      setLoading(false);
    });
    return stop;
  }, []);

  const mayWrite = canEdit(role);
  const mayDeleteAny = canDelete(role);
  /**
   * Swój wpis poprawia i kasuje autor; cudze — tylko admin.
   *
   * Po koncie, nie po imieniu: imię bywa adresem e-mail i dwie osoby mogłyby
   * mieć ten sam podpis. Starsze wpisy bez `authorUid` zostają dla admina —
   * to samo rozstrzygnięcie co w regułach bazy, żeby panel nie pokazywał
   * przycisku, który i tak zostanie odrzucony przy zapisie.
   */
  const mine = (note: MemoryNote) => Boolean(note.authorUid) && note.authorUid === authorUid;

  const submit = async () => {
    if (sending) return;
    setSending(true);
    const result = await addNote({ text, author, authorUid });
    setSending(false);

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się zapisać.', 'danger');
      return;
    }
    setText('');
    toast('Zapamiętane.', 'success');
  };

  const saveEdit = async (note: MemoryNote) => {
    const result = await editNote(note.id, draft);
    if (!result.ok) {
      toast(result.error ?? 'Nie udało się zapisać poprawki.', 'danger');
      return;
    }
    setEditingId(null);
    setDraft('');
    toast('Poprawione.', 'success');
  };

  const remove = async (note: MemoryNote) => {
    const ok = await confirm({
      title: 'Usunąć wpis?',
      message: `„${note.text}"`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!ok) return;

    const result = await removeNote(note.id);
    if (!result.ok) {
      toast(result.error ?? 'Nie udało się usunąć.', 'danger');
      return;
    }
    toast('Usunięte.', 'success');
  };

  const left = MAX_LENGTH - text.trim().length;

  return (
    <div>
      {dialog}

      <section className="rounded-xl border border-edge bg-surface p-4">
        <h2 className="font-display font-bold">Pamięć zespołu</h2>
        <p className="mt-1 text-xs text-ink-dim">
          Jedno zdanie na wpis — o grze albo o Was. To, co tu zapiszecie, zostaje
          na stałe i czyta to cały zespół razem z Claude, więc następna rozmowa
          zaczyna się od tego, co już ustalone.
        </p>

        {/* Zakładki nie widzi konto podglądowe (patrz gatowanie w AdminApp),
            więc kto tu jest, ten pisze. Warunek zostaje mimo to: gdyby ktoś
            kiedyś odsłonił zakładkę szerzej, formularz ma się nie pokazać
            komuś, komu reguły bazy i tak odrzucą zapis. */}
        {mayWrite ? (
          <div className="mt-3">
            <TextArea
              label="Zdanie do zapamiętania"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="np. Gra jest dla dzieci 8–13 lat, gramy w nią przy stole z rodzicami."
              rows={2}
              maxLength={MAX_LENGTH}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-ink-dim">
                Podpiszesz się jako {author || '—'} · zostało {left} znaków
              </span>
              <Button
                size="sm"
                icon="tick"
                onClick={() => void submit()}
                disabled={sending || text.trim().length === 0}
              >
                {sending ? 'Zapisuję…' : 'Zapamiętaj'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <Alert tone="info">
              Twoja rola pozwala czytać pamięć, ale nie dopisywać do niej.
            </Alert>
          </div>
        )}
      </section>

      <section className="mt-4">
        {loading ? (
          <p className="text-sm text-ink-dim">Wczytywanie…</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-ink-dim">
            Pamięć jest pusta. Pierwsze zdanie może być o tym, dla kogo robimy grę.
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => {
              const canEditThis = mayWrite && mine(note);
              const canRemoveThis = mine(note) || mayDeleteAny;
              const editing = editingId === note.id;

              return (
                <li
                  key={note.id}
                  className="rounded-xl border border-edge bg-surface p-3"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={note.author} size={32} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-display text-sm font-bold">
                          {note.author}
                        </span>
                        <span className="font-mono text-[10px] text-ink-dim">
                          {formatDate(note.createdAt)}
                          {note.editedAt && ' · poprawione'}
                        </span>
                      </div>

                      {editing ? (
                        <div className="mt-2">
                          <TextArea
                            label="Poprawka"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            rows={2}
                            maxLength={MAX_LENGTH}
                          />
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" icon="tick" onClick={() => void saveEdit(note)}>
                              Zapisz
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setDraft('');
                              }}
                            >
                              Anuluj
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-0.5 text-sm leading-relaxed">{note.text}</p>
                      )}
                    </div>

                    {!editing && (canEditThis || canRemoveThis) && (
                      <div className="flex shrink-0 gap-1">
                        {canEditThis && (
                          <button
                            type="button"
                            aria-label="Popraw wpis"
                            onClick={() => {
                              setEditingId(note.id);
                              setDraft(note.text);
                            }}
                            className="rounded p-1.5 text-ink-dim transition hover:text-accent"
                          >
                            <Icon name="pencil" size={15} />
                          </button>
                        )}
                        {canRemoveThis && (
                          <button
                            type="button"
                            aria-label="Usuń wpis"
                            onClick={() => void remove(note)}
                            className="rounded p-1.5 text-ink-dim transition hover:text-danger"
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
