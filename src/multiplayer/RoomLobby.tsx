import { ALL_CHARACTERS } from '../data/characters';
import { Avatar } from '../admin/Avatar';
import { Button } from '../ui/controls/Button';
import { Icon, type IconName } from '../ui/icons/Icon';
import { useConfirm } from '../ui/controls/useConfirm';
import { useToast } from '../ui/controls/Toast';
import { playersInOrder, setCharacter } from './room';
import type { Room } from './types';

interface RoomLobbyProps {
  room: Room;
  uid: string;
  isHost: boolean;
  onKick: (uid: string) => Promise<void>;
  onStart: () => void;
  onLeave: () => void;
}

/**
 * Poczekalnia pokoju: kto już jest, kod do rozesłania, start.
 *
 * Host widzi listę, może kogoś wyrzucić (nie wróci) i zaczyna grę, gdy zbierze
 * co najmniej dwóch. Reszta czeka. Kod jest duży i łatwy do przepisania albo
 * skopiowania.
 */
export function RoomLobby({ room, uid, isHost, onKick, onStart, onLeave }: RoomLobbyProps) {
  const players = playersInOrder(room);
  const { confirm, dialog } = useConfirm();
  const toast = useToast();

  const characterOf = (id: string) => ALL_CHARACTERS.find((c) => c.id === id);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      toast('Kod skopiowany.', 'success');
    } catch {
      toast('Skopiuj kod ręcznie: ' + room.code);
    }
  };

  const kick = async (target: string, name: string) => {
    const ok = await confirm({
      title: 'Wyrzucić gracza?',
      message: `${name} opuści pokój i nie będzie mógł wrócić.`,
      confirmLabel: 'Wyrzuć',
      tone: 'danger',
    });
    if (ok) await onKick(target);
  };

  return (
    <main className="eter-fade-in relative mx-auto max-w-lg px-4 py-10">
      {dialog}
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      <header className="relative text-center">
        <span className="eter-label">Poczekalnia</span>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="mt-2 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-accent bg-surface p-4 transition hover:bg-raised"
          title="Kliknij, żeby skopiować"
        >
          <span className="font-mono text-4xl font-bold tracking-[0.3em] text-accent">
            {room.code}
          </span>
          <Icon name="clipboard" size={20} className="text-ink-dim" />
        </button>
        <p className="mt-2 text-sm text-ink-dim">
          Podaj ten kod znajomym — wpiszą go, żeby dołączyć.
        </p>
      </header>

      <section className="relative mt-6 space-y-2" aria-label="Gracze w pokoju">
        {players.map((player) => {
          const character = characterOf(player.characterId);
          const isMe = player.uid === uid;
          return (
            <div
              key={player.uid}
              className="flex items-center gap-3 rounded-xl border border-edge bg-surface p-3"
            >
              <Avatar name={player.name} size={36} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-display font-bold">
                  {player.name}
                  {isMe && <span className="text-xs font-normal text-ink-dim">(Ty)</span>}
                  {player.uid === room.hostUid && (
                    <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-accent">
                      gospodarz
                    </span>
                  )}
                </span>
                {character && (
                  <span className="flex items-center gap-1 text-xs text-ink-dim">
                    <Icon name={character.icon as IconName} size={12} />
                    {character.name}
                  </span>
                )}
              </span>

              {!player.online && (
                <span className="text-xs text-ink-dim">poza grą</span>
              )}

              {isHost && !isMe && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  aria-label={`Wyrzuć gracza ${player.name}`}
                  className="text-danger"
                  onClick={() => void kick(player.uid, player.name)}
                />
              )}
            </div>
          );
        })}
      </section>

      {/* Wybór postaci — zajęte przez innych są niedostępne, żeby dwie osoby
          nie grały tą samą. */}
      <section className="relative mt-4 rounded-xl border border-edge bg-surface p-4">
        <span className="text-sm text-ink-dim">Twoja postać</span>
        <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Postać">
          {ALL_CHARACTERS.map((character) => {
            const takenBy = players.find(
              (p) => p.uid !== uid && p.characterId === character.id,
            );
            const mine = players.find((p) => p.uid === uid)?.characterId === character.id;
            return (
              <button
                key={character.id}
                type="button"
                role="radio"
                aria-checked={mine}
                aria-label={character.name}
                title={
                  takenBy ? `${character.name} — zajęta przez ${takenBy.name}` : character.name
                }
                disabled={Boolean(takenBy)}
                onClick={() => {
                  void setCharacter(room.code, uid, character.id).then((ok) => {
                    if (!ok) toast('Ktoś właśnie wziął tę postać.', 'danger');
                  });
                }}
                className={[
                  'flex h-11 w-11 items-center justify-center rounded-lg border transition',
                  mine
                    ? 'border-accent bg-raised text-accent'
                    : takenBy
                      ? 'cursor-not-allowed border-edge/50 text-ink-dim/30'
                      : 'border-edge text-ink-dim hover:border-ink-dim hover:text-ink',
                ].join(' ')}
              >
                <Icon name={character.icon as IconName} size={22} />
              </button>
            );
          })}
        </div>
      </section>

      <div className="relative mt-6 space-y-3">
        {isHost ? (
          <Button
            variant="primary"
            size="lg"
            icon="rocket"
            className="w-full"
            disabled={players.length < 2}
            title={players.length < 2 ? 'Potrzeba co najmniej dwóch graczy' : undefined}
            onClick={onStart}
          >
            {players.length < 2 ? 'Czekamy na graczy…' : `Zaczynamy (${players.length})`}
          </Button>
        ) : (
          <p className="rounded-lg border border-edge bg-surface p-3 text-center text-sm text-ink-dim">
            Czekamy, aż gospodarz zacznie grę.
          </p>
        )}

        <button
          type="button"
          onClick={onLeave}
          className="w-full text-center text-sm text-ink-dim underline hover:text-danger"
        >
          Wyjdź z pokoju
        </button>
      </div>
    </main>
  );
}
