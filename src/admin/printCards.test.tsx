import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ALL_CARDS, buildDeck, playableCards } from '../data/cards';
import { ALL_CHARACTERS } from '../data/characters';
import { ALL_PROBLEMS } from '../data/problems';
import { DEFAULT_FAMILIES } from '../data/families';
import { DEFAULT_THEME } from '../data/theme';
import { DEFAULT_UI_TEXT } from '../data/uiText';
import { DEFAULT_CONFIG } from '../engine/reducer';
import type { GameContent } from '../firebase/validate';
import { PrintCards } from './PrintCards';

const content = (): GameContent => ({
  cards: structuredClone(ALL_CARDS),
  problems: structuredClone(ALL_PROBLEMS),
  characters: structuredClone(ALL_CHARACTERS),
  rules: { ...DEFAULT_CONFIG },
  text: { ...DEFAULT_UI_TEXT },
  theme: { ...DEFAULT_THEME },
  families: structuredClone(DEFAULT_FAMILIES),
});

/**
 * Czy akapit z opisem podaje tę liczbę kart.
 *
 * Tekst jest rozbity na kilka węzłów przez interpolację, więc szukamy po całej
 * treści akapitu, nie po dopasowaniu jednego węzła.
 */
function opisMowiO(ile: number): boolean {
  return screen
    .getAllByText((_t, el) => (el?.textContent ?? '').startsWith('Wszystko, czego trzeba'))
    .some((el) => (el.textContent ?? '').includes(`${ile} kart`));
}

describe('PrintCards', () => {
  it('drukuje dokładnie tyle kart, ile buduje silnik gry (draft pominięte, kompetencje x2)', () => {
    const c = content();
    render(<PrintCards content={c} />);
    const expected = buildDeck(playableCards(c.cards));
    // Wydruk to CAŁE pudełko: kompetencje plus problemy i postacie. Adam
    // zgłosił jako krytyczne, że bez nich nie da się rozegrać partii na
    // papierze — a to jedyny powód istnienia tej zakładki.
    const razem = expected.length + c.problems.length + c.characters.length;
    expect(screen.getByRole('button', { name: `Drukuj (${razem} kart)` })).toBeTruthy();
    expect(document.querySelectorAll('article')).toHaveLength(razem);
  });

  it('pomija karty oznaczone jako robocze (draft)', () => {
    const c = content();
    // Regresja: karta draft nie może trafić do fizycznej talii — panel mówi
    // redaktorowi wprost, że wersje robocze „nie trafiają do gry", więc
    // wydruk musi trzymać tę samą obietnicę.
    const draftCard = c.cards.find((card) => card.draft);
    expect(draftCard, 'fixture ma zawierać co najmniej jedną kartę draft').toBeTruthy();
    render(<PrintCards content={c} />);
    expect(screen.queryByText(draftCard!.name)).toBeNull();
  });

  it('karty specjalne (ETER11) nie są podwajane, w przeciwieństwie do kompetencji', () => {
    // Licznik po opisie, nie po nazwie: nazwa karty „ETER11” koliduje z
    // etykietą kategorii (też „ETER11”), która w tym samym article ma
    // osobny akapit — liczenie po nazwie złapałoby oba i podwoiło wynik.
    const c = content();
    render(<PrintCards content={c} />);
    const description = 'Super Mentor. Zastępuje dowolną kartę potrzebną do rozwiązania problemu.';
    const expectedCount = c.cards.filter((card) => card.description === description).length;
    expect(expectedCount).toBeGreaterThan(0);
    expect(screen.getAllByText(description)).toHaveLength(expectedCount);
  });

  /**
   * Alan zapytał wprost: „czy drukuj karty się aktualizuje? opis mówi 107 kart,
   * jak zmienimy to się zmieni?". Odpowiedź musi być sprawdzalna, nie
   * deklaratywna — liczba w opisie i na przycisku ma iść z tej samej talii, co
   * karty niżej, a nie z wartości wpisanej kiedyś na sztywno.
   */
  it("liczba w opisie rośnie po dodaniu karty w panelu", () => {
    const przed = content();
    const { unmount } = render(<PrintCards content={przed} />);
    const bazowa = buildDeck(playableCards(przed.cards)).length;
    // Opis i przycisk osobno: gdy jedno z nich ma liczbę wpisaną na sztywno,
    // drugie i tak liczy poprawnie i test by tego nie zauważył.
    expect(opisMowiO(bazowa)).toBe(true);
    const razemPrzed = bazowa + przed.problems.length + przed.characters.length;
    expect(screen.getByRole("button", { name: `Drukuj (${razemPrzed} kart)` })).toBeTruthy();
    unmount();

    // Redaktor dodaje kartę kompetencji — do talii wchodzi w dwóch
    // egzemplarzach, tak samo jak w grze.
    const po = content();
    po.cards.push({ ...po.cards.find((c) => c.category === "psychological")!, id: "nowa-testowa" });
    render(<PrintCards content={po} />);

    const oczekiwana = buildDeck(playableCards(po.cards)).length;
    expect(oczekiwana).toBe(bazowa + 2);
    expect(opisMowiO(oczekiwana)).toBe(true);
    const razemPo = oczekiwana + po.problems.length + po.characters.length;
    expect(screen.getByRole("button", { name: `Drukuj (${razemPo} kart)` })).toBeTruthy();
  });

  /**
   * Kliknięcie karty w liście wydruku przenosi do jej edycji.
   *
   * Regresja: lista w „Drukuj karty” była czysto do oglądania — kliknięcie
   * karty nie robiło nic, więc poprawienie literówki czy złej grafiki
   * wymagało ręcznego odszukania tej samej karty w zakładce „Karty".
   */
  it('kliknięcie karty woła onEdit z jej nazwą', () => {
    const c = content();
    const onEdit = vi.fn();
    render(<PrintCards content={c} onEdit={onEdit} />);

    const jakasKarta = c.cards.find((card) => !card.draft)!;
    const article = screen.getAllByText(jakasKarta.name)[0].closest('article')!;
    fireEvent.click(article);

    expect(onEdit).toHaveBeenCalledWith(jakasKarta.name);
  });
});
