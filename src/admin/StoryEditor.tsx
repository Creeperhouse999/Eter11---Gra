import { useState } from 'react';
import { DEFAULT_INTRO, type IntroContent, type IntroScene } from '../data/intro';
import { TUTORIAL_STEPS, type TutorialStep } from '../data/tutorial';
import { Button } from '../ui/controls/Button';
import { TextField, TextArea } from '../ui/controls/Field';
import { Icon } from '../ui/icons/Icon';
import { IconPicker } from './IconPicker';

interface StoryEditorProps {
  intro?: IntroContent;
  tutorial?: TutorialStep[];
  onChange: (patch: { intro?: IntroContent; tutorial?: TutorialStep[] }) => void;
}

type Part = 'story' | 'rules' | 'adults' | 'tutorial';

const PARTS: Array<{ id: Part; label: string; hint: string }> = [
  {
    id: 'story',
    label: 'Historia',
    hint: 'Wstęp narracyjny — wciąga w świat gry, zanim padnie słowo o zasadach.',
  },
  {
    id: 'rules',
    label: 'Zasady',
    hint: 'Wstęp techniczny — tłumaczy, jak się gra.',
  },
  {
    id: 'adults',
    label: 'Dla dorosłych',
    hint: 'Dla rodziców i nauczycieli: po co ta gra powstała.',
  },
  {
    id: 'tutorial',
    label: 'Co mówi ETER11',
    hint: 'Kwestie prowadzącego w samouczku, krok po kroku.',
  },
];

/**
 * Edycja wstępu i kwestii ETER11.
 *
 * Te teksty to najdłuższe rzeczy, jakie dziecko czyta w grze, i pisze je
 * zespół merytoryczny — a leżały wyłącznie w kodzie, więc każda poprawka
 * literówki wymagała programisty.
 *
 * Sceny wstępu pokazują się po jednej, więc każda ma nagłówek i treść.
 * Kroki samouczka mają trzy kwestie: co ETER11 mówi przed zadaniem, jak
 * chwali po wykonaniu i co podpowiada, gdy gracz stoi bez ruchu.
 */
export function StoryEditor({ intro, tutorial, onChange }: StoryEditorProps) {
  const [part, setPart] = useState<Part>('story');

  const current: IntroContent = intro ?? DEFAULT_INTRO;
  const steps = tutorial?.length ? tutorial : TUTORIAL_STEPS;

  const setScenes = (key: 'story' | 'rules' | 'adults', scenes: IntroScene[]) => {
    onChange({ intro: { ...current, [key]: scenes } });
  };

  const updateScene = (
    key: 'story' | 'rules' | 'adults',
    index: number,
    patch: Partial<IntroScene>,
  ) => {
    setScenes(
      key,
      current[key].map((scene, i) => (i === index ? { ...scene, ...patch } : scene)),
    );
  };

  const updateStep = (index: number, patch: Partial<TutorialStep>) => {
    onChange({
      tutorial: steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    });
  };

  /**
   * Przesunięcie sceny w kolejności.
   *
   * Sceny pokazują się po jednej, w tej kolejności — dla wstępu
   * narracyjnego kolejność JEST treścią. Bez tego jedyną drogą do zmiany
   * układu byłoby przepisanie wszystkich scen od nowa.
   */
  const moveScene = (key: 'story' | 'rules' | 'adults', from: number, to: number) => {
    if (to < 0 || to >= current[key].length) return;
    const next = [...current[key]];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setScenes(key, next);
  };

  const active = PARTS.find((p) => p.id === part);

  return (
    <section aria-label="Wstęp i samouczek">
      <h2 className="font-display text-lg font-bold">Wstęp i ETER11</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Teksty, które gracz czyta przed grą i w trakcie samouczka.
        Zmiany widać po odświeżeniu gry.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {PARTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPart(item.id)}
            aria-current={part === item.id ? 'page' : undefined}
            className={[
              'rounded-lg border px-3 py-1.5 text-sm transition',
              part === item.id
                ? 'border-accent bg-raised font-semibold text-accent'
                : 'border-edge hover:border-ink-dim',
            ].join(' ')}
          >
            {item.label}
            <span className="ml-1.5 font-mono text-[11px] text-ink-dim">
              {item.id === 'tutorial' ? steps.length : current[item.id].length}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-ink-dim">{active?.hint}</p>

      {part === 'tutorial' ? (
        <div className="eter-stagger mt-4 space-y-3">
          {steps.map((step, index) => (
            <article key={step.id} className="rounded-lg border border-edge bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] text-accent">
                  {index + 1} / {steps.length}
                </span>
                <span className="font-mono text-xs text-ink-dim">{step.id}</span>
              </div>

              <div className="mt-3 space-y-2">
                <TextArea
                  label="Co mówi przed zadaniem"
                  value={step.say}
                  onChange={(e) => updateStep(index, { say: e.target.value })}
                  rows={2}
                />
                <TextArea
                  label="Pochwała po wykonaniu"
                  value={step.praise}
                  onChange={(e) => updateStep(index, { praise: e.target.value })}
                  rows={2}
                />
                <TextArea
                  label="Podpowiedź, gdy gracz stoi"
                  value={step.nudge ?? ''}
                  onChange={(e) =>
                    // Puste pole znaczy „bez podpowiedzi", nie „pusta podpowiedź":
                    // pusty łańcuch pokazałby dziecku pusty dymek.
                    updateStep(index, { nudge: e.target.value.trim() || undefined })
                  }
                  rows={2}
                  hint="Puste = ETER11 milczy, dopóki gracz sam nie ruszy."
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="eter-stagger mt-4 space-y-3">
          {current[part].map((scene, index) => (
            <article key={index} className="rounded-lg border border-edge bg-surface p-3">
              <div className="flex items-start gap-3">
                <div className="w-32 shrink-0">
                  <IconPicker
                    value={scene.icon}
                    onChange={(icon) => updateScene(part, index, { icon })}
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <TextField
                    label={`Scena ${index + 1} — nagłówek`}
                    value={scene.heading}
                    onChange={(e) => updateScene(part, index, { heading: e.target.value })}
                  />
                  <TextArea
                    label="Treść"
                    value={scene.body}
                    onChange={(e) => updateScene(part, index, { body: e.target.value })}
                    rows={4}
                    hint="Pusta linia rozdziela akapity."
                  />
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="chevronDown"
                    aria-label={`Przesuń scenę ${index + 1} w górę`}
                    className="rotate-180"
                    disabled={index === 0}
                    onClick={() => moveScene(part, index, index - 1)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="chevronDown"
                    aria-label={`Przesuń scenę ${index + 1} w dół`}
                    disabled={index === current[part].length - 1}
                    onClick={() => moveScene(part, index, index + 1)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    aria-label={`Usuń scenę ${index + 1}`}
                    className="text-danger"
                    onClick={() =>
                      setScenes(
                        part,
                        current[part].filter((_, i) => i !== index),
                      )
                    }
                  />
                </div>
              </div>
            </article>
          ))}

          <Button
            icon="plus"
            className="w-full"
            onClick={() =>
              setScenes(part, [
                ...current[part],
                { heading: '', body: '', icon: 'spark' },
              ])
            }
          >
            Dodaj scenę
          </Button>

          {current[part].length === 0 && (
            <p className="flex items-center gap-2 rounded-lg border border-edge bg-surface p-3 text-xs text-ink-dim">
              <Icon name="bulb" size={14} />
              Bez scen gra pokaże tekst wbudowany — ta część wstępu nie zniknie.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
