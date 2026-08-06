import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from './Tooltip';

/**
 * Dymek podpowiedzi nie może zwężać się do kilku znaków w linii.
 *
 * Regresja (zgłoszenie „Wychodzi poza" — przełącznik jasny/ciemny w rogu
 * ekranu): dymek miał `width: auto` (domyślne) i był pozycjonowany samym
 * `left` (bez `right`), centrowany wizualnie transformem `-translate-x-1/2`.
 * Przeglądarka liczy szerokość `auto` jako miejsce od `left` do prawej
 * krawędzi ekranu — dla elementu blisko tej krawędzi (jak przełącznik
 * motywu, `fixed right-3`) to niemal zero, więc krótka etykieta („Włącz
 * tryb ciemny") zawijała się w wąską pionową wieżyczkę zamiast zmieścić się
 * w jednej-dwóch liniach. To błąd czysto stylowy, nie do złapania przez
 * layout jsdom (nie liczy realnych wymiarów) — asercja pilnuje klasy, która
 * każe liczyć szerokość z treści (`w-max`), niezależnie od `left`.
 */
describe('Tooltip — szerokość dymka', () => {
  it('liczy szerokość z treści (w-max), nie z dostępnego miejsca od `left`', () => {
    render(
      <Tooltip label="Włącz tryb ciemny">
        <button type="button">przełącznik</button>
      </Tooltip>,
    );
    fireEvent.pointerEnter(screen.getByText('przełącznik').closest('span')!);

    const tip = screen.getByRole('tooltip');
    // Bez fixu: brak `w-max` — szerokość `auto` liczona od `left`, zawija się
    // w wąską kolumnę blisko prawej krawędzi. Z fixem: `w-max` liczy z treści.
    expect(tip.className).toMatch(/\bw-max\b/);
    // Sufit szerokości dla naprawdę długich podpowiedzi zostaje.
    expect(tip.className).toMatch(/max-w-\[calc\(100vw-16px\)\]/);
  });
});

/**
 * Drugi, głębszy kawałek tego samego zgłoszenia: dymek nie może gubić
 * centrowania po animacji wejścia.
 *
 * Regresja: `eter-pop` (`@keyframes eter-pop { to { transform: none } }`)
 * i statyczna klasa `-translate-x-1/2` sprzeczały się o tę samą właściwość
 * CSS. Animacja WYGRYWA z transformem ze statycznej klasy przez cały czas
 * trwania i po niej (fill-mode `both`) — więc po dojechaniu animacji dymek
 * zostawał przyklejony lewym brzegiem do `left` zamiast wycentrowany na
 * elemencie, i realnie wychodził poza ekran przy elemencie blisko krawędzi
 * (przełącznik motywu, prawy górny róg) — to jest samo „Wychodzi poza"
 * z tytułu zgłoszenia. jsdom nie odgrywa animacji ani nie liczy realnego
 * `transform`, więc asercja pilnuje samego doboru klasy animacji: `eter-pop`
 * rusza `transform`, `eter-fade-in` tylko `opacity` — i nie kolidowałby.
 */
describe('Tooltip — animacja wejścia nie gryzie się z centrowaniem', () => {
  it('nie używa eter-pop (animuje transform, nadpisuje centrowanie po skończeniu)', () => {
    render(
      <Tooltip label="Włącz tryb ciemny">
        <button type="button">przełącznik2</button>
      </Tooltip>,
    );
    fireEvent.pointerEnter(screen.getByText('przełącznik2').closest('span')!);

    const tip = screen.getByRole('tooltip');
    // Bez fixu: `eter-pop` w klasie — po animacji `transform: none` nadpisuje
    // `-translate-x-1/2`, dymek nie jest wycentrowany. Z fixem: `eter-fade-in`
    // (tylko opacity) obok wciąż obecnego `-translate-x-1/2`.
    expect(tip.className).not.toMatch(/(?:^|\s)eter-pop(?:\s|$)/);
    expect(tip.className).toMatch(/(?:^|\s)eter-fade-in(?:\s|$)/);
    expect(tip.className).toMatch(/-translate-x-1\/2/);
  });
});
