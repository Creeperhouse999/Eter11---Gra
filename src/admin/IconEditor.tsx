import { useRef, useState } from 'react';
import type { CustomIcon } from '../data/customIcons';
import { uploadImage } from '../firebase/upload';
import { Button } from '../ui/controls/Button';
import { TextField } from '../ui/controls/Field';
import { Tooltip } from '../ui/controls/Tooltip';
import { Icon, ICON_NAMES } from '../ui/icons/Icon';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';

interface IconEditorProps {
  icons?: CustomIcon[];
  onChange: (icons: CustomIcon[]) => void;
}

/**
 * Biblioteka ikon.
 *
 * Zestaw wbudowany (kilkadziesiąt ikon) jest w kodzie — pokazujemy go do
 * podglądu, ale zmienia się go tylko przez repozytorium. Zespół dokłada
 * własne: wgrywa plik, nadaje nazwę, i od tej chwili ikona jest do wyboru
 * wszędzie tam, gdzie wbudowane — na kartach, kategoriach, rodzinach,
 * postaciach.
 */
export function IconEditor({ icons, onChange }: IconEditorProps) {
  const custom = icons ?? [];
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const added: CustomIcon[] = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      // Nazwa domyślna z pliku, bez rozszerzenia — redaktor i tak może ją
      // zmienić, ale „ikona-3" jest gorsza niż „lisek".
      const label = file.name.replace(/\.[^.]+$/, '') || `ikona-${custom.length + i}`;
      const name = `icon-${custom.length + added.length}-${i}`;

      const result = await uploadImage({ file, folder: 'icons', name });
      if (result.ok && result.url) {
        added.push({ name: label, url: result.url });
      } else {
        toast(result.error ?? 'Nie udało się wgrać ikony.', 'danger');
      }
    }

    if (added.length > 0) {
      onChange([...custom, ...added]);
      toast(`Dodano ${added.length} ${added.length === 1 ? 'ikonę' : 'ikon'}.`, 'success');
    }
    setUploading(false);
    if (input.current) input.current.value = '';
  };

  const rename = (index: number, name: string) => {
    onChange(custom.map((icon, i) => (i === index ? { ...icon, name } : icon)));
  };

  const remove = async (index: number) => {
    const icon = custom[index];
    const confirmed = await confirm({
      title: 'Usunąć ikonę?',
      message:
        `„${icon.name}" zniknie z wyboru. Karty i kategorie, które jej używają, ` +
        'zostaną bez ikony, dopóki nie wybierzesz im innej.',
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!confirmed) return;

    onChange(custom.filter((_, i) => i !== index));
    toast('Ikona usunięta.');
  };

  return (
    <section aria-label="Ikony">
      {dialog}
      <h2 className="font-display text-lg font-bold">Ikony</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Wgraj własne ikony — będą do wyboru wszędzie, gdzie wbudowane: na
        kartach, kategoriach, rodzinach i postaciach. PNG, JPG lub SVG.
      </p>

      <div className="mt-4">
        <Button
          variant="primary"
          icon="plus"
          disabled={uploading}
          onClick={() => input.current?.click()}
        >
          {uploading ? 'Wgrywam…' : 'Wgraj ikony'}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          multiple
          className="hidden"
          onChange={(e) => void pick(e.target.files)}
        />
      </div>

      {custom.length > 0 && (
        <>
          <h3 className="eter-label mt-6">Twoje ikony ({custom.length})</h3>
          <ul className="eter-stagger mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {custom.map((icon, index) => (
              <li
                key={icon.url}
                className="flex items-center gap-2.5 rounded-lg border border-edge bg-surface p-2.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-raised">
                  <img src={icon.url} alt="" className="h-6 w-6 object-contain" />
                </span>

                <TextField
                  value={icon.name}
                  aria-label="Nazwa ikony"
                  className="min-w-0 flex-1"
                  onChange={(e) => rename(index, e.target.value)}
                />

                <Button
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  aria-label={`Usuń ikonę ${icon.name}`}
                  className="shrink-0 text-danger"
                  onClick={() => void remove(index)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Zestaw wbudowany — tylko do podglądu. Zespół prosił, żeby widzieć,
          co już jest, zanim wgra coś takiego samego. */}
      <h3 className="eter-label mt-6">Wbudowane ({ICON_NAMES.length})</h3>
      <p className="mt-1 text-xs text-ink-dim">
        Te są w kodzie i zawsze dostępne. Nie da się ich usunąć ani zmienić
        z panelu.
      </p>
      <div className="mt-2 grid grid-cols-8 gap-1.5 sm:grid-cols-12">
        {ICON_NAMES.map((name) => (
          // Custom podpowiedź zamiast natywnego `title`: szary systemowy dymek
          // odstawał od panelu, a na telefonie Google Translate tłumaczył nazwy
          // ikon. `aspect-square` siedzi na owijce, bo to ona jest teraz komórką
          // siatki i to ona musi trzymać kwadratowy kształt.
          <Tooltip key={name} label={name} className="aspect-square">
            <span className="flex h-full w-full items-center justify-center rounded bg-surface text-ink-dim">
              <Icon name={name} size={18} />
            </span>
          </Tooltip>
        ))}
      </div>
    </section>
  );
}
