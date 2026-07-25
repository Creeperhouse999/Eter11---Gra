import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import { AccountPanel } from './AccountPanel';

/**
 * Zapis imienia konta.
 *
 * Regresja: Enter w polu sprawdzał tylko `nameChanged`, nie długość — więc
 * wyczyszczenie pola i Enter zapisywało PUSTE imię (wymazywało je), choć
 * przycisk „Zapisz" był wtedy wyłączony. Do tego zapis szedł nieprzycięty.
 */
const renderPanel = (
  displayName: string | null,
  onSaveName: (n: string) => Promise<{ ok: boolean; error?: string }> = vi.fn(async () => ({ ok: true })),
) => {
  render(
    <ToastProvider>
      <AccountPanel email="a@x" displayName={displayName} onSaveName={onSaveName} />
    </ToastProvider>,
  );
  return onSaveName;
};

describe('AccountPanel — imię', () => {
  it('Enter przy pustym polu nie zapisuje (nie wymazuje imienia)', () => {
    const onSaveName = renderPanel('Jan');
    const input = screen.getByLabelText('Twoje imię');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSaveName).not.toHaveBeenCalled();
  });

  it('Enter zapisuje przycięte imię', () => {
    const onSaveName = renderPanel('Jan');
    const input = screen.getByLabelText('Twoje imię');

    fireEvent.change(input, { target: { value: '  Nowy  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Bez fixu: '  Nowy  ' (nieprzycięte). Z fixem: 'Nowy'.
    expect(onSaveName).toHaveBeenCalledWith('Nowy');
  });

  it('przycisk „Zapisz" jest wyłączony przy pustym polu', () => {
    renderPanel('Jan');
    fireEvent.change(screen.getByLabelText('Twoje imię'), { target: { value: '   ' } });

    expect((screen.getByRole('button', { name: /Zapisz/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
