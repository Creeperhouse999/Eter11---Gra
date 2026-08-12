import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlackSwanBanner } from './BlackSwanBanner';
import type { BlackSwanEvent } from '../../engine/types';

/**
 * Okno Czarnego Łabędzia mówi poprawną polszczyzną.
 *
 * Liczba w nagłówku brała stałą formę „niespodzianki", więc przy pięciu
 * zdarzeniach wychodziło „5 niespodzianki naraz". Zdarzenia kumulują się,
 * dopóki dziecko nie zamknie okna (reducer dokłada je do
 * `pendingSwanEvents`), więc przy dłuższej partii to realny przypadek.
 *
 * To gra, która uczy ośmiolatka czytać ze zrozumieniem — błąd odmiany w niej
 * waży więcej niż w panelu dla dorosłych. Projekt ma do tego `counted`
 * i używa go wszędzie indziej; tu jedno miejsce zostało pominięte.
 */

const zdarzenie = (i: number): BlackSwanEvent => ({
  playerId: `p${i}`,
  playerName: `Gracz ${i}`,
  kind: 'extraProblem',
  cardName: 'Czarny Łabędź',
  applied: true,
});

const zdarzenia = (ile: number) => Array.from({ length: ile }, (_, i) => zdarzenie(i + 1));

describe('nagłówek okna Czarnego Łabędzia', () => {
  it('jedno zdarzenie ma własny tekst, bez liczby', () => {
    render(<BlackSwanBanner events={zdarzenia(1)} onDismiss={vi.fn()} />);

    expect(screen.getByText('Coś poszło nie tak')).toBeTruthy();
  });

  it.each([
    [2, '2 niespodzianki naraz'],
    [3, '3 niespodzianki naraz'],
    [4, '4 niespodzianki naraz'],
  ])('%s zdarzenia: „%s"', (ile, oczekiwany) => {
    render(<BlackSwanBanner events={zdarzenia(ile)} onDismiss={vi.fn()} />);

    expect(screen.getByText(oczekiwany)).toBeTruthy();
  });

  it.each([
    [5, '5 niespodzianek naraz'],
    [12, '12 niespodzianek naraz'],
    [22, '22 niespodzianki naraz'],
  ])('%s zdarzeń bierze formę mnogą: „%s"', (ile, oczekiwany) => {
    // Sedno: powyżej czterech polski wymaga innej końcówki, a 12–14 bierze
    // formę mnogą mimo końcówki 2–4.
    render(<BlackSwanBanner events={zdarzenia(ile)} onDismiss={vi.fn()} />);

    expect(screen.getByText(oczekiwany)).toBeTruthy();
  });
});
