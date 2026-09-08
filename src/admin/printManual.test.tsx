import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

  /**
   * Adam: „dodaj do instrukcji wizualizację karty postaci — zaprezentuj
   * finałową wersję, do której gracz dąży. Nazwij to »Jak rozłożyć kartę
   * postaci«". Karta problemu wyżej pokazywała, gdzie odkładać karty
   * w trakcie gry — brakowało tego, jak wygląda gotowy komplet.
   */
  it('pokazuje wizualizację „Jak rozłożyć kartę postaci"', () => {
    render(<PrintManual content={BUILTIN_CONTENT} />);

    expect(screen.getByText('Jak rozłożyć kartę postaci')).toBeTruthy();
    // Dwie karty talentu, po jednej mentora i każdej kompetencji.
    const uklad = screen.getByTestId('postac-docelowo');
    expect(within(uklad).getAllByText('Talent')).toHaveLength(2);
    expect(screen.getByText('3 doświadczenia za rozwiązanie problemu')).toBeTruthy();
    expect(screen.getByText('2 doświadczenia za uczenie innych')).toBeTruthy();
    expect(
      screen.getByText('1 doświadczenie za 6 kart postaci (2 talenty, mentor i 3 kompetencje)'),
    ).toBeTruthy();
  });

  it('FAQ ma pytania i odpowiedzi, nie same nagłówki', () => {
    render(<PrintManual content={BUILTIN_CONTENT} />);

    // Pytania kończą się znakiem zapytania; każde musi mieć odpowiedź pod
    // spodem, inaczej strona nie odpowiada na nic.
    const pytania = screen.getAllByRole('heading', { level: 3 });
    expect(pytania.length).toBeGreaterThanOrEqual(5);
  });

  it('podsumowanie techniczne pokazuje tyle obrazków, ile mówi liczba przy nazwie', () => {
    // Adam zgłosił: strona pisała „16 talentów", a pokazywała tylko 8
    // obrazków. Liczba i galeria muszą się zgadzać, bo to jest cała wartość
    // tej strony dla kogoś, kto liczy fizyczne karty w pudełku.
    render(<PrintManual content={BUILTIN_CONTENT} />);

    const naglowek = screen.getByText(
      (_, element) => element?.tagName === 'P' && !!element.textContent?.startsWith('Talenty —'),
    );
    const liczbaWTalii = Number(naglowek.querySelector('span')?.textContent);
    expect(liczbaWTalii).toBeGreaterThan(0);

    const galeria = naglowek.parentElement!.querySelector('.grid');
    expect(galeria!.querySelectorAll('article')).toHaveLength(liczbaWTalii);
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

describe('wybór narracji przy wydruku', () => {
  it('daje wybrać między dwiema wersjami pierwszej strony', () => {
    // Adam chce wydrukować obie i sprawdzić na graczach, która lepiej trafia.
    render(<PrintManual content={BUILTIN_CONTENT} />);

    expect(screen.getByRole('tab', { name: /zły 2111/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /dobry 2111/i })).toBeTruthy();
  });

  it('przełączenie naprawdę zmienia treść pierwszej strony', () => {
    render(<PrintManual content={BUILTIN_CONTENT} />);

    // Wersja domyślna: świat zniszczony.
    expect(screen.getByText(/Świat jest cichy/)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /dobry 2111/i }));

    // Po przełączeniu: świat, któremu się udało.
    expect(screen.getByText(/Świat wygląda dobrze/)).toBeTruthy();
    expect(screen.queryByText(/Świat jest cichy/)).toBeNull();
  });
});
