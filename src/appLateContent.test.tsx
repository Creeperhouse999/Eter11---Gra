import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

/**
 * Spóźniona odpowiedź bazy nie może przepadać.
 *
 * Gra startuje na kartach wbudowanych, a treść z Firestore dochodzi w tle.
 * Po pięciu sekundach pokazujemy „Baza nie odpowiada…" — i tu był błąd:
 * ten sam znacznik, który gasił komunikat, blokował też PÓŹNIEJSZE dojście
 * danych. Na wolnym łączu (telefon w szkole, słaby zasięg) baza odpowiadała
 * po sześciu sekundach, a jej treść była wyrzucana do kosza: redaktor zmieniał
 * kartę w panelu, dziecko grało starą wersją mimo że dane dotarły.
 *
 * Limit czasu ma tylko UPRZEDZAĆ gracza, nie zamykać drzwi.
 */

const loadContent = vi.fn();

vi.mock('./firebase/content', () => ({
  loadContent: () => loadContent(),
}));

// GameApp renderuje całą grę — w tym teście liczy się tylko to, jaką treść
// dostaje, więc podmieniamy go na atrapę wypisującą nazwę pierwszej karty.
vi.mock('./ui/GameApp', () => ({
  GameApp: ({ content, notice }: { content: { cards: { name: string }[] }; notice: string | null }) => (
    <div>
      <span data-testid="pierwsza-karta">{content.cards[0]?.name ?? '(brak)'}</span>
      <span data-testid="komunikat">{notice ?? ''}</span>
    </div>
  ),
}));

vi.mock('./data/theme', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./data/theme')>();
  return { ...actual, applyTheme: vi.fn(), setThemeOverrides: vi.fn(), baseTheme: actual.baseTheme };
});

const { default: App, BUILTIN_CONTENT } = await import('./App');

beforeEach(() => {
  loadContent.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('App — spóźniona odpowiedź bazy', () => {
  it('treść, która przyszła PO limicie czasu, i tak trafia do gry', async () => {
    // Baza odpowiada dopiero po sześciu sekundach — dłużej niż pięciosekundowy
    // limit, po którym gracz dostaje komunikat.
    let resolveLoad: (value: unknown) => void = () => {};
    loadContent.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );

    render(<App />);

    // Zanim baza odpowie — gramy na kartach wbudowanych.
    expect(screen.getByTestId('pierwsza-karta').textContent).toBe(
      BUILTIN_CONTENT.cards[0].name,
    );

    // Mija limit: gracz dowiaduje się, że baza milczy.
    await act(async () => {
      vi.advanceTimersByTime(5100);
    });
    expect(screen.getByTestId('komunikat').textContent).toMatch(/nie odpowiada/i);

    // ...a sekundę później baza jednak odpowiada nowszą treścią.
    const nowsza = {
      ...BUILTIN_CONTENT,
      cards: [{ ...BUILTIN_CONTENT.cards[0], name: 'Nowa karta z bazy' }],
    };
    await act(async () => {
      resolveLoad({ content: nowsza, reason: 'ok', warning: null });
      await Promise.resolve();
    });

    // Sedno: dane dotarły, więc gra ma z nich korzystać — a komunikat
    // o milczącej bazie przestaje być prawdą i znika.
    expect(screen.getByTestId('pierwsza-karta').textContent).toBe('Nowa karta z bazy');
    expect(screen.getByTestId('komunikat').textContent).toBe('');
  });
});
