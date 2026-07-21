import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../icons/Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  /** Ikona po prawej stronie etykiety. */
  iconEnd?: IconName;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-bg font-bold hover:brightness-110',
  secondary: 'border border-edge hover:border-ink-dim',
  ghost: 'text-ink-dim hover:text-ink hover:bg-raised',
  danger: 'border border-danger text-danger hover:bg-danger hover:text-bg',
};

/**
 * Rozmiary przycisków.
 *
 * `min-h-11` to 44 px — najmniejszy cel dotyku, w który ośmiolatek trafia
 * palcem bez pudłowania. Sam padding dawał przy `sm` 32 px, przez co
 * pojedyncze ekrany dokładały `min-h-11` u siebie; lepiej mieć to w jednym
 * miejscu niż powtarzać przy każdym użyciu.
 */
const SIZES: Record<Size, string> = {
  sm: 'min-h-11 px-2.5 py-1.5 text-xs gap-1.5',
  md: 'min-h-11 px-4 py-2 text-sm gap-2',
  lg: 'min-h-12 px-6 py-3 text-base gap-2',
};

const ICON_SIZES: Record<Size, number> = { sm: 13, md: 15, lg: 18 };

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconEnd,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center rounded-lg font-display transition',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100',
        VARIANTS[variant],
        SIZES[size],
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {icon && <Icon name={icon} size={ICON_SIZES[size]} />}
      {children}
      {iconEnd && <Icon name={iconEnd} size={ICON_SIZES[size]} />}
    </button>
  );
}
