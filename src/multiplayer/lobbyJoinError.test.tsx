import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';

/**
 * „Dołącz" na wolnej sieci nie może zawiesić przycisku na „Dołączam…".
 *
 * `joinRoom` woła trzy operacje Firebase (ensureSession/get/update); każda
 * potrafi ODRZUCIĆ przy sieci lub uprawnieniach. Handler `join` nie miał
 * try/catch (w odróżnieniu od `create`), więc odrzucenie było połykane przez
 * `void join()`, `setBusy(false)` nigdy nie biegło i przycisk zostawał na
 * zawsze wyłączony z napisem „Dołączam…" — dziecko na chwiejnym tablecie
 * musiało przeładować stronę. Handler ma pokazać błąd i odblokować przycisk.
 */

vi.mock('./room', () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(async () => {
    throw new Error('Brak sieci.');
  }),
}));

const { LobbyScreen } = await import('./LobbyScreen');

function renderLobby() {
  render(
    <ToastProvider>
      <LobbyScreen onEnter={vi.fn()} onBack={vi.fn()} />
    </ToastProvider>,
  );
}

describe('LobbyScreen — błąd dołączania', () => {
  it('gdy joinRoom odrzuci, przycisk wraca do „Dołącz" (nie wisi na „Dołączam…")', async () => {
    renderLobby();

    fireEvent.click(screen.getByRole('button', { name: 'Dołącz kodem' }));
    fireEvent.change(screen.getByPlaceholderText('Imię'), { target: { value: 'Ala' } });
    fireEvent.change(screen.getByPlaceholderText('np. K7QP'), { target: { value: 'ABCD' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Dołącz' }));
      // Domknij mikrozadania odrzuconej obietnicy.
      await Promise.resolve();
      await Promise.resolve();
    });

    const button = screen.getByRole('button', { name: /Dołącz/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Dołącz');
    // Gracz dostaje czytelny komunikat, a nie niemy martwy przycisk — ani
    // surowy błąd Firebase. Techniczny „Brak sieci." (e.message) NIE wychodzi
    // na ekran; trafia do konsoli. Na toaście zostaje komunikat po ludzku.
    expect(screen.queryByText('Brak sieci.')).toBeNull();
    expect(screen.getByText(/Nie udało się dołączyć/)).toBeDefined();
  });
});
