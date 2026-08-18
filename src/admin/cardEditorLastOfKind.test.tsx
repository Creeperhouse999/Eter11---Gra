import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import { CardEditor } from './CardEditor';
import type { Card } from '../engine/types';

/**
 * Ostrzeżenie „to jedyna karta tej kombinacji" ma chronić przed zapisem,
 * który validateContent i tak odrzuci — ale walidator liczy tylko karty
 * NIEROBOCZE (playableCards), a ostrzeżenie liczyło WSZYSTKIE, szkice
 * włącznie. Usunięcie jedynej nieroboczej karty kategorii+rodziny, gdy obok
 * niej istnieje szkic tej samej kombinacji, przechodziło więc bez ostrzeżenia
 * — a następny zapis i tak by go odrzucił, tyle że bez uprzedzenia.
 */

const BASE: Card = {
  id: 'psy-r-real',
  name: 'Karta prawdziwa',
  category: 'psychological',
  description: 'opis',
  icon: 'shield',
  family: 'red',
};

const DRAFT_TWIN: Card = {
  ...BASE,
  id: 'psy-r-draft',
  name: 'Karta szkicowa',
  draft: true,
};

const rowOf = (name: string) => screen.getByLabelText(`Zaznacz kartę ${name}`).closest('li')!;

describe('CardEditor — ostrzeżenie o ostatniej karcie liczy tylko nieroboczą treść', () => {
  it('ostrzega przy usuwaniu jedynej nieroboczej karty, mimo że istnieje jej szkicowy bliźniak', async () => {
    render(
      <ToastProvider>
        <CardEditor cards={[BASE, DRAFT_TWIN]} onChange={() => {}} />
      </ToastProvider>,
    );

    fireEvent.click(within(rowOf(BASE.name)).getByRole('button', { name: 'Usuń' }));
    const dialog = await screen.findByRole('dialog', { name: 'Usunąć kartę?' });
    expect(within(dialog).getByText(/jedyna karta tej kategorii/)).toBeTruthy();
  });

  it('nie ostrzega przy usuwaniu samego szkicu — nie wpływa na grywalną talię', async () => {
    render(
      <ToastProvider>
        <CardEditor cards={[BASE, DRAFT_TWIN]} onChange={() => {}} />
      </ToastProvider>,
    );

    fireEvent.click(within(rowOf(DRAFT_TWIN.name)).getByRole('button', { name: 'Usuń' }));
    const dialog = await screen.findByRole('dialog', { name: 'Usunąć kartę?' });
    expect(within(dialog).queryByText(/jedyna karta tej kategorii/)).toBeNull();
  });
});
