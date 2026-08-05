import { useEffect, useRef, useState } from 'react';
import { uploadImage } from '../firebase/upload';
import { Button } from '../ui/controls/Button';
import { Icon } from '../ui/icons/Icon';
import { useToast } from '../ui/controls/Toast';

interface ImageUploadProps {
  /** Adresy już wgranych obrazków. */
  value: string[];
  onChange: (urls: string[]) => void;
  /** Folder w Storage — decyduje o regułach dostępu. */
  folder: 'icons' | 'reports' | 'discussions' | 'cards';
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

  const pick = async (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files);
    if (list.length === 0) return;

    const room = max - value.length;
    if (room <= 0) {
      toast(`Można dołączyć najwyżej ${max}.`, 'danger');
      return;
    }

    setBusy(true);
    const chosen = list.slice(0, room);
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

  // Wklejanie zrzutu ze schowka (Ctrl+V) — ta sama ścieżka co wybór pliku.
  //
  // Zgłoszono, że dołączanie obrazka powinno działać także przez wklejenie:
  // robisz zrzut, wciskasz Ctrl+V i obraz ląduje w załącznikach, bez zapisywania
  // pliku i klikania „Dodaj". Nasłuch jest na `document`, bo zdarzenie `paste`
  // trafia do aktywnego pola (np. opisu zgłoszenia), nie do tego komponentu —
  // a w danym momencie widoczny jest najwyżej jeden formularz z uploadem.
  //
  // `pickRef` trzyma aktualną wersję `pick` (świeże `value`/`busy`), żeby
  // nasłuch nie musiał się przepinać przy każdym stanie, a mimo to wołał
  // funkcję znającą bieżącą listę.
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const roomLeft = max - value.length;
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      const files = Array.from(items)
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (files.length === 0) return;
      // Brak miejsca albo trwa wysyłka — nie przechwytujemy wklejenia, żeby nie
      // blokować normalnego wklejania tekstu, gdy załączać już nie ma czego.
      if (busy || roomLeft <= 0) return;
      // Blokujemy domyślne wklejenie obrazka jako zawartości pola, skoro
      // przechwytujemy go do załączników.
      event.preventDefault();
      void pickRef.current(files);
    };

    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [busy, roomLeft]);

  const remove = (url: string) => onChange(value.filter((u) => u !== url));

  // SVG wolno tylko tam, gdzie wgrywa wyłącznie zalogowany zespół (patrz
  // `upload.ts` — reguły Storage puszczają `reports`/`discussions` bez
  // konta, a SVG to XML mogący zawierać skrypt).
  const svgAllowed = folder === 'icons' || folder === 'cards';
  const accept = svgAllowed
    ? 'image/png,image/jpeg,image/webp,image/svg+xml'
    : 'image/png,image/jpeg,image/webp';

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
        accept={accept}
        multiple={max > 1}
        className="hidden"
        onChange={(e) => void pick(e.target.files)}
      />

      <p className="mt-1 text-[11px] text-ink-dim">
        {value.length} / {max} · {svgAllowed ? 'PNG, JPG lub SVG' : 'PNG lub JPG'}
      </p>
    </div>
  );
}
