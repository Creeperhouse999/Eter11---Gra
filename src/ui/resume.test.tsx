import { describe, it, expect, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ToastProvider } from './controls/Toast';
import { GameApp } from './GameApp';

// GameApp pokazuje powiadomienia (przycisk zgłoszeń), więc potrzebuje dostawcy.
const render = (ui: ReactElement) => rtlRender(<ToastProvider>{ui}</ToastProvider>);
import { hasSavedGame } from './savedGame';

/**
 * Wznawianie zapisanej partii.
 *
 * Zapis jest wygodą, a nie zobowiązaniem: gdy nie da się go wczytać, gracz
 * ma wylądować w menu, a nie w grze bez graczy. Menu musi też zostać
 * osiągalne — inaczej rozpoczęta partia zamyka drogę do samouczka.
 */

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('eter11:intro-seen', '1');
});

/** Rozpoczyna zwykłą grę i zostawia zapis. */
function startAndLeave() {
  const view = render(<GameApp />);
  const inputs = screen.getAllByPlaceholderText('Imię');
  fireEvent.change(inputs[0], { target: { value: 'Ala' } });
  fireEvent.change(inputs[1], { target: { value: 'Bo' } });
  fireEvent.click(screen.getByRole('button', { name: /Zaczynamy misję/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Odkryj problem' }));
  view.unmount();
}

describe('wznowienie partii', () => {
  it('proponuje powrót do rozpoczętej gry', () => {
    startAndLeave();
    render(<GameApp />);

    // Menu z wyborem, nie automatyczne wznowienie: gracz może też zacząć
    // coś innego albo odpalić samouczek.
    fireEvent.click(screen.getByRole('button', { name: /Wróć do gry/ }));
    expect(screen.queryByPlaceholderText('Imię')).toBeNull();
  });

  it('uszkodzony zapis nie proponuje powrotu do gry', () => {
    startAndLeave();
    // Zapis nie do odczytania — np. po zmianie wersji formatu.
    localStorage.setItem('eter11:game', '{uszkodzony');

    render(<GameApp />);

    // Bez przycisku powrotu: wznowienie dałoby partię bez graczy.
    expect(screen.queryByRole('button', { name: /Wróć do gry/ })).toBeNull();
    expect(screen.getAllByPlaceholderText('Imię').length).toBeGreaterThan(0);
  });

  it('zapis w nieznanej wersji nie tworzy pustej partii', () => {
    startAndLeave();
    localStorage.setItem(
      'eter11:game',
      JSON.stringify({ version: 999, seed: 1, state: { players: [] } }),
    );

    render(<GameApp />);
    expect(screen.queryByRole('button', { name: /Wróć do gry/ })).toBeNull();
    expect(screen.getAllByPlaceholderText('Imię').length).toBeGreaterThan(0);
  });

  it('samouczek pozostaje dostępny mimo zapisanej partii', () => {
    startAndLeave();
    render(<GameApp />);

    // Rozpoczęta partia nie może zamykać drogi do samouczka.
    expect(screen.getByRole('button', { name: /Naucz mnie grać/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Wróć do gry/ })).toBeDefined();
  });

  it('zakończenie gry kasuje zapis', async () => {
    startAndLeave();
    expect(hasSavedGame()).toBe(true);

    render(<GameApp />);
    fireEvent.click(screen.getByRole('button', { name: /Wróć do gry/ }));
    fireEvent.click(screen.getByRole('button', { name: /Zakończ grę/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Zakończ' }));

    // Potwierdzenie kończy obietnicę, więc powrót do menu następuje
    // dopiero w kolejnym cyklu — czekamy na ekran ustawień.
    await screen.findAllByPlaceholderText('Imię');
    expect(hasSavedGame()).toBe(false);

    // Przycisk powrotu musi zniknąć razem z zapisem — inaczej prowadziłby
    // do partii, której już nie ma.
    expect(screen.queryByRole('button', { name: /Wróć do gry/ })).toBeNull();
  });

  it('pozwala zacząć drugą grę po powrocie do menu', async () => {
    // Blokada podwójnego kliknięcia mogłaby zostać włączona na stałe —
    // wtedy druga partia nie ruszyłaby wcale.
    startAndLeave();
    render(<GameApp />);
    fireEvent.click(screen.getByRole('button', { name: /Wróć do gry/ }));
    fireEvent.click(screen.getByRole('button', { name: /Zakończ grę/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Zakończ' }));
    await screen.findAllByPlaceholderText('Imię');

    const inputs = screen.getAllByPlaceholderText('Imię');
    fireEvent.change(inputs[0], { target: { value: 'Cela' } });
    fireEvent.change(inputs[1], { target: { value: 'Dawid' } });
    fireEvent.click(screen.getByRole('button', { name: /Zaczynamy misję/ }));

    expect(screen.getByRole('button', { name: 'Odkryj problem' })).toBeDefined();
  });
});
