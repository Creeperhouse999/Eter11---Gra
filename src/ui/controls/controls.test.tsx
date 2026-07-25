import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { useState } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { ColorPicker } from './ColorPicker';
import { NumberField, TextField } from './Field';
import { Modal } from './Modal';
import { Select } from './Select';
import { ToastProvider, useToast } from './Toast';
import { TopBanner } from './TopBanner';
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



describe('warstwy z-index', () => {
  // Wszystko leżało na z-50, więc okno potwierdzenia usunięcia potrafiło
  // wylądować pod treścią i „Usuń" nie działał. Skala warstw musi zachować
  // porządek: potwierdzenie nad modalem, toast i podpowiedź nad wszystkim.
  const css = require('node:fs').readFileSync(
    require('node:path').join(process.cwd(), 'src/styles/theme.css'),
    'utf-8',
  );

  const value = (name: string): number => {
    // Szukamy `--nazwa: 50;` w arkuszu i zwracamy liczbę.
    const line = css.split(/\n/).find((l: string) => l.includes(`--${name}:`));
    const digits = line?.replace(/[^0-9]/g, '');
    return digits ? Number(digits) : NaN;
  };

  it('potwierdzenie stoi nad modalem', () => {
    expect(value('z-confirm')).toBeGreaterThan(value('z-modal'));
  });

  it('modal stoi nad listą rozwijaną', () => {
    expect(value('z-modal')).toBeGreaterThan(value('z-dropdown'));
  });

  it('toast i podpowiedź nad wszystkim', () => {
    expect(value('z-toast')).toBeGreaterThan(value('z-confirm'));
    expect(value('z-tooltip')).toBeGreaterThan(value('z-toast'));
  });

  it('warstwy planszy: podpowiedź < reflektor < dymek samouczka', () => {
    // Reflektor przyciemnia ekran wokół celu; dymek ETER11 stoi nad nim,
    // a podpowiedź o przewijaniu pod wszystkim.
    expect(value('z-hint')).toBeLessThan(value('z-spotlight'));
    expect(value('z-spotlight')).toBeLessThan(value('z-tutorial'));
  });

  it('nakładki gry nad samouczkiem', () => {
    // Czarny Łabędź i powiększenie karty muszą przykryć dymek samouczka.
    expect(value('z-game-overlay')).toBeGreaterThan(value('z-tutorial'));
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

  it('przewijanie samej listy jej nie zamyka', async () => {
    // Na telefonie lista opcji ma własny pasek. Zamykanie jej przy każdym
    // przewinięciu znaczyło, że dolnych opcji nie dało się dojechać.
    render(<Select value="a" options={options} onChange={vi.fn()} ariaLabel="Wybór" />);
    fireEvent.click(screen.getByRole('button', { name: 'Wybór' }));
    const list = await screen.findByRole('listbox');

    fireEvent.scroll(list);
    expect(screen.queryByRole('listbox')).not.toBeNull();
  });

  it('przewinięcie strony zamyka listę', async () => {
    render(<Select value="a" options={options} onChange={vi.fn()} ariaLabel="Wybór" />);
    fireEvent.click(screen.getByRole('button', { name: 'Wybór' }));
    await screen.findByRole('listbox');

    // Zdarzenie spoza listy — przewijanie strony pod otwartą listą.
    fireEvent.scroll(document.body);
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

  it('po ponownym otwarciu myszą Enter wybiera aktualną wartość, nie ostatnio podświetloną', async () => {
    // Ścieżka klawiaturowa przywraca podświetlenie na wybraną wartość przy
    // otwarciu; ścieżka myszy tego nie robiła. Sekwencja: otwórz, przejdź
    // strzałkami na trzecią opcję, zamknij Escape, otwórz PONOWNIE myszą,
    // Enter — bez fixu wybierało 'c' z poprzedniego otwarcia zamiast 'a'.
    const onChange = vi.fn();
    render(<Select value="a" options={options} onChange={onChange} ariaLabel="Wybór" />);
    const trigger = screen.getByRole('button', { name: 'Wybór' });

    fireEvent.click(trigger);
    await screen.findByRole('listbox');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // a -> b
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // b -> c
    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());

    fireEvent.click(trigger); // ponowne otwarcie myszą
    await screen.findByRole('listbox');
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('a');
    expect(onChange).not.toHaveBeenCalledWith('c');
  });
});

describe('Modal', () => {
  it('nie kradnie fokusu, gdy rodzic renderuje się z nowym onClose', () => {
    // Regresja: onClose w zależnościach efektu odpalał fokus po każdym
    // renderze rodzica i przenosił go na pierwszy element okna — pisanie
    // w polu gubiło co drugi znak. Tu symulujemy rodzica, który przy każdym
    // renderze podaje nową strzałkę onClose.
    function Parent() {
      const [, force] = useState(0);
      return (
        <Modal open title="Okno" onClose={() => {}}>
          <input
            data-testid="pole"
            onChange={() => force((n) => n + 1)}
          />
        </Modal>
      );
    }

    render(<Parent />);
    const input = screen.getByTestId('pole') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    // Zmiana w polu wymusza re-render rodzica (nowy onClose). Fokus ma zostać.
    fireEvent.change(input, { target: { value: 'a' } });
    expect(document.activeElement).toBe(input);
  });

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

  /**
   * Druga prośba, zanim padła odpowiedź na pierwszą (np. podwójny klik w „Usuń"),
   * nie może zawiesić pierwszej obietnicy na zawsze — musi się domknąć „nie".
   */
  function DoubleHarness() {
    const { confirm, dialog } = useConfirm();
    const [log, setLog] = useState<string[]>([]);
    const ask = (title: string) => async () => {
      const ok = await confirm({ title, message: title });
      setLog((prev) => [...prev, `${title}:${ok}`]);
    };
    return (
      <>
        {dialog}
        <button type="button" onClick={ask('A')}>a</button>
        <button type="button" onClick={ask('B')}>b</button>
        <span data-testid="log">{log.join(',')}</span>
      </>
    );
  }

  it('druga prośba przed odpowiedzią domyka pierwszą, nie zawiesza jej', async () => {
    render(<DoubleHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'a' }));
    fireEvent.click(screen.getByRole('button', { name: 'b' }));

    // Okno pokazuje teraz prośbę B (A została nadpisana).
    const dialog = await screen.findByRole('dialog', { name: 'B' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Potwierdź' }));

    // A domknięte „nie" (bez fixu wisiałoby i nigdy nie trafiło do logu), B „tak".
    await waitFor(() => {
      const log = screen.getByTestId('log').textContent ?? '';
      expect(log).toContain('A:false');
      expect(log).toContain('B:true');
    });
  });
});

describe('TopBanner', () => {
  /**
   * Baner znika sam po `autoHideMs`, nawet gdy wołający przerysowuje się
   * z coraz to nową funkcją `onDismiss` (tak robi adapter `game` w grze
   * online). Wcześniej `onDismiss` w zależnościach odliczania zerował timer
   * przy każdym renderze rodzica, więc baner nie znikał nigdy.
   */
  it('samoczynne zniknięcie przeżywa przerysowania z nową onDismiss', () => {
    vi.useFakeTimers();
    try {
      const dismissed = vi.fn();
      const { rerender } = render(
        <TopBanner message="Błąd" onDismiss={() => dismissed()} autoHideMs={4000} />,
      );

      // Trzy przerysowania z NOWĄ strzałką co 1,5 s — łącznie do t=4,5 s.
      act(() => vi.advanceTimersByTime(1500));
      rerender(<TopBanner message="Błąd" onDismiss={() => dismissed()} autoHideMs={4000} />);
      act(() => vi.advanceTimersByTime(1500));
      rerender(<TopBanner message="Błąd" onDismiss={() => dismissed()} autoHideMs={4000} />);
      act(() => vi.advanceTimersByTime(1500));

      // Bez fixu timer zerowałby się przy każdym rerenderze i nigdy nie odpalił.
      expect(dismissed).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
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

describe('ColorPicker', () => {
  it('pokazuje aktualny kolor w przycisku', () => {
    render(<ColorPicker value="#3ddbd0" label="Akcent" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /#3ddbd0/ })).toBeDefined();
  });

  it('otwiera panel po kliknięciu', async () => {
    render(<ColorPicker value="#3ddbd0" label="Akcent" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Akcent/ }));
    expect(await screen.findByLabelText('Barwa')).toBeDefined();
  });

  it('wpisanie poprawnego kodu zgłasza zmianę', async () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#3ddbd0" label="Akcent" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Akcent/ }));

    fireEvent.change(await screen.findByLabelText('Kod koloru'), {
      target: { value: '#ff0000' },
    });

    expect(onChange).toHaveBeenCalledWith('#ff0000');
  });

  it('niepoprawny kod nie zgłasza zmiany', async () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#3ddbd0" label="Akcent" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Akcent/ }));

    fireEvent.change(await screen.findByLabelText('Kod koloru'), {
      target: { value: 'czerwony' },
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('paleta ustawia kolor jednym kliknięciem', async () => {
    const onChange = vi.fn();
    render(
      <ColorPicker
        value="#3ddbd0"
        label="Akcent"
        presets={['#ff6b6b', '#5b9dff']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Akcent/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ustaw #ff6b6b' }));

    expect(onChange).toHaveBeenCalledWith('#ff6b6b');
  });

  it('Escape zamyka panel', async () => {
    render(<ColorPicker value="#3ddbd0" label="Akcent" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Akcent/ }));
    await screen.findByLabelText('Barwa');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByLabelText('Barwa')).toBeNull());
  });
});
