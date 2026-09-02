import { useEffect, useState } from 'react';
import {
  applySection,
  removePreset,
  savePreset,
  watchPresets,
  type Preset,
  type PresetSection,
  SECTION_LABELS,
} from '../firebase/presets';
import { canDelete, canModerate, type Role } from '../firebase/roles';
import type { GameContent } from '../firebase/validate';
import { Button } from '../ui/controls/Button';
import { TextField } from '../ui/controls/Field';
import { Select } from '../ui/controls/Select';
import { useConfirm } from '../ui/controls/useConfirm';
import { useToast } from '../ui/controls/Toast';

interface PresetBarProps {
  section: PresetSection;
  content: GameContent;
  role: Role;
  author: string;
  onApply: (content: GameContent) => void;
}

/**
 * Pasek presetów nad zakładką.
 *
 * Zapisuje CAŁĄ sekcję: preset „Karty" to komplet kart, preset „Kolory" to
 * cały motyw (jasny i ciemny razem — to jeden wygląd, nie dwa niezależne).
 * Częściowy preset zostawiałby przy każdym wczytaniu pytanie „co właściwie
 * jest w środku".
 *
 * Zapisać może każdy redaktor — własny wariant to jego praca, a preset niczego
 * nie zmienia, dopóki ktoś go nie wczyta. WCZYTUJE admin i co-admin, bo
 * wczytanie podmienia sekcję całemu zespołowi naraz.
 */
export function PresetBar({ section, content, role, author, onApply }: PresetBarProps) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => watchPresets(setPresets), []);

  const mine = presets.filter((p) => p.section === section);
  const mayApply = canModerate(role);
  // Reguły w Firestore pozwalają skasować preset tylko `jestAdmin()` (admin,
  // programmer) — bez co-admina, tak samo jak przy moderacji zgłoszeń.
  // `canModerate` obejmuje szerzej, więc na przycisku usuwania trzeba
  // węższego sprawdzenia, inaczej co-admin dostaje przycisk, który zawsze
  // kończy się odmową z bazy.
  const mayDelete = canDelete(role);

  const save = async () => {
    // Ta sama nazwa w tej samej sekcji = nadpisanie, nie druga kopia. Inaczej
    // po kilku poprawkach lista puchnie od „Ciemny", „Ciemny 2", „Ciemny 2a".
    const istniejacy = mine.find(
      (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );

    if (istniejacy) {
      const ok = await confirm({
        title: 'Nadpisać preset?',
        message: `„${istniejacy.name}" już istnieje. Zapisany stan zastąpi poprzedni — nie da się go przywrócić.`,
        confirmLabel: 'Nadpisz',
        tone: 'danger',
      });
      if (!ok) return;
    }

    const result = await savePreset({
      section,
      name,
      author,
      content,
      overwriteId: istniejacy?.id,
    });
    if (!result.ok) {
      toast(result.error ?? 'Nie udało się zapisać presetu.', 'danger');
      return;
    }
    setName('');
    setOpen(false);
    toast(istniejacy ? 'Preset nadpisany.' : 'Preset zapisany.', 'success');
  };

  const load = async (preset: Preset) => {
    const ok = await confirm({
      title: `Wczytać „${preset.name}"?`,
      message:
        `Sekcja „${SECTION_LABELS[section]}" zostanie zastąpiona zawartością presetu. ` +
        'Twoje niezapisane zmiany w tej sekcji przepadną, a zmiana trafi do gry ' +
        'dopiero po kliknięciu „Zapisz".',
      confirmLabel: 'Wczytaj',
    });
    if (!ok) return;

    onApply(applySection(content, section, preset.data));
    toast(`Wczytano „${preset.name}". Sprawdź i zapisz.`, 'success');
  };

  const remove = async (preset: Preset) => {
    const ok = await confirm({
      title: 'Usunąć preset?',
      message: `„${preset.name}" zniknie z listy. Zapisanej w nim wersji nie da się odzyskać.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!ok) return;

    const result = await removePreset(preset.id);
    if (!result.ok) {
      toast(result.error ?? 'Nie udało się usunąć presetu.', 'danger');
      return;
    }
    toast('Preset usunięty.', 'success');
  };

  return (
    <div className="mb-4 rounded-lg border border-edge bg-raised p-3">
      {dialog}

      <div className="flex flex-wrap items-end gap-2">
        <span className="eter-label mr-auto">Presety — {SECTION_LABELS[section]}</span>

        {mine.length > 0 && mayApply && (
          <Select
            ariaLabel={`Wczytaj preset sekcji ${SECTION_LABELS[section]}`}
            className="w-56"
            value=""
            options={[
              { value: '', label: 'Wczytaj preset…' },
              ...mine.map((p) => ({ value: p.id, label: p.name })),
            ]}
            onChange={(id) => {
              const preset = mine.find((p) => p.id === id);
              if (preset) void load(preset);
            }}
          />
        )}

        {/* Redaktor bez prawa wczytywania i tak widzi, co jest zapisane —
            inaczej nie wiedziałby, czy jego preset w ogóle się zapisał. */}
        {mine.length > 0 && !mayApply && (
          <span className="text-xs text-ink-dim">
            Zapisane: {mine.map((p) => p.name).join(', ')}. Wczytuje admin.
          </span>
        )}

        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? 'Anuluj' : 'Zapisz obecny stan'}
        </Button>
      </div>

      {open && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <TextField
            label="Nazwa presetu"
            className="w-64"
            value={name}
            maxLength={60}
            placeholder="np. Wersja świąteczna"
            onChange={(e) => setName(e.target.value)}
          />
          <Button size="sm" variant="primary" onClick={() => void save()}>
            Zapisz
          </Button>
        </div>
      )}

      {mine.length > 0 && mayApply && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {mine.map((preset) => (
            <li
              key={preset.id}
              className="flex items-center gap-1 rounded border border-edge bg-surface px-2 py-1 text-xs"
            >
              <span className="font-mono">{preset.name}</span>
              <span className="text-ink-dim">· {preset.author}</span>
              {mayDelete && (
                <button
                  type="button"
                  aria-label={`Usuń preset ${preset.name}`}
                  onClick={() => void remove(preset)}
                  className="rounded p-0.5 text-ink-dim transition hover:text-danger"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
