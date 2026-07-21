import { useEffect, useState } from 'react';
import { watchHistory, HISTORY_LIMIT, type ContentVersion } from '../firebase/history';
import type { GameContent } from '../firebase/validate';
import { Button } from '../ui/controls/Button';
import { Icon } from '../ui/icons/Icon';
import { useConfirm } from '../ui/controls/useConfirm';

interface HistoryPanelProps {
  /** Wczytuje wersję do edytora. Zapis pozostaje osobną decyzją. */
  onRestore: (content: GameContent) => void;
  /** Znacznik wersji obecnie zapisanej — żeby oznaczyć ją na liście. */
  currentVersion?: string;
}

function when(iso: string): string {
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
 * Ostatnie zapisy treści, z możliwością cofnięcia się do nich.
 *
 * Nadpisanie treści kasuje poprzednią wersję bezpowrotnie — to jedyna
 * nieodwracalna rzecz w panelu, a robią ją cztery osoby na jednym
 * dokumencie. Bez historii „Adam nadpisał mój wstęp" znaczyło: napisz go
 * jeszcze raz z pamięci.
 *
 * Przywrócenie wczytuje wersję do edytora, ale NIE zapisuje jej od razu:
 * cofnięcie się o pięć wersji to poważna decyzja, a redaktor ma najpierw
 * zobaczyć, co dostał, i móc się rozmyślić przyciskiem „Odrzuć zmiany".
 */
export function HistoryPanel({ onRestore, currentVersion }: HistoryPanelProps) {
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    const stop = watchHistory((next) => {
      setVersions(next);
      setLoading(false);
    });
    return stop;
  }, []);

  const restore = async (version: ContentVersion) => {
    const confirmed = await confirm({
      title: 'Wczytać tę wersję?',
      message:
        `Edytor pokaże treść z ${when(version.at)} (${version.author}). ` +
        'Twoje niezapisane zmiany przepadną, a wczytana wersja trafi do gry ' +
        'dopiero po kliknięciu „Zapisz".',
      confirmLabel: 'Wczytaj',
    });
    if (!confirmed) return;
    onRestore(version.content);
  };

  return (
    <section aria-label="Historia zapisów">
      {dialog}
      <h2 className="font-display text-lg font-bold">Historia zapisów</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        {HISTORY_LIMIT} ostatnich zapisów. Wczytanie starszej wersji podmienia
        treść w edytorze — do gry trafi dopiero po zapisaniu.
      </p>

      {loading && <p className="mt-4 text-sm text-ink-dim">Wczytuję…</p>}

      {!loading && versions.length === 0 && (
        <p className="mt-4 rounded-lg border border-edge bg-surface p-3 text-sm text-ink-dim">
          Historia jest pusta. Pierwszy wpis pojawi się przy najbliższym zapisie.
        </p>
      )}

      <ol className="eter-stagger mt-4 space-y-2">
        {versions.map((version, index) => {
          const current = version.at === currentVersion;

          return (
            <li
              key={version.id}
              className={[
                'flex flex-wrap items-center gap-3 rounded-lg border bg-surface p-3',
                current ? 'border-accent' : 'border-edge',
              ].join(' ')}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs"
                style={{
                  background: 'var(--eter-raised)',
                  color: current ? 'var(--eter-accent)' : 'var(--eter-ink-dim)',
                }}
              >
                {index === 0 ? <Icon name="flag" size={14} /> : index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{version.author || 'Nieznany'}</span>
                  <span className="text-ink-dim"> · {when(version.at)}</span>
                  {current && <span className="ml-2 text-xs text-accent">w grze teraz</span>}
                </p>
                {/* Opis zmian, nie sam znacznik czasu: „zapisano 14:32" nie
                    mówi, czy warto się cofać. „karty (+2), teksty" mówi. */}
                <p className="mt-0.5 font-mono text-[11px] text-ink-dim">{version.summary}</p>
              </div>

              <Button
                size="sm"
                variant="ghost"
                icon="undo"
                disabled={current}
                onClick={() => void restore(version)}
              >
                {current ? 'Aktualna' : 'Wczytaj'}
              </Button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
