import { useState } from 'react';
import { TextField } from '../ui/controls/Field';
import { ICON_NAMES, Icon, type IconName } from '../ui/icons/Icon';

interface IconPickerProps {
  value: string;
  onChange: (icon: IconName) => void;
  label?: string;
}

/**
 * Wybór ikony z zestawu ETER11.
 *
 * Lista jest długa, więc otwiera się dopiero po kliknięciu — inaczej
 * przytłoczyłaby formularz edycji karty.
 */
export function IconPicker({ value, onChange, label = 'Ikona' }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const matches = query
    ? ICON_NAMES.filter((name) => name.toLowerCase().includes(query.toLowerCase()))
    : ICON_NAMES;

  return (
    <div className="relative">
      <span className="text-sm text-ink-dim">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-1 flex w-full items-center gap-2 rounded-lg border border-edge bg-bg px-2.5 py-2 text-sm transition hover:border-ink-dim"
      >
        <Icon name={value as IconName} size={20} />
        <span className="truncate font-mono text-xs text-ink-dim">{value}</span>
      </button>

      {open && (
        <div className="eter-pop absolute z-20 mt-1 w-72 rounded-lg border border-edge bg-surface p-3 shadow-2xl">
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj ikony"
            aria-label="Szukaj ikony"
            autoFocus
          />
          <div className="mt-2 grid max-h-64 grid-cols-7 gap-1 overflow-y-auto">
            {matches.map((name) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                  setQuery('');
                }}
                className={[
                  'flex items-center justify-center rounded p-1.5 transition',
                  name === value ? 'bg-accent text-bg' : 'text-ink-dim hover:bg-raised',
                ].join(' ')}
              >
                <Icon name={name} size={18} />
              </button>
            ))}
          </div>
          {matches.length === 0 && (
            <p className="mt-2 text-xs text-ink-dim">Brak ikony o takiej nazwie.</p>
          )}
        </div>
      )}
    </div>
  );
}
