import { useThemeMode } from './useThemeMode';
import { Icon } from './icons/Icon';
import { Tooltip } from './controls/Tooltip';

/**
 * Przełącznik jasny/ciemny w rogu ekranu.
 *
 * Stały punkt na górze, widoczny w grze i w panelu. Sam trzyma i stosuje tryb
 * (useThemeMode), więc wystarczy go raz osadzić. Ikona pokazuje tryb, w który
 * kliknięcie przełączy — słońce, gdy jest ciemno; księżyc, gdy jasno.
 */
interface ThemeToggleProps {
  /**
   * `floating` — pływający przycisk w rogu ekranu (gra).
   * `inline` — zwykły przycisk do wstawienia w pasek (panel, obok Zapisz).
   */
  variant?: 'floating' | 'inline';
}

export function ThemeToggle({ variant = 'floating' }: ThemeToggleProps) {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === 'light';
  const label = isLight ? 'Włącz tryb ciemny' : 'Włącz tryb jasny';

  const button = (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-edge bg-surface/90 text-ink-dim shadow-lg backdrop-blur transition hover:border-accent hover:text-accent"
      >
        {/* Ikona pokazuje AKTUALNY tryb: słońce gdy jasno, księżyc gdy ciemno. */}
        <Icon name={isLight ? 'sun' : 'moon'} size={18} />
      </button>
    </Tooltip>
  );

  if (variant === 'inline') return button;

  return (
    <div className="fixed right-3 top-3" style={{ zIndex: 'var(--z-sticky)' }}>
      {button}
    </div>
  );
}
