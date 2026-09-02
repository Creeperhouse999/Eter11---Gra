import { useEffect, useState } from 'react';
import {
  applyBundle,
  PRESET_SECTIONS,
  removeBundle,
  saveBundle,
  SECTION_LABELS,
  watchBundles,
  watchPresets,
  type Preset,
  type PresetBundle,
  type PresetSection,
} from '../firebase/presets';
import { canDelete, canModerate, type Role } from '../firebase/roles';
import type { GameContent } from '../firebase/validate';
import { Button } from '../ui/controls/Button';
import { TextField } from '../ui/controls/Field';
import { Select } from '../ui/controls/Select';
import { useConfirm } from '../ui/controls/useConfirm';
import { useToast } from '../ui/controls/Toast';

interface PresetBundleBarProps {
  content: GameContent;
  role: Role;
  author: string;
  onApply: (content: GameContent) => void;
}

const NONE = '';

/**
 * Zestaw: preset całej apki, który WSKAZUJE presety poszczególnych sekcji
 * zamiast kopiować ich treść — poprawka w presecie kolorów przechodzi więc
 * na każdy zestaw, który go używa (Alan: „preset całej apki, który zawiera
 * podłączone presety każdej kategorii").
 *
 * Uprawnienia jak przy `PresetBar`: zapisuje każdy redaktor, wczytuje admin
 * i co-admin (podmienia treść całemu zespołowi), a usuwa tylko admin/
 * programista — tak samo jak reguła `presetBundles` w Firestore.
 */
export function PresetBundleBar({ content, role, author, onApply }: PresetBundleBarProps) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [bundles, setBundles] = useState<PresetBundle[]>([]);
  const [name, setName] = useState('');
  const [parts, setParts] = useState<Partial<Record<PresetSection, string>>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => watchPresets(setPresets), []);
  useEffect(() => watchBundles(setBundles), []);

  const mayApply = canModerate(role);
  const mayDelete = canDelete(role);
  const sectionsWithPresets = PRESET_SECTIONS.filter((section) =>
    presets.some((p) => p.section === section),
  );

  const save = async () => {
    const istniejacy = bundles.find(
      (b) => b.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );

    if (istniejacy) {
      const ok = await confirm({
        title: 'Nadpisać zestaw?',
        message: `„${istniejacy.name}" już istnieje. Zapisany wybór zastąpi poprzedni — nie da się go przywrócić.`,
        confirmLabel: 'Nadpisz',
        tone: 'danger',
      });
      if (!ok) return;
    }

    const result = await saveBundle({
      name,
      author,
      parts,
      overwriteId: istniejacy?.id,
    });
    if (!result.ok) {
      toast(result.error ?? 'Nie udało się zapisać zestawu.', 'danger');
      return;
    }
    setName('');
    setParts({});
    setOpen(false);
    toast(istniejacy ? 'Zestaw nadpisany.' : 'Zestaw zapisany.', 'success');
  };

  const load = async (bundle: PresetBundle) => {
    const sekcje = (Object.keys(bundle.parts) as PresetSection[])
      .map((s) => SECTION_LABELS[s])
      .join(', ');
    const ok = await confirm({
      title: `Wczytać „${bundle.name}"?`,
      message:
        `Zastąpi zawartość sekcji: ${sekcje}. ` +
        'Niezapisane zmiany w tych sekcjach przepadną, a zmiana trafi do gry ' +
        'dopiero po kliknięciu „Zapisz".',
      confirmLabel: 'Wczytaj',
    });
    if (!ok) return;

    const { content: wynik, missing } = applyBundle(content, bundle, presets);
    onApply(wynik);
    if (missing.length > 0) {
      const brakujace = missing.map((s) => SECTION_LABELS[s]).join(', ');
      toast(
        `Wczytano „${bundle.name}", ale presety dla: ${brakujace} zostały skasowane — te sekcje zostały bez zmian.`,
        'danger',
      );
    } else {
      toast(`Wczytano „${bundle.name}". Sprawdź i zapisz.`, 'success');
    }
  };

  const remove = async (bundle: PresetBundle) => {
    const ok = await confirm({
      title: 'Usunąć zestaw?',
      message: `„${bundle.name}" zniknie z listy. Presety, na które wskazywał, zostają — usuwa się tylko samo wskazanie.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!ok) return;

    const result = await removeBundle(bundle.id);
    if (!result.ok) {
      toast(result.error ?? 'Nie udało się usunąć zestawu.', 'danger');
      return;
    }
    toast('Zestaw usunięty.', 'success');
  };

  return (
    <div className="mb-4 rounded-lg border border-edge bg-raised p-3">
      {dialog}

      <div className="flex flex-wrap items-end gap-2">
        <span className="eter-label mr-auto">Zestawy — preset całej apki</span>

        {bundles.length > 0 && mayApply && (
          <Select
            ariaLabel="Wczytaj zestaw"
            className="w-56"
            value=""
            options={[
              { value: '', label: 'Wczytaj zestaw…' },
              ...bundles.map((b) => ({ value: b.id, label: b.name })),
            ]}
            onChange={(id) => {
              const bundle = bundles.find((b) => b.id === id);
              if (bundle) void load(bundle);
            }}
          />
        )}

        {bundles.length > 0 && !mayApply && (
          <span className="text-xs text-ink-dim">
            Zapisane: {bundles.map((b) => b.name).join(', ')}. Wczytuje admin.
          </span>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setParts({});
            setOpen((v) => !v);
          }}
          disabled={sectionsWithPresets.length === 0}
        >
          {open ? 'Anuluj' : 'Złóż zestaw'}
        </Button>
      </div>

      {sectionsWithPresets.length === 0 && (
        <p className="mt-2 text-xs text-ink-dim">
          Zapisz najpierw choć jeden preset w którejś sekcji — zestaw tylko do nich wskazuje.
        </p>
      )}

      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            {sectionsWithPresets.map((section) => (
              <Select
                key={section}
                ariaLabel={`Preset sekcji ${SECTION_LABELS[section]} w zestawie`}
                className="w-52"
                value={parts[section] ?? NONE}
                options={[
                  { value: NONE, label: `${SECTION_LABELS[section]}: bez zmian` },
                  ...presets
                    .filter((p) => p.section === section)
                    .map((p) => ({ value: p.id, label: `${SECTION_LABELS[section]}: ${p.name}` })),
                ]}
                onChange={(value) =>
                  setParts((prev) => {
                    const next = { ...prev };
                    if (value === NONE) delete next[section];
                    else next[section] = value;
                    return next;
                  })
                }
              />
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <TextField
              label="Nazwa zestawu"
              className="w-64"
              value={name}
              maxLength={60}
              placeholder="np. Wersja świąteczna"
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              size="sm"
              variant="primary"
              onClick={() => void save()}
              disabled={Object.keys(parts).length === 0}
            >
              Zapisz
            </Button>
          </div>
        </div>
      )}

      {bundles.length > 0 && mayApply && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {bundles.map((bundle) => (
            <li
              key={bundle.id}
              className="flex items-center gap-1 rounded border border-edge bg-surface px-2 py-1 text-xs"
              title={(Object.keys(bundle.parts) as PresetSection[])
                .map((s) => SECTION_LABELS[s])
                .join(', ')}
            >
              <span className="font-mono">{bundle.name}</span>
              <span className="text-ink-dim">· {bundle.author}</span>
              {mayDelete && (
                <button
                  type="button"
                  aria-label={`Usuń zestaw ${bundle.name}`}
                  onClick={() => void remove(bundle)}
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
