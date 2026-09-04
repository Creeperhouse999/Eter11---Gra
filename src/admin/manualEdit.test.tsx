import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrintManual } from './PrintManual';
import { BUILTIN_CONTENT } from '../data/builtinContent';

/**
 * Adam: „zrób jeszcze dostęp do edycji poprzez kliknięcie na daną stronę
 * w zakładce »Drukuj instrukcję«".
 *
 * Sedno jest w tym, że KAŻDA strona prowadzi do WŁAŚCIWEJ pod-zakładki.
 * Wiedza, że strona 5 bierze się z „Pytań graczy", a 2 z „Opisu na pudełko",
 * istniała dotąd wyłącznie w głowie autora panelu — a to właśnie ona jest tu
 * przekazywana użytkownikowi. Przycisk prowadzący nie tam, gdzie trzeba, jest
 * gorszy niż brak przycisku.
 */

describe('edycja treści z wydruku instrukcji', () => {
  it('każda strona prowadzi do swojej pod-zakładki', () => {
    const onEdit = vi.fn();
    render(<PrintManual content={BUILTIN_CONTENT} onEdit={onEdit} />);

    const przyciski = screen.getAllByRole('button', { name: 'Edytuj treść' });
    // Strony 1–5 mają źródło w treści; strona 6 (podsumowanie techniczne)
    // liczy się z danych gry, więc edytować w niej nie ma czego.
    expect(przyciski).toHaveLength(5);

    for (const [index, cel] of ['story', 'box', 'adults', 'rules', 'faq'].entries()) {
      onEdit.mockClear();
      przyciski[index].click();
      expect(onEdit, `strona ${index + 1}`).toHaveBeenCalledWith(cel);
    }
  });

  it('bez obsługi edycji przycisków nie ma — wydruk zostaje wydrukiem', () => {
    render(<PrintManual content={BUILTIN_CONTENT} />);
    expect(screen.queryAllByRole('button', { name: 'Edytuj treść' })).toHaveLength(0);
  });
});
