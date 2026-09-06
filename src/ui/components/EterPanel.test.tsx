import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { GameState, MissionState, Problem } from '../../engine/types';
import { odblokuj, zablokuj } from '../aiUnlock';

/**
 * Okno ETER — to, co gracz naprawdę klika.
 *
 * `narrator.test.ts` sprawdza zdania, `aiUnlock.test.ts` kod. Brakowało testu
 * na sam komponent: czy zwinięte okno mówi, co się dzieje; czy kliknięcie je
 * rozwija; czy pytanie z listy dostaje odpowiedź; i — najważniejsze dla
 * kosztów — czy model NIE jest wołany, dopóki nikt nie wpisał kodu w menu.
 * Alan przy tym zgłoszeniu napisał „Koszty… i jeszcze raz koszty…"; ten test
 * pilnuje, żeby ta obietnica nie zniknęła przy kolejnej zmianie.
 */

const zapytajEter = vi.fn(async (_pytanie: string, _stan?: unknown) => ({
  ok: true,
  tekst: 'Odpowiedź z modelu.',
}));
vi.mock('../../firebase/eterAi', () => ({
  zapytajEter: (pytanie: string, stan?: unknown) => zapytajEter(pytanie, stan),
}));

const { EterPanel } = await import('./EterPanel');

function problem(): Problem {
  return {
    id: 'p1',
    name: 'Zły robot w szkole',
    story: '',
    antagonist: '',
    consequence: '',
    goal: '',
    type: 'action',
    icon: 'warning',
    slots: [{ key: 'psychological', family: 'red', hint: '' }],
  } as Problem;
}

function stan(over: Partial<GameState> = {}): GameState {
  return {
    rng: 1,
    config: { roundsPerMission: 3 } as GameState['config'],
    players: [{ id: 'a', name: 'Adam' }, { id: 'b', name: 'Marcin' }] as GameState['players'],
    activePlayerIndex: 0,
    drawPile: [],
    discardPile: [],
    problemPile: [],
    solvedProblems: [],
    unsolvedProblems: [],
    unsolvedSince: {},
    missionNumber: 0,
    phase: 'mission',
    log: [],
    mission: {
      problems: [problem()],
      played: [],
      round: 1,
      phase: 'play',
      matUsedBy: [],
      activeBlackSwans: [],
      slotsFilledBeforeDoubling: [],
      takenToMat: [],
    } as unknown as MissionState,
    ...over,
  } as GameState;
}

beforeEach(() => {
  zablokuj();
  zapytajEter.mockClear();
});

describe('okno ETER — zwinięte', () => {
  it('mówi od razu, czyj ruch, i otwiera się kliknięciem', () => {
    render(<EterPanel state={stan()} viewerId="b" />);

    // Zwinięte: jeden przycisk z komentarzem, bez listy pytań.
    expect(screen.getByRole('button', { name: 'Otwórz okno ETER' })).toBeTruthy();
    expect(screen.getByText(/Adam ma ruch/)).toBeTruthy();
    expect(screen.queryByText('Jak zagrać kartę?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Otwórz okno ETER' }));

    expect(screen.getByRole('dialog', { name: /ETER11/ })).toBeTruthy();
    expect(screen.getByText('Jak zagrać kartę?')).toBeTruthy();
  });

  it('gracz przy swojej turze słyszy „Ty masz ruch"', () => {
    render(<EterPanel state={stan()} viewerId="a" />);
    expect(screen.getByText(/Ty masz ruch/)).toBeTruthy();
  });
});

describe('okno ETER — pytania o zasady', () => {
  it('pytanie z listy dostaje gotową odpowiedź bez wołania modelu', () => {
    render(<EterPanel state={stan()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Otwórz okno ETER' }));
    fireEvent.click(screen.getByText('Co robi karta ETER11?'));

    expect(screen.getByText(/pasuje do każdej ścianki/)).toBeTruthy();
    expect(zapytajEter).not.toHaveBeenCalled();
  });

  it('pytanie własnymi słowami trafia w zasadę po słowie kluczowym', () => {
    render(<EterPanel state={stan()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Otwórz okno ETER' }));
    fireEvent.change(screen.getByLabelText('Pytanie do ETER'), {
      target: { value: 'co to czarny łabędź' },
    });
    fireEvent.click(screen.getByText('Pytaj'));

    expect(screen.getByText(/utrudnienie/)).toBeTruthy();
    expect(zapytajEter).not.toHaveBeenCalled();
  });

  /**
   * Sedno kosztów: bez kodu z menu model NIE jest wołany — nawet na pytanie,
   * którego lista zasad nie zna. Gracz dostaje wtedy szczere „nie znam".
   */
  it('nieznane pytanie BEZ odblokowania nie woła modelu i mówi „nie znam"', async () => {
    render(<EterPanel state={stan()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Otwórz okno ETER' }));
    fireEvent.change(screen.getByLabelText('Pytanie do ETER'), {
      target: { value: 'jaka jest stolica Francji' },
    });
    fireEvent.click(screen.getByText('Pytaj'));

    expect(await screen.findByText(/Nie znam odpowiedzi/)).toBeTruthy();
    expect(zapytajEter).not.toHaveBeenCalled();
  });

  it('nieznane pytanie PO odblokowaniu idzie do modelu i pokazuje odpowiedź', async () => {
    odblokuj('ZanklodVanWriter');
    render(<EterPanel state={stan()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Otwórz okno ETER' }));
    fireEvent.change(screen.getByLabelText('Pytanie do ETER'), {
      target: { value: 'jaka jest stolica Francji' },
    });
    fireEvent.click(screen.getByText('Pytaj'));

    expect(await screen.findByText('Odpowiedź z modelu.')).toBeTruthy();
    expect(zapytajEter).toHaveBeenCalledTimes(1);
    // Wskaźnik czekania musi zgasnąć — inaczej gracz myśli, że ETER wciąż myśli.
    await waitFor(() => expect(screen.queryByText(/zastanawia/)).toBeNull());
  });

  it('awaria modelu kończy się zdaniem, nie wiecznym „zastanawia się"', async () => {
    odblokuj('ZanklodVanWriter');
    zapytajEter.mockRejectedValueOnce(new Error('sieć'));
    render(<EterPanel state={stan()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Otwórz okno ETER' }));
    fireEvent.change(screen.getByLabelText('Pytanie do ETER'), {
      target: { value: 'coś spoza listy' },
    });
    fireEvent.click(screen.getByText('Pytaj'));

    expect(await screen.findByText(/Nie mogę teraz odpowiedzieć/)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(/zastanawia/)).toBeNull());
  });
});
