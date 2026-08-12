import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BUILTIN_CONTENT } from '../data/builtinContent';

/**
 * Odsetek wygranych nie może straszyć przy garstce partii.
 *
 * To najważniejsza liczba dla osoby układającej zasady: poza widełkami 60–75%
 * gra jest za łatwa albo za trudna. Ale przy jednej rozegranej partii wynik to
 * zawsze 0% albo 100%, przy dwóch — 0, 50 lub 100. Kafel świecił więc
 * ostrzeżeniem od pierwszej wygranej, a ktoś mógłby na tej podstawie ruszyć
 * próg wygranej — na podstawie liczby, która jeszcze nic nie znaczy.
 *
 * (Stan z produkcji w chwili pisania testu: jedna dokończona partia, jedna
 * wygrana — czyli dokładnie ten przypadek.)
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {} }));

let statystyki = {
  finished: 0,
  won: 0,
  missionsSolved: 0,
  tutorialsFinished: 0,
};

vi.mock('../firebase/playStats', () => ({
  loadPlayStats: async () => statystyki,
  EMPTY_STATS: { finished: 0, won: 0, missionsSolved: 0, tutorialsFinished: 0 },
}));

// Panel czeka na trzy źródła naraz — bez atrap pozostałych dwóch nigdy nie
// wychodzi ze stanu ładowania.
vi.mock('../firebase/reports', () => ({ loadReports: async () => [] }));
vi.mock('../firebase/discussions', () => ({ loadDiscussions: async () => [] }));

const { StatsPanel } = await import('./StatsPanel');

beforeEach(() => {
  statystyki = { finished: 0, won: 0, missionsSolved: 0, tutorialsFinished: 0 };
});

/** Czy kafel „Wygrane drużyny" jest wyróżniony jako ostrzeżenie. */
async function ostrzezenieNaKaflu(): Promise<boolean> {
  const etykieta = await screen.findByText('Wygrane drużyny');
  const kafel = etykieta.closest('div');
  // Ostrzeżenie maluje kafel kolorem uwagi — sprawdzamy sam styl, nie klasę,
  // żeby test nie pękał przy przemalowaniu panelu.
  const style = kafel?.getAttribute('style') ?? '';
  return style.includes('warn') || style.includes('--eter-danger') || style.includes('--eter-warn');
}

describe('StatsPanel — odsetek wygranych', () => {
  it('przy jednej partii nie straszy ostrzeżeniem, choć wynik to 100%', async () => {
    statystyki = { finished: 1, won: 1, missionsSolved: 3, tutorialsFinished: 5 };
    render(<StatsPanel content={BUILTIN_CONTENT} />);

    // Liczba nadal się pokazuje — po prostu bez alarmu.
    expect(await screen.findByText('100%')).toBeTruthy();
    expect(
      screen.getByText(/za mało, żeby coś z tego wnioskować/),
    ).toBeTruthy();
    expect(await ostrzezenieNaKaflu()).toBe(false);
  });

  it('przy dostatecznej liczbie partii wynik poza widełkami zapala ostrzeżenie', async () => {
    // 12 z 12 to 100% — gra ewidentnie za łatwa i teraz warto to pokazać.
    statystyki = { finished: 12, won: 12, missionsSolved: 40, tutorialsFinished: 5 };
    render(<StatsPanel content={BUILTIN_CONTENT} />);

    expect(await screen.findByText('100%')).toBeTruthy();
    expect(screen.getByText(/cel: 60–75%/)).toBeTruthy();
  });

  it('bez ani jednej dokończonej partii mówi wprost, że danych brak', async () => {
    render(<StatsPanel content={BUILTIN_CONTENT} />);

    expect(await screen.findByText('za mało partii')).toBeTruthy();
  });
});
