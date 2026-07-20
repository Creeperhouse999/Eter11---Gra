import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  /** Opis pod etykietą. */
  hint?: string;
}

/**
 * Pole wyboru w stylu ETER11.
 *
 * Natywny input pozostaje w drzewie (ukryty), więc klawiatura, czytniki
 * ekranu i etykieta działają bez dodatkowego kodu — rysujemy tylko warstwę
 * wizualną obok niego.
 */
export function Checkbox({ checked, onChange, children, disabled, hint }: CheckboxProps) {
  return (
    <label
      className={[
        'group flex items-start gap-2.5',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ].join(' ')}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={[
          'mt-0.5 flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded border-2 transition',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg',
          checked
            ? 'border-accent bg-accent text-bg'
            : 'border-edge bg-bg group-hover:border-ink-dim',
        ].join(' ')}
      >
        {checked && <Icon name="check" size={13} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm leading-snug">{children}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-dim">{hint}</span>}
      </span>
    </label>
  );
}
