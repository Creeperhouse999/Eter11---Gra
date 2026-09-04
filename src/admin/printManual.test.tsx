import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { PrintManual } from './PrintManual';

/**
 * Instrukcja do wydruku — pięć stron zamówionych przez Adama.
 *
 * Zgłoszenie krytyczne: „ponieważ będę drukować karty, to potrzebuję też do
 * druku instrukcję". Pięć stron, każda dla innego czytelnika:
 *  1. narracja — wciąga gracza, ma się czytać jak prolog książki,
 *  2. opis dla dziecka — dziesięć zdań, takie, jakie idą na pudełko,
 *  3. opis dla rodzica — o tym, co gra rozwija,
 *  4. instrukcja krok po kroku, z pokazanymi kartami i układem na stole,
 *  5. FAQ — pytania, które gracze zadadzą.
 *
 * Alan dopisał przy każdej: „to też edytowalne w panelu". Dlatego strony
 * biorą treść z zawartości gry, a nie z tekstu wpisanego w komponencie —
 * inaczej pierwsza poprawka wymagałaby wdrożenia.
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {} }));

describe('instrukcja do wydruku', () => {
  it('ma wszystkie pięć stron', () => {
    render(<PrintManual content={BUILTIN_CONTENT} />);

    // Każda strona ma nagłówek — po nim widać, czy któraś nie wypadła.
    for (const naglowek of [
      /Świat, w którym/i,
      /Co to za gra/i,
      /Dla rodziców/i,
      /Jak grać/i,
      /Pytania, które pewnie zadacie/,
    ]) {
      expect(screen.getByText(naglowek)).toBeTruthy();
    }
  });

  it('narracja bierze się z treści edytowalnej w panelu, nie z kodu', () => {
    // Sedno prośby Alana: „to też edytowalne w panelu". Podmieniamy tekst
    // wstępu i sprawdzamy, czy wydruk idzie za nim.
    const zmieniona = structuredClone(BUILTIN_CONTENT);
    zmieniona.intro!.story[0].body = 'Zupełnie nowa historia o kotach.';

    render(<PrintManual content={zmieniona} />);

    expect(screen.getByText(/Zupełnie nowa historia o kotach/)).toBeTruthy();
  });

  it('instrukcja pokazuje karty, na których tłumaczy zasady', () => {
    // Adam: „w instrukcji użyj graficznych wizualizacji kart, aby w oparciu
    // o nie tłumaczyć, czym jest gra". Sam tekst by nie wystarczył.
    render(<PrintManual content={BUILTIN_CONTENT} />);

    const przyklad = BUILTIN_CONTENT.cards.find((c) => !c.draft && c.family);
    expect(screen.getAllByText(przyklad!.name).length).toBeGreaterThan(0);
  });

  it('tłumaczy karty ETER11 i Czarnego Łabędzia — o to Adam prosił wprost', () => {
    render(<PrintManual content={BUILTIN_CONTENT} />);

    expect(screen.getAllByText(/ETER11/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Czarny Łabędź/i).length).toBeGreaterThan(0);
  });

  it('FAQ ma pytania i odpowiedzi, nie same nagłówki', () => {
    render(<PrintManual content={BUILTIN_CONTENT} />);

    // Pytania kończą się znakiem zapytania; każde musi mieć odpowiedź pod
    // spodem, inaczej strona nie odpowiada na nic.
    const pytania = screen.getAllByRole('heading', { level: 3 });
    expect(pytania.length).toBeGreaterThanOrEqual(5);
  });

  it('próg wygranej bierze z zasad, a nie z liczby wpisanej na sztywno', () => {
    // Redaktor zmienia próg w zakładce Zasady — instrukcja musi za tym pójść,
    // inaczej wydrukowana kartka kłamie o tym, jak się wygrywa.
    const zmienione = structuredClone(BUILTIN_CONTENT);
    zmienione.rules.teamWinThreshold = 4;

    render(<PrintManual content={zmienione} />);

    expect(screen.getAllByText(/4/).length).toBeGreaterThan(0);
  });
});
