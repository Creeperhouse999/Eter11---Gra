import { Icon } from './icons/Icon';
import { Tooltip } from './controls/Tooltip';
import { useGameSkin, SKIN_LABELS } from './useGameSkin';

/**
 * Przełącznik wyglądu gry: Klasyczny ↔ Kolorowy.
 *
 * Adam poprosił o dwa niezależne przełączniki dla gracza: „1. Ciemny vs jasny,
 * 2. Klasyczny vs Kolorowy". Ten odpowiada za drugi wymiar — nie za jasność
 * tła, tylko za cały język wizualny: świecące kafle zamiast spokojnych paneli.
 *
 * Stoi obok przełącznika jasności i wygląda tak samo, bo robią rzeczy tego
 * samego rzędu. Ikona pokazuje, co się WŁĄCZY po kliknięciu, a podpowiedź
 * mówi to słowami — sama ikona nie wystarczy, gdy wybory są dwa.
 */
export function SkinToggle({ variant = 'floating' }: { variant?: 'floating' | 'inline' }) {
  const [skin, setSkin] = useGameSkin();
  const kolorowy = skin === 'colorful';
  const label = kolorowy
    ? `Wygląd: ${SKIN_LABELS.classic}`
    : `Wygląd: ${SKIN_LABELS.colorful}`;

  const button = (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={() => setSkin(kolorowy ? 'classic' : 'colorful')}
        aria-label={label}
        aria-pressed={kolorowy}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-edge bg-surface/90 text-ink-dim shadow-lg backdrop-blur transition hover:border-accent hover:text-accent"
      >
        <Icon name={kolorowy ? 'brush' : 'palette'} size={18} />
      </button>
    </Tooltip>
  );

  if (variant === 'inline') return button;

  // Pod przełącznikiem jasności, nie obok — na telefonie dwa przyciski w rzędzie
  // zajmowały róg ekranu i zasłaniały kartę.
  return (
    <div className="fixed right-3 top-14" style={{ zIndex: 'var(--z-sticky)' }}>
      {button}
    </div>
  );
}
