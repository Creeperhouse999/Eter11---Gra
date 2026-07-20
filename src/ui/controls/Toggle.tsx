import type { ReactNode } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  hint?: string;
  disabled?: boolean;
}

/**
 * Przełącznik — dla ustawień działających natychmiast.
 *
 * Odróżnia się od pola wyboru celowo: checkbox oznacza „zaznacz i zapisz",
 * przełącznik oznacza „włącz teraz".
 */
export function Toggle({ checked, onChange, children, hint, disabled }: ToggleProps) {
  return (
    <label
      className={[
        'group flex items-center justify-between gap-4',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ].join(' ')}
    >
      <span className="min-w-0">
        <span className="block text-sm">{children}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-dim">{hint}</span>}
      </span>

      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={[
          'relative h-6 w-11 shrink-0 rounded-full border-2 transition-colors',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg',
          checked ? 'border-accent bg-accent' : 'border-edge bg-bg',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full transition-transform',
            checked ? 'translate-x-[1.375rem] bg-bg' : 'translate-x-0.5 bg-ink-dim',
          ].join(' ')}
        />
      </span>
    </label>
  );
}
