import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '../icons/Icon';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  /** Kolor kropki przy opcji — koduje kategorię albo typ. */
  color?: string;
  hint?: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  /** Etykieta dla czytników, gdy `label` nie jest widoczna. */
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Lista rozwijana w stylu ETER11.
 *
 * Natywny `<select>` nie pozwala rysować ikon ani kolorów kategorii, a te
 * niosą tu informację — dlatego własna implementacja. Obsługa klawiatury
 * odtworzona ręcznie: strzałki, Enter, Escape, Home/End.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  disabled,
  className,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  );
  /** Pozycja listy na ekranie — liczona z prostokąta przycisku. */
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const MAX_LIST_HEIGHT = 256;

  // Lista renderuje się w portalu, bo edytory mają przewijane kontenery,
  // które przycinałyby ją w połowie. Pozycję trzeba więc policzyć ręcznie.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const height = Math.min(MAX_LIST_HEIGHT, options.length * 38 + 8);

    setPosition({
      top: spaceBelow < height ? rect.top - height - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [open, options.length]);

  const selected = options.find((o) => o.value === value);

  // Kliknięcie poza listą zamyka ją — inaczej zostawałaby otwarta pod innymi polami.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    /**
     * Przewinięcie STRONY rozjeżdża listę z przyciskiem, więc ją zamykamy.
     *
     * Ale nasłuch działa w fazie przechwytywania i łapie też przewijanie
     * samej listy — a przy wielu opcjach ma ona własny pasek. Bez sprawdzenia
     * źródła lista zamykała się przy każdej próbie dojechania do dolnych
     * opcji, co na telefonie oznaczało, że w ogóle nie dało się jej przewinąć.
     */
    const onScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (target && listRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    // scrollIntoView nie istnieje w środowiskach testowych ani w starszych
    // przeglądarkach — przewijanie jest udogodnieniem, nie warunkiem działania.
    active?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex]);

  const choose = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
      event.preventDefault();
      setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
      setOpen(true);
      return;
    }

    if (!open) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        // Guard na pustą listę: `% 0` dałoby NaN i zepsuło zaznaczenie.
        if (options.length > 0) setActiveIndex((i) => (i + 1) % options.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (options.length > 0) setActiveIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Lista mogła się skrócić po tym, jak `activeIndex` został ustawiony
        // (np. filtr zawęził opcje) — bez zabezpieczenia Enter wywracał render.
        {
          const option = options[activeIndex] ?? options[0];
          if (option) choose(option.value);
        }
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      {label && <span className="block text-sm text-ink-dim">{label}</span>}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          // Otwarcie myszą przywraca podświetlenie na aktualną wartość — tak
          // samo jak otwarcie klawiaturą (onKeyDown wyżej). Bez tego po
          // ArrowDown/Escape i ponownym kliknięciu lista zostawała podświetlona
          // na starej pozycji, a Enter wybierał nie tę opcję, na którą patrzy
          // użytkownik.
          if (!open) setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
          setOpen((v) => !v);
        }}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
        className={[
          'mt-1 flex w-full items-center gap-2 rounded-lg border bg-bg px-2.5 py-2 text-left text-sm transition',
          open ? 'border-accent' : 'border-edge hover:border-ink-dim',
          disabled ? 'cursor-not-allowed opacity-50' : '',
        ].join(' ')}
      >
        {selected?.color && (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: selected.color }}
          />
        )}
        {selected?.icon && <Icon name={selected.icon} size={16} />}
        <span className="flex-1 truncate">{selected?.label ?? '—'}</span>
        <Icon
          name="chevronDown"
          size={15}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel ?? label}
            className="eter-pop fixed max-h-64 overflow-y-auto rounded-lg border border-edge bg-surface p-1 shadow-2xl"
            style={{ top: position.top, left: position.left, width: position.width, zIndex: 'var(--z-dropdown)' }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-active={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option.value)}
                    className={[
                      'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition',
                      isActive ? 'bg-raised' : '',
                      isSelected ? 'text-accent' : '',
                    ].join(' ')}
                  >
                    {option.color && (
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: option.color }}
                      />
                    )}
                    {option.icon && <Icon name={option.icon} size={16} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.hint && (
                        <span className="block truncate text-xs text-ink-dim">
                          {option.hint}
                        </span>
                      )}
                    </span>
                    {isSelected && <Icon name="tick" size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
