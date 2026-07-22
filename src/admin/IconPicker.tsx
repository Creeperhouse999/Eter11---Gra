import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TextField } from '../ui/controls/Field';
import { Tooltip } from '../ui/controls/Tooltip';
import { ICON_NAMES, CUSTOM_ICON_PREFIX, Icon } from '../ui/icons/Icon';
import { getCustomIcons } from '../ui/components/categoryStyles';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  label?: string;
}

/**
 * Wybór ikony z zestawu ETER11.
 *
 * Lista otwiera się w portalu na końcu dokumentu, a nie obok przycisku:
 * edytory kart mają przewijane kontenery, które przycinałyby ją w połowie.
 * Pozycja liczona jest z prostokąta przycisku i korygowana, gdy panel
 * wychodziłby poza ekran.
 */
export function IconPicker({ value, onChange, label = 'Ikona' }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Własne ikony jako pierwsze — to ich zespół szuka, gdy właśnie je wgrał.
  // Nazwa własnej ikony to `url:…`; do filtrowania i podpowiedzi bierzemy
  // etykietę, nie adres.
  const custom = getCustomIcons();
  const customNames = custom.map((icon) => `${CUSTOM_ICON_PREFIX}${icon.url}`);
  const labelOf = (name: string) =>
    custom.find((icon) => `${CUSTOM_ICON_PREFIX}${icon.url}` === name)?.name ?? name;

  const all = [...customNames, ...ICON_NAMES];
  const matches = query
    ? all.filter((name) => labelOf(name).toLowerCase().includes(query.toLowerCase()))
    : all;

  const PANEL_WIDTH = 288;
  const PANEL_HEIGHT = 340;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;

    setPosition({
      // Panel nad przyciskiem, gdy pod nim brakuje miejsca.
      top: spaceBelow < PANEL_HEIGHT ? rect.top - PANEL_HEIGHT - 4 : rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8),
    });
  }, [open]);

  // Kliknięcie poza panelem zamyka go — bez tego zostawał otwarty
  // i zasłaniał pola pod spodem.
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

    /**
     * Przewinięcie STRONY rozjeżdża panel z przyciskiem, więc go zamykamy.
     *
     * Ale nasłuch działa w fazie przechwytywania, więc łapie też przewijanie
     * siatki ikon w środku panelu — a tam ikon jest kilkadziesiąt i lista ma
     * własny pasek. Zamykanie na tym zdarzeniu sprawiało, że okno znikało
     * przy każdej próbie dojechania do dolnych ikon.
     */
    const onScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (target && panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery('');
  };

  return (
    <div>
      {label && <span className="text-sm text-ink-dim">{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label || 'Wybierz ikonę'}
        className={[
          'mt-1 flex w-full items-center gap-2 rounded-lg border bg-bg px-2.5 py-2 text-sm transition',
          open ? 'border-accent' : 'border-edge hover:border-ink-dim',
        ].join(' ')}
      >
        <Icon name={value} size={20} />
        <span className="truncate font-mono text-xs text-ink-dim">{labelOf(value)}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="eter-pop fixed w-72 rounded-lg border border-edge bg-surface p-3 shadow-2xl"
            style={{ top: position.top, left: position.left, zIndex: 'var(--z-dropdown)' }}
          >
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj ikony"
              aria-label="Szukaj ikony"
              autoFocus
            />

            <div className="mt-2 grid max-h-64 grid-cols-7 gap-1 overflow-y-auto">
              {matches.map((name) => (
                <Tooltip key={name} label={labelOf(name)}>
                  <button
                    type="button"
                    aria-label={labelOf(name)}
                    onClick={() => choose(name)}
                    className={[
                      'flex w-full items-center justify-center rounded p-1.5 transition',
                      name === value ? 'bg-accent text-bg' : 'text-ink-dim hover:bg-raised',
                    ].join(' ')}
                  >
                    <Icon name={name} size={18} />
                  </button>
                </Tooltip>
              ))}
            </div>

            {matches.length === 0 && (
              <p className="mt-2 text-xs text-ink-dim">Brak ikony o takiej nazwie.</p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
