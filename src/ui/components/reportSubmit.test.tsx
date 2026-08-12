import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '../controls/Toast';
import { ReportButton } from './ReportButton';

/**
 * Zgłoszenie błędu prosto z gry.
 *
 * To jedyna droga, którą osoba testująca grę z dziećmi może dać znać, że coś
 * nie działa — nie ma konta w panelu i nie zakłada go na jedno popołudnie.
 * Gdy ta ścieżka cicho przestanie działać, przestaniemy dostawać zgłoszenia
 * i nikt się o tym nie dowie.
 *
 * Trzy rzeczy muszą trzymać:
 * 1. Zgłoszenie z gry idzie ZAWSZE do akceptacji (`pending`) — nadawca nie ma
 *    roli, więc o wpuszczeniu decyduje moderator.
 * 2. Dwuklik nie wysyła dwóch zgłoszeń.
 * 3. Brak sieci nie zostawia martwego przycisku do końca sesji — dawniej
 *    odrzucone `import()` zostawiało blokadę zapaloną na zawsze.
 */

const addReport = vi.fn(async (_input: unknown) => ({ ok: true as boolean, error: undefined as string | undefined }));

vi.mock('../../firebase/reports', () => ({
  addReport: (input: unknown) => addReport(input),
}));

const otworzIWypelnij = (tytul = 'Karta nie chce się położyć') => {
  fireEvent.click(screen.getByLabelText('Zgłoś błąd'));
  fireEvent.change(screen.getByLabelText(/Co się dzieje|Tytuł|Krótko/i), {
    target: { value: tytul },
  });
};

beforeEach(() => {
  addReport.mockClear();
  addReport.mockImplementation(async () => ({ ok: true, error: undefined }));
});

describe('zgłoszenie błędu z gry', () => {
  it('wysyła zgłoszenie do akceptacji, nie od razu na listę', async () => {
    render(
      <ToastProvider>
        <ReportButton />
      </ToastProvider>,
    );

    otworzIWypelnij();
    fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }));

    await waitFor(() => expect(addReport).toHaveBeenCalledTimes(1));
    const wyslane = addReport.mock.calls[0][0] as { status: string; kind: string };
    // Sedno: nadawca nie ma roli, więc o wpuszczeniu decyduje moderator.
    expect(wyslane.status).toBe('pending');
    expect(wyslane.kind).toBe('bug');
  });

  it('pusty tytuł nie wysyła niczego', async () => {
    render(
      <ToastProvider>
        <ReportButton />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByLabelText('Zgłoś błąd'));
    fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }));

    expect(addReport).not.toHaveBeenCalled();
  });

  it('brak sieci nie zostawia martwego przycisku', async () => {
    addReport.mockImplementationOnce(async () => {
      throw new Error('offline');
    });
    render(
      <ToastProvider>
        <ReportButton />
      </ToastProvider>,
    );

    otworzIWypelnij();
    fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }));
    await screen.findByText(/Brak połączenia|Nie udało się/i);

    // Druga próba MUSI dojść — dawniej blokada zostawała zapalona na zawsze
    // i zgłoszenia z gry przestawały działać do przeładowania strony.
    fireEvent.click(screen.getByRole('button', { name: /Wyślij/i }));
    await waitFor(() => expect(addReport).toHaveBeenCalledTimes(2));
  });
});
