import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPicker } from './ColorPicker';

/**
 * Wybór koloru w panelu redakcyjnym. Bez testów, a niesie matematykę
 * HSV↔HEX (suwaki myślą w HSV, zapis idzie w HEX) — cichy błąd w konwersji
 * przestawiłby redaktorowi kolory bez śladu. Sprawdzamy obie strony przez
 * komponent: odczyt barwy z HEX (pozycja suwaka) i zapis HEX z suwaka
 * (onChange), plus regułę „niepełny kod nie propaguje, pełny tak".
 */

function open(value: string, onChange = vi.fn(), presets: string[] = []) {
  render(
    <ColorPicker value={value} onChange={onChange} label="Kolor" presets={presets} />,
  );
  fireEvent.click(screen.getByRole('button', { name: `Kolor: ${value}` }));
  return { onChange };
}

describe('ColorPicker — konwersja HSV↔HEX', () => {
  it('odczytuje barwę z HEX: czysta zieleń to 120° na suwaku', () => {
    open('#00ff00');
    const hue = screen.getByLabelText('Barwa') as HTMLInputElement;
    expect(hue.value).toBe('120');
  });

  it('zapisuje HEX z suwaka barwy: z zieleni na 0° robi czysta czerwień', () => {
    const { onChange } = open('#00ff00');
    const hue = screen.getByLabelText('Barwa');
    fireEvent.change(hue, { target: { value: '0' } });
    expect(onChange).toHaveBeenLastCalledWith('#ff0000');
  });

  it('czysta czerwień to 0° i pełne nasycenie/jasność (znacznik w prawym górnym rogu)', () => {
    open('#ff0000');
    const hue = screen.getByLabelText('Barwa') as HTMLInputElement;
    expect(hue.value).toBe('0');
    // Znacznik pola nasycenia: left = s*100%, top = (1-v)*100%. Dla s=v=1 →
    // 100% / 0% (prawy górny róg).
    const marker = document.querySelector('[aria-hidden="true"].pointer-events-none') as HTMLElement;
    expect(marker.style.left).toBe('100%');
    expect(marker.style.top).toBe('0%');
  });
});

describe('ColorPicker — pole kodu i paleta', () => {
  it('niepełny kod nie propaguje, pełny poprawny — tak', () => {
    const { onChange } = open('#000000');
    const text = screen.getByLabelText('Kod koloru');

    fireEvent.change(text, { target: { value: '#12' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(text, { target: { value: '#123abc' } });
    expect(onChange).toHaveBeenLastCalledWith('#123abc');
  });

  it('niepoprawny kod dostaje czerwoną ramkę, poprawny zwykłą', () => {
    open('#000000');
    const text = screen.getByLabelText('Kod koloru');

    fireEvent.change(text, { target: { value: 'nonsens' } });
    expect(text.className).toContain('border-danger');

    fireEvent.change(text, { target: { value: '#abcdef' } });
    expect(text.className).not.toContain('border-danger');
  });

  it('klik w kolor palety zgłasza dokładnie tę wartość', () => {
    const { onChange } = open('#000000', vi.fn(), ['#abcdef', '#fedcba']);
    fireEvent.click(screen.getByRole('button', { name: 'Ustaw #fedcba' }));
    expect(onChange).toHaveBeenLastCalledWith('#fedcba');
  });
});
