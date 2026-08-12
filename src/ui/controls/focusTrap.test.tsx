import { describe, it, expect, vi } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

/**
 * Nakładka nie może gubić fokusu ani wypuszczać go na tło.
 *
 * Nakładki otwierane w portalu lądują na końcu dokumentu, więc dla klawiatury
 * są osobnym miejscem: bez uwięzienia Tab z ostatniego elementu wychodzi na
 * tło i nie ma jak wrócić, a po zamknięciu fokus spada na `body` — kolejny Tab
 * startuje od góry całej strony. Osoba pracująca na klawiaturze musi wtedy
 * przetabować cały panel, żeby wrócić tam, gdzie była.
 *
 * `Modal` miał tę logikę u siebie; hak wyciąga ją dla pozostałych nakładek
 * (wybór ikony, powiększenie obrazka, kolor).
 */

function Nakladka() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef, () => setOpen(false));

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Otwórz
      </button>
      <button type="button">Na tle</button>
      {open && (
        <div ref={panelRef}>
          <button type="button">Pierwszy</button>
          <button type="button">Ostatni</button>
        </div>
      )}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('Escape zamyka i oddaje fokus przyciskowi, który otworzył', async () => {
    render(<Nakladka />);
    const trigger = screen.getByRole('button', { name: 'Otwórz' });
    trigger.focus();
    fireEvent.click(trigger);

    await screen.findByRole('button', { name: 'Pierwszy' });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: 'Pierwszy' })).toBeNull();
    // Sedno: fokus wraca tam, skąd przyszedł, a nie na `body`.
    expect(document.activeElement).toBe(trigger);
  });

  it('Tab z ostatniego elementu wraca na pierwszy, nie ucieka na tło', async () => {
    render(<Nakladka />);
    fireEvent.click(screen.getByRole('button', { name: 'Otwórz' }));

    const first = await screen.findByRole('button', { name: 'Pierwszy' });
    const last = screen.getByRole('button', { name: 'Ostatni' });

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    // I w drugą stronę: Shift+Tab z pierwszego skacze na ostatni.
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('po otwarciu fokus wchodzi do środka nakładki', async () => {
    render(<Nakladka />);
    fireEvent.click(screen.getByRole('button', { name: 'Otwórz' }));

    const first = await screen.findByRole('button', { name: 'Pierwszy' });
    expect(document.activeElement).toBe(first);
  });

  it('zamknięta nakładka nie przechwytuje klawiszy', () => {
    const onClose = vi.fn();
    function Zamknieta() {
      const panelRef = useRef<HTMLDivElement>(null);
      useFocusTrap(false, panelRef, onClose);
      return <div ref={panelRef} />;
    }
    render(<Zamknieta />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
