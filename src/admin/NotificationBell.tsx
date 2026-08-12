import { useEffect, useRef, useState } from 'react';
import {
  markAllRead,
  markRead,
  removeAllMine,
  removeNotification,
  watchMine,
  type Notification,
} from '../firebase/notifications';
import { Icon, type IconName } from '../ui/icons/Icon';
import { Avatar } from './Avatar';
import { formatDate } from './formatDate';

interface NotificationBellProps {
  /** Konto zalogowanego — czyja to skrzynka. */
  uid: string;
  /** Otwiera miejsce, którego dotyczy powiadomienie (ścieżka w panelu). */
  onOpen: (link: string) => void;
}

/** Ikona zależna od tego, co się stało — żeby rozpoznać rodzaj bez czytania. */
const KIND_ICON: Record<Notification['kind'], IconName> = {
  'report-dismissed': 'close',
  'report-fixed': 'flask',
  'discussion-reply': 'message',
  announcement: 'megaphone',
};


/**
 * Dzwonek powiadomień w nagłówku panelu.
 *
 * Pokazuje, ile rzeczy czeka, i po kliknięciu rozwija listę: co się stało, kto
 * to zrobił i kiedy. Kliknięcie w wpis przenosi tam, gdzie sprawa się dzieje
 * (zgłoszenie, wątek), i oznacza go jako przeczytany.
 *
 * Powiadomienia zostają, dopóki ktoś ich nie usunie — lista sama się nie
 * sprząta, bo to zapis tego, co się wydarzyło, a nie chwilowy komunikat.
 */
export function NotificationBell({ uid, onOpen }: NotificationBellProps) {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => watchMine(uid, setItems), [uid]);

  // Klik poza panelem i Escape zamykają listę — jak w każdym menu.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      // Fokus wraca na dzwonek. Bez tego zamknięcie listy zostawiało go na
      // znikającym elemencie, więc kolejny Tab startował od góry strony.
      bellRef.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const unread = items.filter((item) => !item.read).length;

  const openItem = (item: Notification) => {
    if (!item.read) void markRead(item.id);
    if (item.link) {
      onOpen(item.link);
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={bellRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread > 0 ? `Powiadomienia: ${unread} nowe` : 'Powiadomienia'}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-edge text-ink-dim transition hover:border-accent hover:text-accent"
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 font-display text-[10px] font-bold text-bg"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] overflow-auto rounded-xl border border-edge bg-surface shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-edge p-3">
            <span className="font-display text-sm font-bold">Powiadomienia</span>
            {items.length > 0 && (
              <span className="flex gap-1">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllRead(uid)}
                    className="rounded px-2 py-1 text-xs text-ink-dim transition hover:text-accent"
                  >
                    Przeczytane
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void removeAllMine(uid)}
                  className="rounded px-2 py-1 text-xs text-ink-dim transition hover:text-danger"
                >
                  Wyczyść
                </button>
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <p className="p-4 text-sm text-ink-dim">Nic nowego.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-start gap-2 border-b border-edge p-3 last:border-b-0 ${
                    item.read ? 'opacity-60' : ''
                  }`}
                >
                  {item.from ? (
                    <Avatar name={item.from} size={28} />
                  ) : (
                    <span className="mt-0.5 text-accent">
                      <Icon name={KIND_ICON[item.kind]} size={16} />
                    </span>
                  )}

                  {/* Cały wpis klikalny, gdy prowadzi do konkretnego miejsca. */}
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    disabled={!item.link}
                    className="min-w-0 flex-1 text-left disabled:cursor-default"
                  >
                    {/* Przeczytane różni się tylko przygaszeniem, a licznik
                        w odznace jest ukryty przed czytnikiem — bez tego
                        wszystkie wpisy brzmiałyby dla niego identycznie. */}
                    {!item.read && <span className="sr-only">Nowe: </span>}
                    <span className="block text-sm leading-snug">{item.title}</span>
                    {item.body && (
                      <span className="mt-0.5 block truncate text-xs text-ink-dim">
                        {item.body}
                      </span>
                    )}
                    <span className="mt-1 block font-mono text-[10px] text-ink-dim">
                      {formatDate(item.createdAt)}
                    </span>
                  </button>

                  <span className="flex shrink-0 flex-col gap-1">
                    {!item.read && (
                      <button
                        type="button"
                        aria-label="Oznacz jako przeczytane"
                        onClick={() => void markRead(item.id)}
                        className="rounded p-1 text-ink-dim transition hover:text-accent"
                      >
                        <Icon name="tick" size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Usuń powiadomienie"
                      onClick={() => void removeNotification(item.id)}
                      className="rounded p-1 text-ink-dim transition hover:text-danger"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
