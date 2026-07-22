import { useEffect, useState } from 'react';
import {
  addDiscussion,
  addMessage,
  deleteDiscussion,
  setDiscussionClosed,
  watchDiscussions,
  type Discussion,
} from '../firebase/discussions';
import { addReport } from '../firebase/reports';
import { Button } from '../ui/controls/Button';
import { TextField, TextArea } from '../ui/controls/Field';
import { Icon } from '../ui/icons/Icon';
import { Modal } from '../ui/controls/Modal';
import { ImageUpload } from './ImageUpload';
import { useConfirm } from '../ui/controls/useConfirm';
import { useToast } from '../ui/controls/Toast';

interface DiscussionsPanelProps {
  /** Imię zalogowanego — podpisuje wypowiedzi. */
  author: string;
}

/** Data w formie czytelnej dla człowieka: „21 lip, 14:32". */
function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Dyskusje zespołu.
 *
 * Zgłoszenia odpowiadają na „co nie działa" i domykają się, gdy zgłaszający
 * potwierdzi naprawę. Dyskusja odpowiada na „co powinniśmy zrobić" — nowa
 * mechanika, pomysł na misję, spór o zasadę. Kończy się ustaleniem, nie
 * naprawą, więc zamiast statusu ma przełącznik „ustalone".
 *
 * Wypowiedzi wchodzą na żywo: rozmowa, w której odpowiedź pojawia się
 * dopiero po kliknięciu „odśwież", zamienia się w wymianę listów.
 */
export function DiscussionsPanel({ author }: DiscussionsPanelProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [replying, setReplying] = useState(false);

  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    const stop = watchDiscussions(
      (next) => {
        setDiscussions(next);
        setLoading(false);
        setError(null);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
    return stop;
  }, []);

  const create = async () => {
    setSending(true);
    const result = await addDiscussion({ title, description, author });
    setSending(false);

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się założyć wątku.', 'danger');
      return;
    }
    setTitle('');
    setDescription('');
    toast('Wątek założony.', 'success');
  };

  const send = async (discussion: Discussion) => {
    setReplying(true);
    const result = await addMessage(discussion, {
      author,
      text: reply,
      image: replyImages[0],
    });
    setReplying(false);

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się wysłać.', 'danger');
      return;
    }
    setReply('');
    setReplyImages([]);
  };

  /**
   * Przeniesienie ustalenia do zgłoszeń.
   *
   * Wątek kończy się decyzją „robimy to" — a wtedy trzeba to przepisać tam,
   * gdzie patrzy programista. Przepisywanie ręczne gubi kontekst rozmowy,
   * więc zabieramy temat i całą dyskusję jako opis.
   */
  const toReport = async (discussion: Discussion) => {
    const rozmowa = [
      discussion.description,
      ...discussion.messages.map((m) => `${m.author}: ${m.text}`),
    ]
      .filter(Boolean)
      .join('\n');

    const result = await addReport({
      kind: 'idea',
      title: discussion.title,
      description: `Z dyskusji zespołu:\n\n${rozmowa}`.slice(0, 4000),
      author,
    });

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się utworzyć zgłoszenia.', 'danger');
      return;
    }
    toast('Zgłoszenie utworzone — jest w zakładce Zgłoszenia.', 'success');
  };

  const remove = async (discussion: Discussion) => {
    const confirmed = await confirm({
      title: 'Usunąć wątek?',
      message: `„${discussion.title}" zniknie razem ze wszystkimi wypowiedziami. Tego nie da się cofnąć.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!confirmed) return;

    await deleteDiscussion(discussion.id);
    // Okno pokazywało właśnie ten wątek — zostawione otwarte wisiałoby
    // nad pustką, bo nasłuch usunie go z listy w następnej chwili.
    setOpenId(null);
    toast('Wątek usunięty.');
  };

  const visible = discussions.filter((d) => (showClosed ? d.closed : !d.closed));
  const closedCount = discussions.filter((d) => d.closed).length;

  // Wątek bierzemy z listy po identyfikatorze, a nie z kopii zapamiętanej
  // przy otwarciu — inaczej wypowiedzi wchodzące na żywo nie pojawiłyby się
  // w otwartym oknie, czyli dokładnie tam, gdzie ktoś właśnie patrzy.
  const openThread = discussions.find((d) => d.id === openId) ?? null;

  return (
    <section aria-label="Dyskusje">
      {/* Okno potwierdzenia usunięcia — własne, nie systemowe `confirm`. */}
      {dialog}
      <h2 className="font-display text-xl font-bold">Dyskusje</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Miejsce na to, czego jeszcze nie ma: nowa mechanika, pomysł na misję,
        spór o zasadę. Gdy coś ustalicie, jeden klik robi z wątku zgłoszenie.
      </p>

      {/* Nowy wątek */}
      <div className="mt-4 rounded-xl border border-edge bg-surface p-4">
        <TextField
          label="Temat"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="O czym rozmawiamy?"
        />
        <div className="mt-3">
          <TextArea
            label="Pierwsza wypowiedź"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opisz pomysł albo pytanie."
            rows={3}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-ink-dim">
            Podpiszesz się jako <span className="text-ink">{author}</span>
          </span>
          <Button
            variant="primary"
            icon="plus"
            onClick={create}
            disabled={sending || title.trim().length === 0}
          >
            {sending ? 'Zakładam…' : 'Załóż wątek'}
          </Button>
        </div>
      </div>

      {/* Otwarte / ustalone */}
      <div className="mt-5 flex items-center gap-2">
        <Button
          size="sm"
          variant={showClosed ? 'ghost' : 'primary'}
          onClick={() => setShowClosed(false)}
        >
          Otwarte {discussions.length - closedCount}
        </Button>
        <Button
          size="sm"
          variant={showClosed ? 'primary' : 'ghost'}
          icon="tick"
          onClick={() => setShowClosed(true)}
        >
          Ustalone {closedCount}
        </Button>
      </div>

      {loading && <p className="mt-4 text-sm text-ink-dim">Wczytuję…</p>}

      {error && (
        <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          Nie udało się wczytać dyskusji: {error}
        </p>
      )}

      {!loading && !error && visible.length === 0 && (
        <p className="mt-4 text-sm text-ink-dim">
          {showClosed ? 'Nic jeszcze nie zostało ustalone.' : 'Nie ma otwartych wątków.'}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {visible.map((discussion) => (
          <button
            key={discussion.id}
            type="button"
            onClick={() => {
              setOpenId(discussion.id);
              setReply('');
            }}
            className="flex w-full items-start gap-3 rounded-xl border border-edge bg-surface p-3 text-left transition hover:border-accent"
          >
            <span className="mt-0.5 shrink-0 text-accent">
              <Icon name={discussion.closed ? 'tick' : 'message'} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display font-bold">{discussion.title}</span>
              <span className="mt-0.5 block text-xs text-ink-dim">
                {discussion.author} · {shortDate(discussion.createdAt)}
                {discussion.messages.length > 0 &&
                  ` · ${discussion.messages.length} ${
                    discussion.messages.length === 1 ? 'odpowiedź' : 'odpowiedzi'
                  }`}
              </span>
            </span>
            <span className="shrink-0 text-ink-dim">
              <Icon name="chevronDown" size={18} className="-rotate-90" />
            </span>
          </button>
        ))}
      </div>

      {/* Wątek w oknie, nie rozwijany na liście: rozmowa potrafi mieć
          kilkadziesiąt wypowiedzi, a rozwinięta spychała pozostałe wątki
          poza ekran i gubiła miejsce, w którym się było. */}
      <Modal
        open={openThread !== null}
        title={openThread?.title ?? ''}
        onClose={() => {
          setOpenId(null);
          setReply('');
        }}
      >
        {openThread && (
          <div>
            <p className="text-xs text-ink-dim">
              {openThread.author} · {shortDate(openThread.createdAt)}
            </p>

            {openThread.description && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {openThread.description}
              </p>
            )}

            {/* Długa rozmowa przewija się w oknie, a nie całą stroną —
                pole odpowiedzi i przyciski zostają widoczne. */}
            <div className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto">
              {openThread.messages.map((message, index) => (
                <div key={index} className="rounded-lg bg-raised p-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-accent">{message.author}</span>
                    <span className="font-mono text-[10px] text-ink-dim">
                      {shortDate(message.at)}
                    </span>
                  </div>
                  {message.text && (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                      {message.text}
                    </p>
                  )}
                  {message.image && (
                    <a
                      href={message.image}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block max-w-[12rem] overflow-hidden rounded-lg border border-edge transition hover:border-accent"
                    >
                      <img src={message.image} alt="" className="w-full" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            {!openThread.closed && (
              <div className="mt-3">
                <TextArea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Dopisz się do rozmowy…"
                  aria-label="Twoja odpowiedź"
                  rows={2}
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <ImageUpload
                    value={replyImages}
                    onChange={setReplyImages}
                    folder="discussions"
                    max={1}
                    namePrefix={`msg-${openThread.id}-${author}`}
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    icon="rocket"
                    onClick={() => void send(openThread)}
                    // Sam obrazek bez słowa też jest wypowiedzią.
                    disabled={replying || (reply.trim().length === 0 && replyImages.length === 0)}
                  >
                    {replying ? 'Wysyłam…' : 'Wyślij'}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-edge pt-3">
              <Button size="sm" icon="megaphone" onClick={() => void toReport(openThread)}>
                Zrób z tego zgłoszenie
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={openThread.closed ? 'undo' : 'tick'}
                onClick={() => void setDiscussionClosed(openThread.id, !openThread.closed)}
              >
                {openThread.closed ? 'Otwórz ponownie' : 'Ustalone'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon="trash"
                className="text-danger"
                onClick={() => void remove(openThread)}
              >
                Usuń
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </section>
  );
}
