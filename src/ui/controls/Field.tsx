import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface CommonProps {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

type TextFieldProps = CommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>;

const base =
  'w-full rounded-lg border bg-bg px-3 py-2 text-sm text-ink transition placeholder:text-ink-dim/50 ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Pole tekstowe z etykietą, podpowiedzią i komunikatem błędu.
 *
 * Etykieta jest powiązana z polem przez `aria-label` — samo zagnieżdżenie
 * w `<label>` nie wystarcza, gdy tekst siedzi w `<span>`, a czytnik ekranu
 * musi mieć czym nazwać pole.
 */
export function TextField({ label, hint, error, className, ...rest }: TextFieldProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      {label && <span className="text-sm text-ink-dim">{label}</span>}
      <input
        aria-label={label}
        {...rest}
        aria-invalid={error ? true : undefined}
        className={[
          base,
          label ? 'mt-1' : '',
          error ? 'border-danger' : 'border-edge focus:border-accent',
        ].join(' ')}
      />
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-dim">{hint}</span>
      )}
    </label>
  );
}

type TextAreaProps = CommonProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>;

export function TextArea({ label, hint, error, className, rows = 3, ...rest }: TextAreaProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      {label && <span className="text-sm text-ink-dim">{label}</span>}
      <textarea
        aria-label={label}
        {...rest}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={[
          base,
          'resize-y',
          label ? 'mt-1' : '',
          error ? 'border-danger' : 'border-edge focus:border-accent',
        ].join(' ')}
      />
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-dim">{hint}</span>
      )}
    </label>
  );
}

interface NumberFieldProps extends CommonProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Pole liczbowe ze strzałkami.
 *
 * Natywne strzałki `<input type=number>` są w każdej przeglądarce inne
 * i bardzo małe. Własne przyciski są większe — panel bywa obsługiwany
 * na tablecie.
 */
export function NumberField({
  label,
  hint,
  error,
  value,
  onChange,
  min = 0,
  max = 999,
  disabled,
  ariaLabel,
  className,
}: NumberFieldProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div className={className}>
      {label && <span className="text-sm text-ink-dim">{label}</span>}
      <div className="mt-1 flex items-stretch overflow-hidden rounded-lg border border-edge bg-bg focus-within:border-accent">
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - 1))}
          aria-label="Zmniejsz"
          className="px-3 font-mono text-ink-dim transition hover:bg-raised hover:text-ink disabled:opacity-30"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="w-full border-x border-edge bg-transparent px-2 py-2 text-center font-mono text-sm text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + 1))}
          aria-label="Zwiększ"
          className="px-3 font-mono text-ink-dim transition hover:bg-raised hover:text-ink disabled:opacity-30"
        >
          +
        </button>
      </div>
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-dim">{hint}</span>
      )}
    </div>
  );
}
