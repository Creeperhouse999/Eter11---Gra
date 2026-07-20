import type { ReactNode } from 'react';
import { Icon, type IconName } from '../icons/Icon';

interface ChipProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  icon?: IconName;
  /** Kolor obramowania po zaznaczeniu. Domyślnie akcent. */
  color?: string;
  disabled?: boolean;
}

/**
 * Znacznik wielokrotnego wyboru — dla list, gdzie zaznaczeń jest wiele
 * i muszą zmieścić się obok siebie (np. karty bonusowe ścianki).
 *
 * Natywny checkbox pozostaje ukryty, ale w drzewie: klawiatura i czytniki
 * ekranu działają bez dodatkowego kodu.
 */
export function Chip({ checked, onChange, children, icon, color, disabled }: ChipProps) {
  const accent = color ?? 'var(--eter-accent)';

  return (
    <label
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
        'focus-within:ring-2 focus-within:ring-accent/40',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked ? '' : 'border-edge text-ink-dim hover:border-ink-dim hover:text-ink',
      ].join(' ')}
      style={checked ? { borderColor: accent, color: accent } : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <Icon name={checked ? 'tick' : (icon ?? 'dot')} size={13} />
      {children}
    </label>
  );
}
