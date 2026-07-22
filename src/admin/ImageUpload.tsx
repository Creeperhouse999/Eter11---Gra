import { useRef, useState } from 'react';
import { uploadImage } from '../firebase/upload';
import { Button } from '../ui/controls/Button';
import { Icon } from '../ui/icons/Icon';
import { useToast } from '../ui/controls/Toast';

interface ImageUploadProps {
  /** Adresy już wgranych obrazków. */
  value: string[];
  onChange: (urls: string[]) => void;
  /** Folder w Storage — decyduje o regułach dostępu. */
  folder: 'icons' | 'reports' | 'discussions';
  /** Ile obrazków wolno dołączyć. */
  max: number;
  /** Prefiks nazwy pliku — unikalność składamy z niego i licznika. */
  namePrefix: string;
  label?: string;
}

/**
 * Dodawanie obrazków przez wgranie pliku.
 *
 * Wspólne dla zgłoszeń, dyskusji i ikon — różnią się tylko folderem, limitem
 * i tym, kto może pisać (o czym decydują reguły Storage, nie ten komponent).
 *
 * Kompresja i wysyłka są w `uploadImage`; tutaj jest tylko wybór pliku,
 * pasek postępu i miniatury z możliwością usunięcia przed wysłaniem formularza.
 */
export function ImageUpload({
  value,
  onChange,
  folder,
  max,
  namePrefix,
  label,
}: ImageUploadProps) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const room = max - value.length;
    if (room <= 0) {
      toast(`Można dołączyć najwyżej ${max}.`, 'danger');
      return;
    }

    setBusy(true);
    const chosen = Array.from(files).slice(0, room);
    const added: string[] = [];

    for (let i = 0; i < chosen.length; i += 1) {
      // Nazwa z losowego identyfikatora, nie z licznika.
      //
      // Wcześniej było `${prefix}-${index}`, a prefiks bywał stały
      // (`report-anon` dla każdego zgłoszenia bez konta). Ścieżka w Storage
      // jest deterministyczna, a wysyłka nadpisuje — więc dwa zgłoszenia
      // z obrazkiem pisały pod ten sam adres i drugie kasowało pierwsze.
      // `randomUUID` daje adres, którego nic innego nie zajmie.
      const name = `${namePrefix}-${crypto.randomUUID()}`;
      const result = await uploadImage({ file: chosen[i], folder, name });

      if (result.ok && result.url) {
        added.push(result.url);
      } else {
        toast(result.error ?? 'Nie udało się wysłać obrazu.', 'danger');
      }
    }

    if (added.length > 0) onChange([...value, ...added]);
    setBusy(false);
    // Ten sam plik da się wybrać ponownie po usunięciu — input pamięta
    // ostatni wybór i bez tego drugie wybranie nie odpalałoby zdarzenia.
    if (input.current) input.current.value = '';
  };

  const remove = (url: string) => onChange(value.filter((u) => u !== url));

  return (
    <div>
      {label && <span className="text-sm text-ink-dim">{label}</span>}

      <div className="mt-1 flex flex-wrap gap-2">
        {value.map((url) => (
          <div
            key={url}
            className="group relative h-16 w-16 overflow-hidden rounded-lg border border-edge"
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label="Usuń obraz"
              className="absolute inset-0 flex items-center justify-center bg-bg/70 text-danger opacity-0 transition group-hover:opacity-100"
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}

        {value.length < max && (
          <Button
            variant="ghost"
            icon="plus"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="h-16 w-16 border border-dashed border-edge"
            aria-label="Dodaj obraz"
          >
            {busy ? '…' : ''}
          </Button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => void pick(e.target.files)}
      />

      <p className="mt-1 text-[11px] text-ink-dim">
        {value.length} / {max} · PNG, JPG lub SVG
      </p>
    </div>
  );
}
