import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import { ALL_CARDS } from '../data/cards';
import { ALL_CHARACTERS } from '../data/characters';
import { ALL_PROBLEMS } from '../data/problems';
import { DEFAULT_FAMILIES } from '../data/families';
import { DEFAULT_THEME } from '../data/theme';
import { DEFAULT_UI_TEXT } from '../data/uiText';
import { DEFAULT_CONFIG } from '../engine/reducer';
import type { GameContent } from '../firebase/validate';

/**
 * Strefa Nudy — przebieg sesji.
 *
 * Sedno pomysłu: klikasz fiszki, a na końcu widzisz, ile i jak długo. Bez
 * zapisanego podsumowania cała zakładka jest tylko listą — Alan prosił o ślad,
 * że ktoś usiadł do porządków, widoczny dla całego zespołu.
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {} }));

const markChecked = vi.fn<(input: { itemId: string; verdict: string; author: string }) => Promise<{ ok: boolean }>>(
  async () => ({ ok: true }),
);
const saveSession = vi.fn<(input: { ok: number; fix: number; skip: number }) => Promise<{ ok: boolean }>>(
  async () => ({ ok: true }),
);
let sprawdzone: string[] = [];

vi.mock('../firebase/boredom', () => ({
  markChecked: (input: unknown) => markChecked(input as never),
  saveSession: (input: unknown) => saveSession(input as never),
  watchChecked: (cb: (ids: string[]) => void) => {
    cb(sprawdzone);
    return () => {};
  },
  watchSessions: (cb: (s: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
}));

const addReport = vi.fn<(input: { description: string; status: string }) => Promise<{ ok: boolean }>>(
  async () => ({ ok: true }),
);
vi.mock('../firebase/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/reports')>();
  return {
    ...actual,
    addReport: (input: unknown) => addReport(input as never),
    watchReports: (cb: (r: unknown[]) => void) => {
      cb([]);
      return () => {};
    },
  };
});

const { BoredomPanel } = await import('./BoredomPanel');

/** Treść z jedną kartą roboczą — daje dokładnie jedną fiszkę do przerobienia. */
const contentZRobocza = (): GameContent => {
  const cards = structuredClone(ALL_CARDS);
  cards[0].draft = true;
  return {
    cards,
    problems: structuredClone(ALL_PROBLEMS),
    characters: structuredClone(ALL_CHARACTERS),
    rules: { ...DEFAULT_CONFIG },
    text: { ...DEFAULT_UI_TEXT },
    theme: { ...DEFAULT_THEME },
    families: structuredClone(DEFAULT_FAMILIES),
  };
};

const renderPanel = (content = contentZRobocza()) =>
  render(
    <ToastProvider>
      <BoredomPanel content={content} role="admin" author="Alan" onOpen={() => {}} />
    </ToastProvider>,
  );

beforeEach(() => {
  markChecked.mockClear();
  saveSession.mockClear();
  addReport.mockClear();
  sprawdzone = [];
});

describe('Strefa Nudy', () => {
  it('pokazuje, ile rzeczy czeka, zanim zaczniesz', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: /Zacznij sesję/ })).toBeTruthy();
  });

  it('odhaczenie fiszki zapisuje werdykt i podbija licznik', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Zacznij sesję/ }));

    fireEvent.click(screen.getByRole('button', { name: 'W porządku' }));

    await waitFor(() => expect(markChecked).toHaveBeenCalledTimes(1));
    expect((markChecked.mock.calls[0][0] as { verdict: string }).verdict).toBe('ok');
    await screen.findByText('1 ok');
  });

  it('podsumowanie mówi ile i jak długo', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Zacznij sesję/ }));
    fireEvent.click(screen.getByRole('button', { name: 'W porządku' }));
    await waitFor(() => expect(markChecked).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Zakończ sesję' }));

    await screen.findByText(/Sesja zakończona/);
    // Sedno: liczba przerobionych rzeczy i czas — bez tego nie ma śladu pracy.
    expect(screen.getByText(/1 rzecz w /)).toBeTruthy();
    await waitFor(() => expect(saveSession).toHaveBeenCalledTimes(1));
  });

  it('pusta sesja nie zaśmieca historii zespołu', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Zacznij sesję/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Zakończ sesję' }));

    await screen.findByText(/Sesja zakończona/);
    // `saveSession` woła się, ale sama funkcja odrzuca pustą sesję — sprawdzamy
    // to w teście modułu. Tutaj pilnujemy, że panel nie wywala się na zerach.
    await waitFor(() => expect(saveSession).toHaveBeenCalled());
    const zapis = saveSession.mock.calls[0][0] as { ok: number; fix: number; skip: number };
    expect(zapis.ok + zapis.fix + zapis.skip).toBe(0);
  });

  it('komentarz przy „do poprawki" trafia jako zgłoszenie', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Zacznij sesję/ }));

    fireEvent.change(screen.getByLabelText(/Komentarz/), {
      target: { value: 'Opis karty jest za trudny dla ośmiolatka.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Do poprawki' }));

    await waitFor(() => expect(addReport).toHaveBeenCalledTimes(1));
    const zgloszenie = addReport.mock.calls[0][0] as { description: string; status: string };
    expect(zgloszenie.description).toContain('za trudny');
    // Zgłoszenie ze Strefy Nudy przechodzi normalny obieg akceptacji.
    expect(zgloszenie.status).toBe('pending');
  });

  it('„do poprawki" bez komentarza nie zakłada pustego zgłoszenia', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Zacznij sesję/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Do poprawki' }));

    await waitFor(() => expect(markChecked).toHaveBeenCalled());
    expect(addReport).not.toHaveBeenCalled();
  });
});
