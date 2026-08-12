import { useEffect, useState } from 'react';
import {
  addAnnouncement,
  removeAnnouncement,
  setPinned,
  watchAnnouncements,
  MAX_BODY,
  MAX_TITLE,
  type Announcement,
} from '../firebase/announcements';
import { notify } from '../firebase/notifications';
import { canManageRoles, watchTeam, type Role, type TeamMember } from '../firebase/roles';
import { Button } from '../ui/controls/Button';
import { TextArea, TextField } from '../ui/controls/Field';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { Avatar } from './Avatar';
import { Icon } from '../ui/icons/Icon';

interface AnnouncementsPanelProps {
  /** Imię zalogowanego — podpisuje ogłoszenie. */
  author: string;
  /** Konto zalogowanego — nie powiadamiamy go o własnym ogłoszeniu. */
  currentUid: string;
  /** Rola: wysyła, przypina i kasuje tylko admin. */
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
 * Ogłoszenia dla zespołu.
 *
 * Jedna wiadomość do wszystkich, bez odpowiadania i bez statusu — na to są
 * dyskusje i zgłoszenia. Po wysłaniu trafia w dzwonek każdemu i zostaje tutaj,
 * więc da się wrócić do treści po skasowaniu powiadomienia. Wyróżnione
 * ogłoszenie trzyma się góry listy.
 */
export function AnnouncementsPanel({ author, currentUid, role }: AnnouncementsPanelProps) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [items, setItems] = useState<Announcement[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => watchAnnouncements((next) => {
    setItems(next);
    setLoading(false);
  }), []);
  useEffect(() => watchTeam(setTeam), []);

  const mayManage = canManageRoles(role);

  const send = async () => {
    if (sending) return;
    setSending(true);
    const result = await addAnnouncement({ title, body, author });
    setSending(false);

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się wysłać.', 'danger');
      return;
    }

    // Ogłoszenie ma dotrzeć do wszystkich, także tych, którzy nie zaglądają na
    // tę listę — stąd powiadomienie dla każdego konta zespołu.
    void notify({
      uids: team.map((member) => member.uid),
      kind: 'announcement',
      title: title.trim(),
      body: body.trim().slice(0, 140) || undefined,
      from: author,
      link: '/admin/announcements',
      exceptUid: currentUid,
    });

    setTitle('');
    setBody('');
    toast('Ogłoszenie wysłane.', 'success');
  };

  const remove = async (item: Announcement) => {
    const ok = await confirm({
      title: 'Usunąć ogłoszenie?',
      message: `„${item.title}" zniknie z listy. Powiadomienia, które już poszły, zostaną.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!ok) return;
    // Odrzucony zapis musi się odezwać: bez tego ogłoszenie zostawało na
    // liście bez słowa wyjaśnienia, a admin klikał kosz w kółko.
    const result = await removeAnnouncement(item.id);
    if (!result.ok) {
      toast(result.error ?? 'Nie udało się usunąć ogłoszenia.', 'danger');
      return;
    }
    toast('Ogłoszenie usunięte.', 'success');
  };

  /** Wyróżnienie na górze listy. Nieudany zapis mówi dlaczego. */
  const togglePinned = async (id: string, pinned: boolean) => {
    const result = await setPinned(id, pinned);
    if (!result.ok) toast(result.error ?? 'Nie udało się zmienić wyróżnienia.', 'danger');
  };

  return (
    <div>
      {dialog}

      {mayManage && (
        <section className="rounded-xl border border-edge bg-surface p-4">
          <h2 className="font-display font-bold">Nowe ogłoszenie</h2>
          <p className="mt-1 text-xs text-ink-dim">
            Trafi do wszystkich w dzwonku i zostanie na liście poniżej.
          </p>

          <div className="mt-3 space-y-2">
            <TextField
              label="Tytuł"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. W piątek testujemy grę z dziećmi"
              maxLength={MAX_TITLE}
            />
            <TextArea
              label="Treść"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Szczegóły — co, kiedy, czego potrzebujecie."
              rows={3}
              maxLength={MAX_BODY}
            />
            <div className="flex justify-end">
              <Button
                icon="megaphone"
                onClick={() => void send()}
                disabled={sending || title.trim().length === 0}
              >
                {sending ? 'Wysyłam…' : 'Wyślij do zespołu'}
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className={mayManage ? 'mt-4' : ''}>
        {loading ? (
          <p className="text-sm text-ink-dim">Wczytywanie…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink-dim">Nic tu jeszcze nie ogłoszono.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border bg-surface p-4 ${
                  item.pinned ? 'border-accent' : 'border-edge'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={item.author} size={32} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {item.pinned && (
                        <span className="flex items-center gap-1 text-accent">
                          <Icon name="spark" size={13} />
                          <span className="text-[10px] font-bold uppercase tracking-wide">
                            Wyróżnione
                          </span>
                        </span>
                      )}
                      <span className="font-display text-sm font-bold">{item.title}</span>
                    </div>
                    {item.body && (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                        {item.body}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-[10px] text-ink-dim">
                      {item.author} · {formatDate(item.createdAt)}
                    </p>
                  </div>

                  {mayManage && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label={item.pinned ? 'Przestań wyróżniać' : 'Wyróżnij'}
                        onClick={() => void togglePinned(item.id, !item.pinned)}
                        className={`rounded p-1.5 transition hover:text-accent ${
                          item.pinned ? 'text-accent' : 'text-ink-dim'
                        }`}
                      >
                        <Icon name="spark" size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Usuń ogłoszenie"
                        onClick={() => void remove(item)}
                        className="rounded p-1.5 text-ink-dim transition hover:text-danger"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
