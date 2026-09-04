import { useEffect, useRef, useState } from 'react';
import {
  addDiscussion,
  addMessage,
  editMessage,
  removeMessage,
  canEditMessage,
  deleteDiscussion,
  setDiscussionClosed,
  watchDiscussions,
  type Discussion,
} from '../firebase/discussions';
import { addReport } from '../firebase/reports';
import {
  canDelete,
  canModerate,
  skipsApproval,
  watchTeam,
  type Role,
  type TeamMember,
} from '../firebase/roles';
import { notify, uidsForAuthor } from '../firebase/notifications';
import { Button } from '../ui/controls/Button';
import { TextField, TextArea } from '../ui/controls/Field';
import { Icon } from '../ui/icons/Icon';
import { Avatar } from './Avatar';
import { ImageUpload } from './ImageUpload';
import { ImageLightbox } from './ImageLightbox';
import { useConfirm } from '../ui/controls/useConfirm';
import { useToast } from '../ui/controls/Toast';

interface DiscussionsPanelProps {
  /** Imię zalogowanego — podpisuje wypowiedzi. */
  author: string;
  /** Rola zalogowanego — decyduje, kto może zrobić z wątku zgłoszenie. */
  role: Role;
  /** Konto zalogowanego — żeby nie powiadamiać go o własnej wypowiedzi. */
  currentUid?: string;
  /**
   * Id otwartego wątku — z adresu (`?open=<id>`). Dzięki temu link prowadzi
   * wprost do rozmowy: powiadomienie o odpowiedzi otwiera właśnie ją, a nie
   * listę, na której trzeba jej szukać.
   */
  openId?: string | null;
  /** Zgłasza otwarcie/zamknięcie wątku w górę, żeby trafiło do adresu. */
  onOpenChange?: (id: string | null) => void;
  /**
   * Czy pokazać ustalone wątki — z adresu (`/admin/discussions?closed=1`).
   * Steruje przełącznikiem otwarte/ustalone, żeby dało się zalinkować widok.
   */
  showClosed?: boolean;
  /** Zgłasza zmianę przełącznika w górę, żeby trafiła do adresu. */
  onShowClosedChange?: (value: boolean) => void;
  /**
   * Szkic nowego wątku (tytuł/opis) — trzymany przez rodzica, żeby
   * przełączenie zakładki w panelu (odmontowuje ten komponent) nie kasowało
   * tego, co ktoś właśnie pisze.
   */
  draft?: { title: string; description: string };
  /** Zgłasza zmianę szkicu w górę, żeby przetrwała odmontowanie panelu. */
  onDraftChange?: (next: { title: string; description: string }) => void;
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
export function DiscussionsPanel({
  author,
  role,
  currentUid = '',
  openId: openIdProp,
  onOpenChange,
  showClosed: showClosedProp,
  onShowClosedChange,
  draft: draftProp,
  onDraftChange,
}: DiscussionsPanelProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  // Most między podpisem a kontem — powiadomienie trafia do uid, nie do imienia.
  const [team, setTeam] = useState<TeamMember[]>([]);
  useEffect(() => watchTeam(setTeam), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Przełącznik sterowany adresem, gdy podano `showClosed`; inaczej własny
  // stan. Dzięki temu link `?closed=1` otwiera od razu listę ustalonych, a bez
  // adresu (np. w teście jednostkowym) panel działa jak dawniej.
  const [localShowClosed, setLocalShowClosed] = useState(false);
  const showClosed = showClosedProp !== undefined ? showClosedProp : localShowClosed;
  const setShowClosed = (next: boolean) => {
    setLocalShowClosed(next);
    onShowClosedChange?.(next);
  };

  const [localDraft, setLocalDraft] = useState({ title: '', description: '' });
  const draft = draftProp !== undefined ? draftProp : localDraft;
  const title = draft.title;
  const description = draft.description;
  const setTitle = (next: string) => {
    const updated = { title: next, description };
    setLocalDraft(updated);
    onDraftChange?.(updated);
  };
  const setDescription = (next: string) => {
    const updated = { title, description: next };
    setLocalDraft(updated);
    onDraftChange?.(updated);
  };
  const clearDraft = () => {
    const cleared = { title: '', description: '' };
    setLocalDraft(cleared);
    onDraftChange?.(cleared);
  };
  const [sending, setSending] = useState(false);

  /**
   * Otwarty wątek: z adresu, gdy podano `openId`; inaczej własny stan.
   * Dzięki temu link `?open=<id>` otwiera właściwą rozmowę, a bez adresu
   * (np. w teście jednostkowym) panel działa jak dawniej.
   */
  const [localOpenId, setLocalOpenId] = useState<string | null>(null);
  const openId = openIdProp !== undefined ? openIdProp : localOpenId;
  const setOpenId = (next: string | null) => {
    setLocalOpenId(next);
    onOpenChange?.(next);
  };
  const [reply, setReply] = useState('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [replying, setReplying] = useState(false);
  /** Wypowiedź w trakcie poprawiania: który wątek, który element, jaka treść. */
  const [editing, setEditing] = useState<{ id: string; index: number; text: string } | null>(
    null,
  );
  /** Obrazek otwarty w podglądzie (lightbox); `null` = zamknięte. */
  const [preview, setPreview] = useState<string | null>(null);

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

  // Blokada natychmiastowa, nie przez stan: `setSending(true)` wyłącza przycisk
  // dopiero przy następnym renderze, więc dwa szybkie kliknięcia (albo dwuklik)
  // zdążyły wejść oba i na liście lądowały DWA identyczne wątki — usunąć mógł
  // je tylko admin. Ten sam wzorzec pilnuje statusów w `ReportsPanel`.
  const createInFlight = useRef(false);

  const create = async () => {
    if (createInFlight.current) return;
    createInFlight.current = true;
    setSending(true);
    const result = await addDiscussion({ title, description, author });
    setSending(false);
    createInFlight.current = false;

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się założyć wątku.', 'danger');
      return;
    }
    clearDraft();
    toast('Wątek założony.', 'success');
  };

  // Ta sama blokada co przy zakładaniu wątku — dwuklik dokładał wypowiedź dwa
  // razy, a wypowiedzi w wątku są dopisywane, nie da się ich cofnąć.
  /** Zapisuje poprawioną wypowiedź. Własność sprawdza transakcja i reguły. */
  const saveEdit = async (discussion: Discussion) => {
    if (!editing) return;
    const result = await editMessage(discussion, editing.index, editing.text, {
      uid: currentUid,
      isAdmin: canDelete(role),
    });
    if (!result.ok) {
      toast(result.error ?? 'Nie udało się poprawić.', 'danger');
      return;
    }
    setEditing(null);
    toast('Poprawione.', 'success');
  };

  /** Usuwa wypowiedź — nieodwracalnie, więc pytamy. */
  const removeOne = async (discussion: Discussion, index: number) => {
    const ok = await confirm({
      title: 'Usunąć tę wypowiedź?',
      message: 'Zniknie z wątku i nie da się jej przywrócić.',
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!ok) return;

    const result = await removeMessage(discussion, index, {
      uid: currentUid,
      isAdmin: canDelete(role),
    });
    if (!result.ok) {
      toast(result.error ?? 'Nie udało się usunąć.', 'danger');
      return;
    }
    toast('Wypowiedź usunięta.', 'success');
  };

  const sendInFlight = useRef(false);

  const send = async (discussion: Discussion) => {
    if (sendInFlight.current) return;
    sendInFlight.current = true;
    setReplying(true);
    const result = await addMessage(discussion, {
      author,
      authorUid: currentUid,
      text: reply,
      image: replyImages[0],
    });
    setReplying(false);
    sendInFlight.current = false;

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się wysłać.', 'danger');
      return;
    }

    // Powiadamiamy tych, którzy w tym wątku już zabrali głos — założyciela
    // i wszystkich odpowiadających. Kto nie pisał, nie dostaje nic: to nie
    // ogłoszenie dla całego zespołu, tylko ciąg dalszy CZYJEJŚ rozmowy.
    const involved = new Set(
      [discussion.author, ...discussion.messages.map((message) => message.author)].filter(Boolean),
    );
    const uids = [...involved].flatMap((name) => uidsForAuthor(name, team));
    void notify({
      uids,
      kind: 'discussion-reply',
      title: `${author} odpisał(a) w wątku „${discussion.title}"`,
      body: reply.trim().slice(0, 140),
      from: author,
      link: `/admin/discussions?open=${discussion.id}`,
      exceptUid: currentUid,
    });

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
    // Zdjęcia z całej rozmowy — najwyżej pięć (limit zgłoszenia). Bez nich
    // programista nie widzi tego, co zespół pokazywał sobie w wątku.
    const images = discussion.messages
      .map((m) => m.image)
      .filter((url): url is string => Boolean(url))
      .slice(0, 5);

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
      images,
      // Robi to moderator (przycisk gated na canModerate), więc zgłoszenie
      // pomija kolejkę akceptacji i trafia od razu do „nowych".
      status: skipsApproval(role) ? 'new' : 'pending',
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

    try {
      await deleteDiscussion(discussion.id);
      // Okno pokazywało właśnie ten wątek — zostawione otwarte wisiałoby
      // nad pustką, bo nasłuch usunie go z listy w następnej chwili.
      setOpenId(null);
      toast('Wątek usunięty.');
    } catch {
      // Reguły dopuszczają usunięcie tylko adminowi. Bez tej gałęzi każdy błąd
      // (odmowa reguł, brak sieci) i tak kończył się toastem „Wątek usunięty" i
      // zamknięciem widoku — fałszywe potwierdzenie, choć wątek wciąż był w
      // bazie i za chwilę wracał z nasłuchu. Wzór jak w ReportsPanel.remove.
      toast('Nie udało się usunąć. Sprawdź, czy jesteś zalogowany jako admin.', 'danger');
    }
  };

  const toggleClosed = async (discussion: Discussion) => {
    try {
      await setDiscussionClosed(discussion.id, !discussion.closed);
    } catch {
      // Fire-and-forget bez tej gałęzi kończył się w ciszy: reguły odrzucają
      // zapis (sesja wygasła, brak uprawnień), a admin nie dostaje żadnego
      // sygnału — kliknięcie „Ustalone" wygląda, jakby nic się nie stało.
      toast('Nie udało się zmienić statusu wątku. Sprawdź, czy jesteś zalogowany jako admin.', 'danger');
    }
  };

  const visible = discussions.filter((d) => (showClosed ? d.closed : !d.closed));
  const closedCount = discussions.filter((d) => d.closed).length;

  // Wątek bierzemy z listy po identyfikatorze, a nie z kopii zapamiętanej
  // przy otwarciu — inaczej wypowiedzi wchodzące na żywo nie pojawiłyby się
  // w otwartym oknie, czyli dokładnie tam, gdzie ktoś właśnie patrzy.
  const openThread = discussions.find((d) => d.id === openId) ?? null;

  const renderThread = (thread: Discussion) => (
          <div>
            {/* Pierwsza wypowiedź — to, od czego wątek się zaczął —
                jako zwykły wpis z awatarem, żeby rozmowa czytała się od góry
                jednym ciągiem, a nie „nagłówek, potem czat". */}
            <div className="flex gap-2.5 border-b border-edge pb-3">
              <Avatar name={thread.author} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold">{thread.author}</span>
                  <span className="font-mono text-[10px] text-ink-dim">
                    {shortDate(thread.createdAt)}
                  </span>
                </div>
                {thread.description && (
                  <p
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {thread.description}
                  </p>
                )}
              </div>
            </div>

            {/* Na pełnym ekranie rozmowa przewija się razem ze stroną —
                nie potrzebuje własnego okienka z paskiem. */}
            <div className="mt-3 space-y-0.5">
              {thread.messages.map((message, index) => {
                // Grupowanie jak na Slacku: kolejne wypowiedzi tej samej osoby
                // pod rząd dostają jeden awatar i nagłówek. Ściana powtórzonych
                // imion i godzin męczy oko, a rozmowa czyta się jako bloki
                // „kto mówił", nie jako lista osobnych karteczek.
                const previous = thread.messages[index - 1];
                const grouped = previous?.author === message.author;

                return (
                  <div key={index} className="flex gap-2.5 py-1">
                    {grouped ? (
                      <span className="w-8 shrink-0" />
                    ) : (
                      <Avatar name={message.author} size={32} />
                    )}

                    <div className="min-w-0 flex-1">
                      {!grouped && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold">{message.author}</span>
                          <span className="font-mono text-[10px] text-ink-dim">
                            {shortDate(message.at)}
                          </span>
                        </div>
                      )}

                      {editing?.id === thread.id && editing.index === index ? (
                        <div className="mt-1">
                          <TextArea
                            label=""
                            aria-label="Popraw wypowiedź"
                            value={editing.text}
                            onChange={(e) =>
                              setEditing({ ...editing, text: e.target.value })
                            }
                            rows={3}
                          />
                          <div className="mt-1 flex gap-2">
                            <Button size="sm" variant="primary" onClick={() => void saveEdit(thread)}>
                              Zapisz
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                              Anuluj
                            </Button>
                          </div>
                        </div>
                      ) : (
                        message.text && (
                          <p
                            className="whitespace-pre-wrap text-sm leading-relaxed"
                            style={{ overflowWrap: 'anywhere' }}
                          >
                            {message.text}
                            {message.editedAt && (
                              // Widoczny ślad poprawki: w rozmowie, do której
                              // inni się odnoszą, cicha podmiana treści byłaby
                              // myląca.
                              <span className="ml-1 font-mono text-[10px] text-ink-dim">
                                (poprawione)
                              </span>
                            )}
                          </p>
                        )
                      )}

                      {message.image && (
                        // Podgląd w miejscu (lightbox), nie link na surowy plik
                        // w Storage: klik otwiera obraz w oknie nad panelem.
                        <button
                          type="button"
                          onClick={() => setPreview(message.image!)}
                          aria-label="Powiększ obrazek"
                          className="mt-1 block max-w-[12rem] overflow-hidden rounded-lg border border-edge transition hover:border-accent"
                        >
                          <img src={message.image} alt="" className="w-full" />
                        </button>
                      )}
                    </div>

                    {/* Poprawa i usunięcie własnej wypowiedzi; admin sprząta
                        wszystkie. Wypowiedzi sprzed wprowadzenia zapisu konta
                        autora nie mają czym się wylegitymować — te ruszy tylko
                        admin, inaczej wystarczyłoby zmienić sobie imię na cudze. */}
                    {canEditMessage(message, currentUid, canDelete(role)) &&
                      editing?.index !== index && (
                        <span className="flex shrink-0 gap-0.5">
                          <button
                            type="button"
                            aria-label={`Popraw wypowiedź ${message.author}`}
                            onClick={() =>
                              setEditing({ id: thread.id, index, text: message.text })
                            }
                            className="rounded p-1 text-ink-dim transition hover:text-accent"
                          >
                            <Icon name="pencil" size={13} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Usuń wypowiedź ${message.author}`}
                            onClick={() => void removeOne(thread, index)}
                            className="rounded p-1 text-ink-dim transition hover:text-danger"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </span>
                      )}
                  </div>
                );
              })}
            </div>

            {!thread.closed && (
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
                    namePrefix={`msg-${thread.id}-${author}`}
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    icon="rocket"
                    onClick={() => void send(thread)}
                    // Sam obrazek bez słowa też jest wypowiedzią.
                    disabled={replying || (reply.trim().length === 0 && replyImages.length === 0)}
                  >
                    {replying ? 'Wysyłam…' : 'Wyślij'}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-edge pt-3">
              {/* Zamiana wątku w zgłoszenie tylko dla moderacji
                  (admin / co-admin / programmer). Coworker, edytor i podgląd
                  dyskutują, ale nie decydują, co ląduje w kolejce zgłoszeń. */}
              {canModerate(role) && (
                <Button size="sm" icon="megaphone" onClick={() => void toReport(thread)}>
                  Zrób z tego zgłoszenie
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                icon={thread.closed ? 'undo' : 'tick'}
                onClick={() => void toggleClosed(thread)}
              >
                {thread.closed ? 'Otwórz ponownie' : 'Ustalone'}
              </Button>
              {/* Usunąć wątek może TYLKO admin (reguły Firestore: jestAdmin).
                  Wcześniej przycisk był niezabezpieczony, więc co-admin/edytor
                  też go widział, klikał i dostawał fałszywe „Wątek usunięty",
                  choć reguły odrzucały zapis. Bramka jak przy usuwaniu
                  zgłoszeń (ReportsPanel: canDelete). */}
              {canDelete(role) && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  className="text-danger"
                  onClick={() => void remove(thread)}
                >
                  Usuń
                </Button>
              )}
            </div>
          </div>
  );

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
    setReply('');
    setReplyImages([]);
  };

  // Otwarty wątek zajmuje cały ekran, nie okno.
  //
  // Modal na telefonie miał sztywną wysokość i długa rozmowa nie mieściła się
  // w nim — dolne wypowiedzi i przyciski wychodziły poza krawędź. Pełny ekran
  // z paskiem „Wróć" na górze przewija się naturalnie i daje polu odpowiedzi
  // całą dostępną szerokość.
  if (openThread) {
    return (
      <section aria-label={`Wątek: ${openThread.title}`}>
        {dialog}
        <ImageLightbox src={preview} onClose={() => setPreview(null)} />

        <div
          className="sticky top-0 -mx-4 mb-3 flex items-center gap-2 border-b border-edge bg-bg/95 px-4 py-2 backdrop-blur"
          style={{ zIndex: 'var(--z-sticky)' }}
        >
          <Button variant="ghost" size="sm" icon="arrowLeft" onClick={back}>
            Wróć
          </Button>
          <span className="min-w-0 flex-1 truncate font-display font-bold">
            {openThread.title}
          </span>
        </div>

        {renderThread(openThread)}
      </section>
    );
  }

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

      {/* `role="alert"`: komunikat pojawia się dopiero po nieudanym wczytaniu,
          więc bez tego czytnik ekranu w ogóle o nim nie mówi — użytkownik widzi
          pustą listę i nie wie, że coś poszło nie tak. Zgłoszenia robią to tak
          samo (`Alert tone="danger"`). */}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
        >
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


    </section>
  );
}
