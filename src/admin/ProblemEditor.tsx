import { useState } from 'react';
import type { Card, Problem, ProblemSlot, ProblemType, SlotKey } from '../engine/types';
import { problemTypeLabel, slotIcon, slotLabel } from '../ui/components/categoryStyles';
import { Icon, type IconName } from '../ui/icons/Icon';
import { IconPicker } from './IconPicker';

interface ProblemEditorProps {
  problems: Problem[];
  cards: Card[];
  onChange: (problems: Problem[]) => void;
}

const PROBLEM_TYPES: ProblemType[] = ['action', 'thinking', 'cooperation', 'selfchange'];
const SLOT_KEYS: SlotKey[] = ['psychological', 'digital', 'social', 'mentorTalent'];

function emptyProblem(): Problem {
  return {
    id: `prob-${Date.now()}`,
    name: 'Nowy problem',
    story: '',
    antagonist: '',
    consequence: '',
    goal: '',
    type: 'action',
    icon: 'earth',
    draft: true,
    slots: SLOT_KEYS.map((key) => ({ key, hint: '', bonusCardIds: [] })),
  };
}

const inputClass = 'mt-1 w-full rounded border border-edge bg-bg px-2 py-1.5 text-sm text-ink';

/** Edytor kart problemów: treść, typ, cztery ścianki z podpowiedziami i bonusami. */
export function ProblemEditor({ problems, cards, onChange }: ProblemEditorProps) {
  const [openId, setOpenId] = useState<string | null>(null);

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

  const remove = (id: string) => {
    const problem = problems.find((p) => p.id === id);
    const confirmed = window.confirm(
      `Usunąć problem „${problem?.name}"? Zmiana zniknie z bazy dopiero po zapisaniu, ` +
        'ale nie da się jej cofnąć bez ponownego wczytania danych.',
    );
    if (confirmed) onChange(problems.filter((p) => p.id !== id));
  };

  /** Karty pasujące kategorią do ścianki — tylko one mogą być bonusem. */
  const cardsForSlot = (slotKey: SlotKey) =>
    cards.filter((c) =>
      slotKey === 'mentorTalent'
        ? c.category === 'mentor' || c.category === 'talent'
        : c.category === slotKey,
    );

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Problemy ({problems.length})</h2>
        <button
          type="button"
          onClick={() => onChange([...problems, emptyProblem()])}
          className="rounded-lg border border-accent px-3 py-1.5 text-sm text-accent"
        >
          Dodaj problem
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {problems.map((problem) => {
          const open = openId === problem.id;

          return (
            <li key={problem.id} className="rounded-xl border border-edge bg-surface">
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
                <button
                  type="button"
                  onClick={() => remove(problem.id)}
                  className="text-xs text-danger underline underline-offset-2"
                >
                  Usuń
                </button>
              </div>

              {open && (
                <div className="space-y-4 border-t border-edge p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
                    <label className="block text-sm">
                      <span className="text-ink-dim">Nazwa</span>
                      <input
                        value={problem.name}
                        onChange={(e) => update(problem.id, { name: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <IconPicker
                      value={problem.icon}
                      onChange={(icon) => update(problem.id, { icon })}
                    />
                  </div>

                  <label className="block text-sm">
                    <span className="text-ink-dim">Historia</span>
                    <textarea
                      value={problem.story}
                      onChange={(e) => update(problem.id, { story: e.target.value })}
                      rows={3}
                      className={inputClass}
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block text-sm">
                      <span className="text-ink-dim">Przeciwnik</span>
                      <input
                        value={problem.antagonist}
                        onChange={(e) => update(problem.id, { antagonist: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-dim">Cel misji</span>
                      <input
                        value={problem.goal}
                        onChange={(e) => update(problem.id, { goal: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-dim">Jeśli się nie uda</span>
                      <input
                        value={problem.consequence}
                        onChange={(e) => update(problem.id, { consequence: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-5">
                    <label className="text-sm">
                      <span className="text-ink-dim">Typ</span>
                      <select
                        value={problem.type}
                        onChange={(e) =>
                          update(problem.id, { type: e.target.value as ProblemType })
                        }
                        className="ml-2 rounded border border-edge bg-bg px-2 py-1 text-sm"
                      >
                        {PROBLEM_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {problemTypeLabel(type)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(problem.draft)}
                        onChange={(e) => update(problem.id, { draft: e.target.checked })}
                      />
                      <span className="text-ink-dim">Wymaga weryfikacji merytorycznej</span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h3 className="eter-label">Cztery ścianki</h3>
                    {problem.slots.map((slot) => (
                      <div key={slot.key} className="rounded-lg border border-edge p-3">
                        <span className="flex items-center gap-2 text-sm font-bold">
                          <Icon name={slotIcon(slot.key)} size={18} />
                          {slotLabel(slot.key)}
                        </span>

                        <label className="mt-2 block text-sm">
                          <span className="text-ink-dim">Podpowiedź dla graczy</span>
                          <input
                            value={slot.hint}
                            onChange={(e) =>
                              updateSlot(problem.id, slot.key, { hint: e.target.value })
                            }
                            className={inputClass}
                          />
                        </label>

                        <fieldset className="mt-3">
                          <legend className="text-xs text-ink-dim">
                            Karty bonusowe — zagranie ich daje dodatkową kartę doświadczenia
                          </legend>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {cardsForSlot(slot.key).map((card) => {
                              const checked = slot.bonusCardIds.includes(card.id);
                              return (
                                <label
                                  key={card.id}
                                  className={[
                                    'cursor-pointer rounded border px-2 py-1 text-xs transition',
                                    checked
                                      ? 'border-accent text-accent'
                                      : 'border-edge text-ink-dim hover:border-ink-dim',
                                  ].join(' ')}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      updateSlot(problem.id, slot.key, {
                                        bonusCardIds: checked
                                          ? slot.bonusCardIds.filter((id) => id !== card.id)
                                          : [...slot.bonusCardIds, card.id],
                                      })
                                    }
                                    className="sr-only"
                                  />
                                  <span className="inline-flex items-center gap-1.5">
                                    <Icon name={card.icon as IconName} size={14} />
                                    {card.name}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
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
