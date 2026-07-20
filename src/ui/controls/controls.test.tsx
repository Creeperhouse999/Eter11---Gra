import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Chip } from './Chip';
import { NumberField, TextField } from './Field';
import { Modal } from './Modal';
import { Select } from './Select';
import { ToastProvider, useToast } from './Toast';
import { Toggle } from './Toggle';
import { useConfirm } from './useConfirm';

describe('Checkbox', () => {
  it('zgłasza zmianę stanu', () => {
    const onChange = vi.fn();
    render(
      <Checkbox checked={false} onChange={onChange}>
        Zgoda
      </Checkbox>,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Zgoda' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('odznaczenie zgłasza false', () => {
    const onChange = vi.fn();
    render(
      <Checkbox checked onChange={onChange}>
        Zgoda
      </Checkbox>,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('wyłączony jest oznaczony jako niedostępny', () => {
    render(
      <Checkbox checked={false} disabled onChange={vi.fn()}>
        Zgoda
      </Checkbox>,
    );
    expect(screen.getByRole('checkbox').hasAttribute('disabled')).toBe(true);
  });
});

describe('Toggle', () => {
  it('ma rolę przełącznika', () => {
    render(
      <Toggle checked={false} onChange={vi.fn()}>
        Tryb nocny
      </Toggle>,
    );
    expect(screen.getByRole('switch', { name: 'Tryb nocny' })).toBeDefined();
  });

  it('zgłasza zmianę', () => {
    const onChange = vi.fn();
    render(
      <Toggle checked={false} onChange={onChange}>
        Tryb nocny
      </Toggle>,
    );
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Chip', () => {
  it('przełącza zaznaczenie', () => {
    const onChange = vi.fn();
    render(
      <Chip checked={false} onChange={onChange}>
        Empatia
      </Chip>,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Empatia' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Select', () => {
  const options = [
    { value: 'a', label: 'Pierwsza' },
    { value: 'b', label: 'Druga' },
    { value: 'c', label: 'Trzecia' },
  ];

  it('pokazuje wybraną opcję', () => {
    render(<Select value="b" options={options} onChange={vi.fn()} ariaLabel="Wybór" />);
    expect(screen.getByRole('button', { name: 'Wybór' }).textContent).toContain('Druga');
  });

  it('otwiera listę po kliknięciu', async () => {
    render(<Select value="a" options={options} onChange={vi.fn()} ariaLabel="Wybór" />);
    fireEvent.click(screen.getByRole('button', { name: 'Wybór' }));
    expect(await screen.findByRole('listbox')).toBeDefined();
  });

  it('wybór opcji zgłasza wartość i zamyka listę', async () => {
    const onChange = vi.fn();
    render(<Select value="a" options={options} onChange={onChange} ariaLabel="Wybór" />);
    fireEvent.click(screen.getByRole('button', { name: 'Wybór' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Trzecia' }));
    expect(onChange).toHaveBeenCalledWith('c');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
  });

  it('strzałka w dół otwiera listę', async () => {
    render(<Select value="a" options={options} onChange={vi.fn()} ariaLabel="Wybór" />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Wybór' }), { key: 'ArrowDown' });
    expect(await screen.findByRole('listbox')).toBeDefined();
  });

  it('Enter wybiera podświetloną opcję', async () => {
    const onChange = vi.fn();
    render(<Select value="a" options={options} onChange={onChange} ariaLabel="Wybór" />);
    const trigger = screen.getByRole('button', { name: 'Wybór' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await screen.findByRole('listbox');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('Escape zamyka bez zmiany', async () => {
    const onChange = vi.fn();
    render(<Select value="a" options={options} onChange={onChange} ariaLabel="Wybór" />);
    const trigger = screen.getByRole('button', { name: 'Wybór' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await screen.findByRole('listbox');
    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('zaznacza aktualną opcję dla czytników ekranu', async () => {
    render(<Select value="b" options={options} onChange={vi.fn()} ariaLabel="Wybór" />);
    fireEvent.click(screen.getByRole('button', { name: 'Wybór' }));
    const selected = await screen.findByRole('option', { selected: true });
    expect(selected.textContent).toContain('Druga');
  });
});

describe('Modal', () => {
  it('nie renderuje się, gdy zamknięte', () => {
    render(<Modal open={false} title="Tytuł" onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape wywołuje zamknięcie', () => {
    const onClose = vi.fn();
    render(<Modal open title="Tytuł" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('przycisk zamknięcia działa', () => {
    const onClose = vi.fn();
    render(<Modal open title="Tytuł" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('ma rolę dialogu z etykietą', () => {
    render(<Modal open title="Usunąć?" onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Usunąć?' })).toBeDefined();
  });
});

describe('useConfirm', () => {
  function Harness() {
    const { confirm, dialog } = useConfirm();
    const [result, setResult] = useState<string>('brak');
    return (
      <>
        {dialog}
        <button
          type="button"
          onClick={async () => {
            const ok = await confirm({ title: 'Na pewno?', message: 'To nieodwracalne.' });
            setResult(ok ? 'tak' : 'nie');
          }}
        >
          Uruchom
        </button>
        <span data-testid="wynik">{result}</span>
      </>
    );
  }

  it('potwierdzenie zwraca true', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Uruchom' }));
    const dialog = await screen.findByRole('dialog', { name: 'Na pewno?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Potwierdź' }));
    await waitFor(() => expect(screen.getByTestId('wynik').textContent).toBe('tak'));
  });

  it('anulowanie zwraca false', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Uruchom' }));
    const dialog = await screen.findByRole('dialog', { name: 'Na pewno?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Anuluj' }));
    await waitFor(() => expect(screen.getByTestId('wynik').textContent).toBe('nie'));
  });
});

describe('Toast', () => {
  function Harness() {
    const toast = useToast();
    return (
      <button type="button" onClick={() => toast('Zapisano zmiany.', 'success')}>
        Pokaż
      </button>
    );
  }

  it('pokazuje powiadomienie', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż' }));
    expect(await screen.findByText('Zapisano zmiany.')).toBeDefined();
  });

  it('powiadomienie da się zamknąć ręcznie', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Zamknij powiadomienie' }));
    await waitFor(() => expect(screen.queryByText('Zapisano zmiany.')).toBeNull());
  });
});

describe('Alert', () => {
  it('błąd ma rolę alert', () => {
    render(<Alert tone="danger">Coś poszło źle.</Alert>);
    expect(screen.getByRole('alert').textContent).toContain('Coś poszło źle.');
  });

  it('informacja ma rolę status, nie przerywa czytnika', () => {
    render(<Alert tone="info">Zapisano.</Alert>);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('można zamknąć', () => {
    const onDismiss = vi.fn();
    render(
      <Alert tone="info" onDismiss={onDismiss}>
        Zapisano.
      </Alert>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij komunikat' }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('NumberField', () => {
  it('strzałki zmieniają wartość', () => {
    const onChange = vi.fn();
    render(<NumberField label="Rundy" value={7} min={1} max={30} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwiększ' }));
    expect(onChange).toHaveBeenCalledWith(8);
    fireEvent.click(screen.getByRole('button', { name: 'Zmniejsz' }));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('nie przekracza zakresu', () => {
    const onChange = vi.fn();
    render(<NumberField label="Rundy" value={30} min={1} max={30} onChange={onChange} />);
    const increase = screen.getByRole('button', { name: 'Zwiększ' });
    expect(increase.hasAttribute('disabled')).toBe(true);
  });

  it('wpisana wartość spoza zakresu jest przycinana', () => {
    const onChange = vi.fn();
    render(<NumberField label="Rundy" value={7} min={1} max={30} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Rundy'), { target: { value: '999' } });
    expect(onChange).toHaveBeenCalledWith(30);
  });
});

describe('TextField', () => {
  it('pokazuje błąd zamiast podpowiedzi', () => {
    render(<TextField label="Imię" hint="Podpowiedź" error="Pole wymagane" />);
    expect(screen.getByText('Pole wymagane')).toBeDefined();
    expect(screen.queryByText('Podpowiedź')).toBeNull();
    expect(screen.getByLabelText('Imię').getAttribute('aria-invalid')).toBe('true');
  });
});

describe('Button', () => {
  it('wyłączony nie wywołuje akcji', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Zapisz
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('domyślnie ma typ button, żeby nie wysyłał formularza', () => {
    render(<Button>Akcja</Button>);
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });
});
