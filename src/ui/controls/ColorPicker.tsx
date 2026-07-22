import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icons/Icon';
import { Tooltip } from './Tooltip';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  /** Kolory do szybkiego wyboru — paleta projektu. */
  presets?: string[];
}

const PANEL_WIDTH = 232;
const PANEL_HEIGHT = 300;

const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

/** Konwersja HSV → HEX. Suwaki operują na HSV, bo tak myśli się o kolorze. */
function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const value = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  if (!isHex(hex)) return { h: 0, s: 0, v: 0 };

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

/**
 * Wybór koloru w stylu ETER11.
 *
 * Natywny `<input type="color">` otwiera okno systemowe — inne na Windowsie,
 * macOS i Androidzie, i zupełnie obce wobec reszty panelu. Tutaj mamy własne
 * pole nasycenia, suwak barwy i paletę projektu, wszystko w jednym języku
 * wizualnym.
 *
 * Panel renderuje się w portalu, bo edytory mają przewijane kontenery, które
 * przycinałyby go w połowie.
 */
export function ColorPicker({ value, onChange, label, presets = [] }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [draft, setDraft] = useState(value);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const hsv = hexToHsv(isHex(draft) ? draft : value);

  useEffect(() => setDraft(value), [value]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;

    setPosition({
      top: spaceBelow < PANEL_HEIGHT ? rect.top - PANEL_HEIGHT - 4 : rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const apply = (hex: string) => {
    setDraft(hex);
    if (isHex(hex)) onChange(hex);
  };

  /** Kliknięcie i przeciąganie po polu nasycenia. */
  const pickFromArea = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = areaRef.current?.getBoundingClientRect();
    if (!box) return;

    const s = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const v = 1 - Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
    apply(hsvToHex(hsv.h, s, v));
  };

  return (
    <div>
      {label && <span className="text-sm text-ink-dim">{label}</span>}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label ? `${label}: ${value}` : `Kolor: ${value}`}
        className={[
          'mt-1 flex w-full items-center gap-2 rounded-lg border bg-bg px-2 py-1.5 transition',
          open ? 'border-accent' : 'border-edge hover:border-ink-dim',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className="h-6 w-6 shrink-0 rounded border border-edge"
          style={{ background: isHex(value) ? value : 'transparent' }}
        />
        <span className="font-mono text-xs text-ink-dim">{value}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="eter-pop fixed w-58 rounded-lg border border-edge bg-surface p-3 shadow-2xl"
            style={{ top: position.top, left: position.left, width: PANEL_WIDTH, zIndex: 'var(--z-dropdown)' }}
          >
            {/* Pole nasycenia i jasności */}
            <div
              ref={areaRef}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                pickFromArea(event);
              }}
              onPointerMove={(event) => {
                if (event.buttons === 1) pickFromArea(event);
              }}
              className="relative h-32 w-full cursor-crosshair rounded"
              style={{
                background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(hsv.h, 1, 1)})`,
                touchAction: 'none',
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
              />
            </div>

            {/* Suwak barwy */}
            <input
              type="range"
              min={0}
              max={359}
              value={Math.round(hsv.h)}
              aria-label="Barwa"
              onChange={(e) => apply(hsvToHex(Number(e.target.value), hsv.s || 1, hsv.v || 1))}
              className="mt-2 h-3 w-full cursor-pointer appearance-none rounded-full"
              style={{
                background:
                  'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
              }}
            />

            <input
              value={draft}
              onChange={(e) => apply(e.target.value)}
              aria-label="Kod koloru"
              maxLength={7}
              className={[
                'mt-2 w-full rounded border bg-bg px-2 py-1 font-mono text-xs',
                isHex(draft) ? 'border-edge' : 'border-danger',
              ].join(' ')}
            />

            {presets.length > 0 && (
              <>
                <span className="eter-label mt-3 block">Paleta gry</span>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {presets.map((preset) => (
                    // Custom podpowiedź (hex) zamiast natywnego `title`.
                    <Tooltip key={preset} label={preset}>
                    <button
                      type="button"
                      aria-label={`Ustaw ${preset}`}
                      onClick={() => apply(preset)}
                      className={[
                        'h-6 w-6 rounded border transition',
                        preset.toLowerCase() === value.toLowerCase()
                          ? 'border-accent'
                          : 'border-edge hover:border-ink-dim',
                      ].join(' ')}
                      style={{ background: preset }}
                    />
                    </Tooltip>
                  ))}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-edge py-1.5 text-xs transition hover:border-ink-dim"
            >
              <Icon name="tick" size={13} />
              Gotowe
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
