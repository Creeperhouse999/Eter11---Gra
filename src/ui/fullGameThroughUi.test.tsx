import { describe, it, expect, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ToastProvider } from './controls/Toast';
import { GameApp } from './GameApp';

const render = (ui: ReactElement) => rtlRender(<ToastProvider>{ui}</ToastProvider>);

/**
 * Partię da się przejść od menu do ekranu końcowego, klikając to, co dziecko.
 *
 * Silnik ma własne testy pełnej rozgrywki, ale one omijają interfejs: liczą
 * stan, nie klikają. Tymczasem gra potrafi utknąć właśnie na przycisku —
 * bo znika, jest wyłączony, albo prowadzi na ekran bez wyjścia. Tak było
 * z podsumowaniem misji w grze online i z ostatnim krokiem samouczka: stan
 * silnika był poprawny, a dziecko nie miało czego nacisnąć.
 *
 * Ten test klika przez CAŁĄ partię przy jednym urządzeniu i pilnuje, że na
 * każdym ekranie jest wyjście dalej, a na końcu pojawia się finał.
 */

beforeEach(() => {
  localStorage.clear();
  // Wstęp i tak ma własne testy — tutaj interesuje nas sama rozgrywka.
  localStorage.setItem('eter11:intro-seen', '1');
});

/** Klika pierwszy pasujący przycisk; `null`, gdy takiego nie ma. */
function clickIfPresent(name: RegExp): boolean {
  const buttons = screen.queryAllByRole('button', { name });
  const active = buttons.find((button) => !(button as HTMLButtonElement).disabled);
  if (!active) return false;
  fireEvent.click(active);
  return true;
}

/** Zagrywa dowolną kartę z ręki na dowolną wolną ściankę. */
function tryPlayAnyCard(): boolean {
  // Karty w ręce to przyciski z nazwą karty; ścianki mają etykietę mówiącą,
  // że karta pasuje (patrz ProblemCard — świadomie nie sam kolor).
  const cards = screen.queryAllByRole('button', { name: /^Karta / });
  for (const card of cards) {
    fireEvent.click(card);
    const slot = screen
      .queryAllByRole('button', { name: /pasuje/i })
      .find((button) => !(button as HTMLButtonElement).disabled);
    if (slot) {
      fireEvent.click(slot);
      return true;
    }
  }
  return false;
}

describe('cała partia przez interfejs', () => {
  it('od menu do ekranu końcowego zawsze jest co kliknąć', () => {
    render(<GameApp />);

    const inputs = screen.getAllByPlaceholderText('Imię');
    fireEvent.change(inputs[0], { target: { value: 'Ala' } });
    fireEvent.change(inputs[1], { target: { value: 'Bo' } });
    fireEvent.click(screen.getByRole('button', { name: /Zaczynamy misję/ }));

    // Pętla ograniczona z góry: gdyby gra utknęła, test ma paść z jasnym
    // komunikatem, a nie kręcić się w nieskończoność.
    for (let krok = 0; krok < 400; krok += 1) {
      if (screen.queryByText(/Koniec gry/i)) break;

      // Kolejny problem / kolejna misja.
      if (clickIfPresent(/Odkryj problem/)) continue;
      // Podsumowanie misji — zabranie karty i przejście dalej.
      if (clickIfPresent(/Zabieram na postać/)) continue;
      if (clickIfPresent(/^Dalej$/)) continue;
      // Czarny Łabędź i inne komunikaty do potwierdzenia.
      if (clickIfPresent(/Rozumiem|Zamknij|Gramy dalej/)) continue;

      // Zwykły ruch w misji: zagranie karty, a gdy nic nie pasuje — pas.
      if (tryPlayAnyCard()) continue;
      if (clickIfPresent(/Pasuję|Kończę turę/)) continue;

      throw new Error(
        `Gra utknęła w kroku ${krok}: żaden przycisk nie prowadzi dalej. ` +
          `Na ekranie: ${document.body.textContent?.slice(0, 300)}`,
      );
    }

    // Sedno: partia domyka się ekranem końcowym, a nie zawieszeniem.
    expect(screen.getByText(/Koniec gry/i)).toBeTruthy();
    // I da się z niego wyjść na nową grę — inaczej to ślepy zaułek.
    expect(screen.getByRole('button', { name: /Nowa gra/ })).toBeTruthy();

    // Sprawdzenie ekranu końcowego siedzi w TYM SAMYM przebiegu, nie w drugim
    // teście: przejście całej partii przez interfejs trwa kilkadziesiąt sekund,
    // a powtarzanie go tylko po to, żeby zajrzeć na finał, podwajało czas
    // i wpychało plik w limit czasu przy pełnym przebiegu.
    const wyniki = screen.getByText(/Wyniki indywidualne/i).closest('section');
    expect(wyniki).toBeTruthy();
    // `getAllBy`: imię pojawia się w nagłówku wyniku i na karcie postaci.
    expect(within(wyniki!).getAllByText('Ala').length).toBeGreaterThan(0);
    expect(within(wyniki!).getAllByText('Bo').length).toBeGreaterThan(0);
  }, 90_000);
});
