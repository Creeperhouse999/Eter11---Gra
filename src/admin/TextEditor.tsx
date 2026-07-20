import { UI_TEXT_FIELDS, type UiText } from '../data/uiText';
import { TextArea, TextField } from '../ui/controls/Field';

interface TextEditorProps {
  text: UiText;
  onChange: (text: UiText) => void;
}

/** Edytor tekstów interfejsu — wszystko, co gracz czyta poza kartami. */
export function TextEditor({ text, onChange }: TextEditorProps) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold">Teksty w grze</h2>
      <p className="mt-1 text-sm text-ink-dim">
        Nagłówki, przyciski i komunikaty. Zmiany widać po odświeżeniu gry.
      </p>

      <div className="eter-stagger mt-4 space-y-3">
        {UI_TEXT_FIELDS.map((field) => {
          const Control = field.multiline ? TextArea : TextField;
          return (
            <div key={field.key} className="rounded-lg border border-edge bg-surface p-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold">{field.label}</span>
                <span className="font-mono text-[10px] text-ink-dim">{field.where}</span>
              </div>
              <Control
                className="mt-1.5"
                aria-label={field.label}
                value={text[field.key]}
                onChange={(e) => onChange({ ...text, [field.key]: e.target.value })}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
