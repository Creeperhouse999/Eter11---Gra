import { UI_TEXT_FIELDS, type UiText } from '../data/uiText';

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

      <div className="mt-4 space-y-3">
        {UI_TEXT_FIELDS.map((field) => (
          <label
            key={field.key}
            className="block rounded-lg border border-edge bg-surface p-3"
          >
            <span className="text-sm font-semibold">{field.label}</span>
            <span className="ml-2 font-mono text-[10px] text-ink-dim">{field.where}</span>
            {field.multiline ? (
              <textarea
                value={text[field.key]}
                onChange={(e) => onChange({ ...text, [field.key]: e.target.value })}
                rows={3}
                className="mt-1.5 w-full rounded border border-edge bg-bg px-2 py-1.5 text-sm text-ink"
              />
            ) : (
              <input
                value={text[field.key]}
                onChange={(e) => onChange({ ...text, [field.key]: e.target.value })}
                className="mt-1.5 w-full rounded border border-edge bg-bg px-2 py-1.5 text-sm text-ink"
              />
            )}
          </label>
        ))}
      </div>
    </section>
  );
}
