import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Modal } from './Modal';

/**
 * Fokus początkowy w oknie modalnym.
 *
 * Regresja: querySelector łapał pierwszy przycisk w DOM — „Zamknij" (X) w
 * nagłówku — więc w oknach potwierdzenia (useConfirm) ENTER aktywował X i
 * anulował, zamiast potwierdzić. Fokus musi trafić na akcję główną (ostatni
 * przycisk stopki), a w oknie z formularzem — na pierwsze pole.
 */
describe('Modal — fokus początkowy', () => {
  it('okno potwierdzenia fokusuje przycisk akcji, nie „Zamknij"', () => {
    render(
      <Modal
        open
        title="Usunąć?"
        onClose={() => {}}
        footer={
          <>
            <button type="button">Anuluj</button>
            <button type="button">Potwierdź</button>
          </>
        }
      >
        pytanie
      </Modal>,
    );

    const confirm = screen.getByRole('button', { name: 'Potwierdź' });
    // Bez fixu: aktywny był „Zamknij" (X), więc Enter anulował.
    expect(document.activeElement).toBe(confirm);
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Zamknij' }));
  });

  it('okno z formularzem fokusuje pierwsze pole, nie przycisk', () => {
    render(
      <Modal open title="Zgłoś" onClose={() => {}}>
        <input aria-label="Temat" />
        <textarea aria-label="Szczegóły" />
      </Modal>,
    );

    expect(document.activeElement).toBe(screen.getByLabelText('Temat'));
  });
});
