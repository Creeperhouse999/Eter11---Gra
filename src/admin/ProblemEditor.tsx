import { useState } from 'react';
import { FAMILY_IDS, FAMILY_COLORS, FAMILY_LABELS } from '../data/families';
import type { Problem, ProblemSlot, ProblemType, SlotKey } from '../engine/types';
import {
  problemTypeColorVar,
  problemTypeLabel,
  slotIcon,
  slotLabel,
  SLOT_ORDER,
} from '../ui/components/categoryStyles';
import { Button } from '../ui/controls/Button';
import { Checkbox } from '../ui/controls/Checkbox';
import { TextArea, TextField } from '../ui/controls/Field';
import { Select } from '../ui/controls/Select';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { Icon, type IconName } from '../ui/icons/Icon';
import { IconPicker } from './IconPicker';
import { newId } from './newId';

interface ProblemEditorProps {
  problems: Problem[];
  onChange: (problems: Problem[]) => void;
  /**
   * Id rozwiniętego problemu — z adresu (`/admin/problems?open=<id>`). Steruje
   * tym, który problem jest otwarty, żeby dało się zalinkować wprost do niego.
   */
  openId?: string | null;
  /** Zgłasza zmianę rozwinięcia w górę, żeby trafiła do adresu. */
  onOpenChange?: (id: string | null) => void;
}

const PROBLEM_TYPES: ProblemType[] = ['action', 'thinking', 'cooperation', 'selfchange'];


function emptyProblem(): Problem {
  return {
    id: newId('prob'),
    name: 'Nowy problem',
    story: '',
    antagonist: '',
    consequence: '',
    goal: '',
    type: 'action',
    icon: 'earth',
    draft: true,
    slots: SLOT_ORDER.map((key) => ({ key, family: 'red' as const, hint: '' })),
  };
}

const FAMILY_OPTIONS = FAMILY_IDS.map((id) => ({
  value: id,
  label: FAMILY_LABELS[id],
  color: FAMILY_COLORS[id],
}));

const TYPE_OPTIONS = PROBLEM_TYPES.map((type) => ({
  value: type,
  label: problemTypeLabel(type),
  color: problemTypeColorVar(type),
}));

/** Edytor kart problemów: treść, typ, ścianki z wymaganą rodziną i podpowiedzią. */
export function ProblemEditor({ problems, onChange, openId: openIdProp, onOpenChange }: ProblemEditorProps) {
  // Rozwinięty problem sterowany adresem, gdy podano `openId`; inaczej własny
  // stan. Dzięki temu link `?open=<id>` otwiera właściwy problem, a bez adresu
  // (np. w teście jednostkowym) edytor działa jak dawniej.
  const [localOpenId, setLocalOpenId] = useState<string | null>(null);
  const openId = openIdProp !== undefined ? openIdProp : localOpenId;
  const setOpenId = (next: string | null) => {
    setLocalOpenId(next);
    onOpenChange?.(next);
  };
  const { confirm, dialog } = useConfirm();
  const toast = useToast();

  const update = (id: string, patch: Partial<Problem>) => {
    onChange(problems.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const updateSlot = (problemId: string, slotKey: SlotKey, patch: Partial<ProblemSlot>) => {
    onChange(
      problems.map((p) =>
        p.id === problemId
          ? { ...p, slots: p.slots.map((s) => (s.key === slotKey ? { ...s, ...patch } : s)) }
          : p,
      ),
    );
  };

  const remove = async (id: string) => {
    const problem = problems.find((p) => p.id === id);
    const confirmed = await confirm({
      title: 'Usunąć problem?',
      message: `„${problem?.name}" zniknie z talii. Zmiana wejdzie w życie po zapisaniu, ale nie da się jej cofnąć bez ponownego wczytania danych.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (confirmed) {
      onChange(problems.filter((p) => p.id !== id));
      toast(`Usunięto problem „${problem?.name}".`);
    }
  };


  return (
    <section>
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Problemy ({problems.length})</h2>
        <Button
          icon="plus"
          onClick={() => {
            // Na górze listy i od razu rozwinięty — inaczej trzeba by go
            // szukać na końcu i klikać, żeby zacząć wypełniać.
            const created = emptyProblem();
            onChange([created, ...problems]);
            setOpenId(created.id);
            toast('Dodano problem na górze listy.');
          }}
        >
          Dodaj problem
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {problems.map((problem) => {
          const open = openId === problem.id;

          return (
            <li key={problem.id} className="eter-rise rounded-xl border border-edge bg-surface">
              <div className="flex items-center gap-3 p-3">
                <span className="text-ink-dim">
                  <Icon name={problem.icon as IconName} size={24} />
                </span>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : problem.id)}
                  aria-expanded={open}
                  className="flex-1 text-left"
                >
                  <span className="font-display font-bold">{problem.name}</span>
                  <span className="ml-2 text-xs text-ink-dim">
                    {problemTypeLabel(problem.type)}
                  </span>
                  {problem.draft && (
                    <span className="ml-2 rounded bg-accent-2 px-2 py-0.5 font-mono text-[10px] font-bold text-bg">
                      do weryfikacji
                    </span>
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="trash"
                  onClick={() => remove(problem.id)}
                  className="text-danger"
                >
                  Usuń
                </Button>
              </div>

              {open && (
                <div className="eter-fade-in space-y-4 border-t border-edge p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
                    <TextField
                      label="Nazwa"
                      value={problem.name}
                      onChange={(e) => update(problem.id, { name: e.target.value })}
                    />
                    <IconPicker
                      value={problem.icon}
                      onChange={(icon) => update(problem.id, { icon })}
                    />
                  </div>

                  <TextArea
                    label="Historia"
                    value={problem.story}
                    onChange={(e) => update(problem.id, { story: e.target.value })}
                  />

                  <div className="grid gap-3 sm:grid-cols-3">
                    <TextField
                      label="Przeciwnik"
                      value={problem.antagonist}
                      onChange={(e) => update(problem.id, { antagonist: e.target.value })}
                    />
                    <TextField
                      label="Cel misji"
                      value={problem.goal}
                      onChange={(e) => update(problem.id, { goal: e.target.value })}
                    />
                    <TextField
                      label="Jeśli się nie uda"
                      value={problem.consequence}
                      onChange={(e) => update(problem.id, { consequence: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-wrap items-end gap-5">
                    <Select
                      label="Typ"
                      className="w-full sm:w-56"
                      value={problem.type}
                      options={TYPE_OPTIONS}
                      onChange={(type) => update(problem.id, { type })}
                    />

                    <Checkbox
                      checked={Boolean(problem.draft)}
                      onChange={(draft) => update(problem.id, { draft })}
                    >
                      Wymaga weryfikacji merytorycznej
                    </Checkbox>
                  </div>

                  <div className="space-y-3">
                    <h3 className="eter-label">Pięć ścianek</h3>
                    {problem.slots.map((slot) => (
                      <div key={slot.key} className="rounded-lg border border-edge p-3">
                        <span className="flex items-center gap-2 text-sm font-bold">
                          <Icon name={slotIcon(slot.key)} size={18} />
                          {slotLabel(slot.key)}
                        </span>

                        <Select
                          label="Wymagana rodzina"
                          className="mt-2 w-full sm:w-56"
                          value={slot.family}
                          options={FAMILY_OPTIONS}
                          onChange={(family) => updateSlot(problem.id, slot.key, { family })}
                        />

                        <TextField
                          label="Podpowiedź dla graczy"
                          className="mt-2"
                          value={slot.hint}
                          onChange={(e) =>
                            updateSlot(problem.id, slot.key, { hint: e.target.value })
                          }
                        />

                      </div>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
