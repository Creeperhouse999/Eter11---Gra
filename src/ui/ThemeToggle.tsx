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
export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  const goingLight = mode === 'dark';

  return (
    <div className="fixed right-3 top-3" style={{ zIndex: 'var(--z-sticky)' }}>
      <Tooltip label={goingLight ? 'Tryb jasny' : 'Tryb ciemny'}>
        <button
          type="button"
          onClick={toggle}
          aria-label={goingLight ? 'Włącz tryb jasny' : 'Włącz tryb ciemny'}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-edge bg-surface/90 text-ink-dim shadow-lg backdrop-blur transition hover:border-accent hover:text-accent"
        >
          <Icon name={goingLight ? 'sunrise' : 'crystal'} size={18} />
        </button>
      </Tooltip>
    </div>
  );
}
