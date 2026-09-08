import { useCallback, useLayoutEffect, useRef } from 'react';
import type { ChangeEvent, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Icon } from '../icons/Icon';
import { useDictation } from './useDictation';

interface CommonProps {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

/** Dopisuje wypowiedziany tekst do tego, co już jest w polu. */
function dopisz(obecny: string, transcript: string): string {
  if (!obecny) return transcript;
  return /\s$/.test(obecny) ? `${obecny}${transcript}` : `${obecny} ${transcript}`;
}

/**
 * Przycisk dyktowania — wspólny dla `TextField` i `TextArea`.
 *
 * Adam: „wprowadź opcję audio dyktowania tekstu — abym nie musiał pisać, ale
 * mówię, a ty spisujesz". Niewidoczny, gdy przeglądarka nie ma Web Speech
 * API (Firefox, starsze Safari) — lepiej brak przycisku niż martwy klik.
 */
function DictationButton({
  onText,
  label,
  align = 'center',
}: {
  onText: (transcript: string) => void;
  label?: string;
  /** `center` dla jednolinijkowego pola, `top` dla rosnącego pola wielolinijkowego. */
  align?: 'center' | 'top';
}) {
  const { supported, listening, toggle } = useDictation(onText);
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? 'Zatrzymaj dyktowanie' : `Dyktuj${label ? ` — ${label}` : ''}`}
      aria-pressed={listening}
      className={[
        'absolute right-2 rounded-full p-1 transition',
        align === 'center' ? 'top-1/2 -translate-y-1/2' : 'top-2',
        listening ? 'animate-pulse text-danger' : 'text-ink-dim hover:text-ink',
      ].join(' ')}
    >
      <Icon name="mic" size={16} />
    </button>
  );
}

type TextFieldProps = CommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>;

const base =
  'w-full rounded-lg border bg-bg px-3 py-2 text-sm text-ink transition placeholder:text-ink-dim/80 ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Pole tekstowe z etykietą, podpowiedzią i komunikatem błędu.
 *
 * Etykieta jest powiązana z polem przez `aria-label` — samo zagnieżdżenie
 * w `<label>` nie wystarcza, gdy tekst siedzi w `<span>`, a czytnik ekranu
 * musi mieć czym nazwać pole.
 */
export function TextField({ label, hint, error, className, ...rest }: TextFieldProps) {
  // Dyktowanie tylko na zwykłym tekście. Hasło nie ma się dać wypowiedzieć —
  // to samo w sobie zaprzecza sensowi pola — a e-mail i liczba nie zyskują
  // nic na rozpoznawaniu mowy, za to komplikują pole, którego nikt nie dyktuje.
  const dyktowalne = !rest.type || rest.type === 'text';

  const dyktuj = (transcript: string) => {
    const obecny = typeof rest.value === 'string' ? rest.value : '';
    rest.onChange?.({
      target: { value: dopisz(obecny, transcript) },
    } as ChangeEvent<HTMLInputElement>);
  };

  return (
    <label className={`block ${className ?? ''}`}>
      {label && <span className="block text-sm text-ink-dim">{label}</span>}
      <div className="relative">
        <input
          aria-label={label}
          {...rest}
          aria-invalid={error ? true : undefined}
          className={[
            base,
            dyktowalne ? 'pr-8' : '',
            label ? 'mt-1' : '',
            error ? 'border-danger' : 'border-edge focus:border-accent',
          ].join(' ')}
        />
        {dyktowalne && !rest.disabled && <DictationButton onText={dyktuj} label={label} />}
      </div>
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

/**
 * Pole wielolinijkowe rosnące razem z treścią.
 *
 * Uchwyt zmiany rozmiaru w rogu jest natywnym elementem przeglądarki:
 * wygląda obco przy resztą kontrolek, a przeciągnięty w bok rozjeżdża układ
 * kolumny. Rośnięcie samoczynne rozwiązuje to, co uchwyt miał rozwiązywać —
 * długi opis nie utyka w trzech linijkach i nikt nic nie musi ciągnąć.
 */
export function TextArea({ label, hint, error, className, rows = 3, ...rest }: TextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  /**
   * Wysokość liczona od zera: bez wyzerowania `scrollHeight` nigdy nie zmaleje,
   * więc pole rosłoby przy kasowaniu tekstu zamiast się kurczyć.
   */
  const fit = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  // Dopasowanie przed pierwszym malowaniem — treść wczytana z bazy ma się
  // pokazać w pełnej wysokości, bez przeskoku po renderze.
  useLayoutEffect(fit, [fit, rest.value]);

  const dyktuj = (transcript: string) => {
    const obecny = typeof rest.value === 'string' ? rest.value : '';
    rest.onChange?.({
      target: { value: dopisz(obecny, transcript) },
    } as ChangeEvent<HTMLTextAreaElement>);
  };

  return (
    <label className={`block ${className ?? ''}`}>
      {label && <span className="block text-sm text-ink-dim">{label}</span>}
      <div className="relative">
        <textarea
          ref={ref}
          aria-label={label}
          {...rest}
          onInput={(event) => {
            fit();
            rest.onInput?.(event);
          }}
          rows={rows}
          aria-invalid={error ? true : undefined}
          className={[
            base,
            'pr-8',
            // `overflow-hidden` usuwa pasek przewijania, który przy własnym
            // dopasowaniu wysokości i tak nie ma czego przewijać.
            'resize-none overflow-hidden',
            label ? 'mt-1' : '',
            error ? 'border-danger' : 'border-edge focus:border-accent',
          ].join(' ')}
        />
        {!rest.disabled && <DictationButton onText={dyktuj} label={label} align="top" />}
      </div>
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
      {label && <span className="block text-sm text-ink-dim">{label}</span>}
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
