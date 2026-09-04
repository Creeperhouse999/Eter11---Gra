import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { PrintCards } from './PrintCards';

/**
 * Wydruk musi wystarczyć do gry przy stole.
 *
 * Adam zgłosił to jako krytyczne: „celem tej zakładki jest możliwość druku
 * kart, abym fizycznie mógł wydrukować i zagrać w tę grę ze wspólnikami".
 * Wydruk, na którym brakuje problemów albo postaci, jest do niczego — nie da
 * się rozegrać partii, a to jedyny powód istnienia tej zakładki.
 *
 * Stąd te testy pilnują KOMPLETNOŚCI talii i tego, że karta niesie wszystko,
 * co potrzebne do rozstrzygnięcia ruchu bez zaglądania do ekranu.
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {} }));

describe('wydruk zawiera wszystko, z czego składa się gra', () => {
  it('drukuje też problemy — bez nich nie ma czego rozwiązywać', () => {
    render(<PrintCards content={BUILTIN_CONTENT} />);

    // Nazwa pierwszego problemu musi pojawić się na wydruku.
    const problem = BUILTIN_CONTENT.problems[0];
    expect(screen.getAllByText(problem.name).length).toBeGreaterThan(0);
  });

  it('drukuje karty postaci — każdy gracz bierze jedną na start', () => {
    render(<PrintCards content={BUILTIN_CONTENT} />);

    const postac = BUILTIN_CONTENT.characters[0];
    expect(screen.getAllByText(postac.name).length).toBeGreaterThan(0);
  });

  it('karta problemu niesie wymagania z podpowiedziami', () => {
    render(<PrintCards content={BUILTIN_CONTENT} />);

    const problem = BUILTIN_CONTENT.problems[0];
    const karta = screen.getAllByText(problem.name)[0].closest('article');
    expect(karta).not.toBeNull();

    // Bez podpowiedzi gracze nie wiedzą, jakiej karty szukać do ścianki.
    for (const slot of problem.slots) {
      expect(within(karta as HTMLElement).getByText(slot.hint)).toBeTruthy();
    }
  });

  it('karta problemu rozkłada wymagania tak, jak prosił Adam', () => {
    // Psychologiczna po lewej, cyfrowa po prawej, społeczna na dole,
    // talent w lewym górnym rogu, mentor w prawym górnym. Ten układ ma
    // odpowiadać ekranowi, żeby gra przy stole wyglądała tak samo.
    render(<PrintCards content={BUILTIN_CONTENT} />);

    const problem = BUILTIN_CONTENT.problems[0];
    const karta = screen.getAllByText(problem.name)[0].closest('article');
    const strefy = within(karta as HTMLElement).getAllByTestId(/^slot-/);

    const pozycje = strefy.map((el) => el.getAttribute('data-testid'));
    // Każda ścianka problemu ma swoje miejsce — nie wrzucone byle gdzie.
    for (const slot of problem.slots) {
      expect(pozycje).toContain(`slot-${slot.key}`);
    }
  });

  it('karta kompetencji ma obramowanie w kolorze swojej rodziny', () => {
    // Adam: „karty muszą mieć wszystkie informacje łącznie z kolorem
    // i kategorią". Na czarno-białym wydruku nie da się odróżnić rodzin,
    // a kolor decyduje o tym, czy karta pasuje do ścianki.
    render(<PrintCards content={BUILTIN_CONTENT} />);

    const zRodzina = BUILTIN_CONTENT.cards.find((c) => c.family && !c.draft);
    expect(zRodzina).toBeDefined();

    const karta = screen.getAllByText(zRodzina!.name)[0].closest('article');
    const styl = (karta as HTMLElement).getAttribute('style') ?? '';
    // Kolor rodziny wchodzi stylem (zmienne CSS nie działają na wydruku).
    expect(styl).toMatch(/border-color/);
  });

  it('liczba kart w opisie zgadza się z tym, co widać', () => {
    // Adam pytał wprost, czy opis się aktualizuje. Liczba wpisana na sztywno
    // rozjeżdża się przy pierwszej zmianie treści.
    render(<PrintCards content={BUILTIN_CONTENT} />);

    const naEkranie = document.querySelectorAll('article').length;
    const przycisk = screen.getByRole('button', { name: /Drukuj \(\d+/ });
    const zPrzycisku = Number(przycisk.textContent?.match(/\d+/)?.[0]);

    expect(zPrzycisku).toBe(naEkranie);
  });
});

describe('karta postaci pokazuje, gdzie kłaść zbierane karty', () => {
  it('ma pola na wszystkie pięć kategorii', () => {
    // Adam: „aby karty postaci miały wizualizacje, które będą informowały
    // gracza o tym, gdzie położyć karty, które będzie zbierał". Bez tego
    // gracz przy stole nie wie, gdzie odkładać zdobycze.
    render(<PrintCards content={BUILTIN_CONTENT} />);

    const postac = BUILTIN_CONTENT.characters[0];
    const karta = screen.getAllByText(postac.name)[0].closest('article')!;

    for (const klucz of ['psychological', 'digital', 'social', 'talent', 'mentor']) {
      expect(within(karta).getByTestId(`mat-${klucz}`)).toBeTruthy();
    }
  });

  it('układ pól jest ten sam co na karcie problemu', () => {
    // Ten sam porządek na obu kartach: gracz uczy się go raz.
    render(<PrintCards content={BUILTIN_CONTENT} />);

    const postac = BUILTIN_CONTENT.characters[0];
    const karta = screen.getAllByText(postac.name)[0].closest('article')!;

    const klasy = (klucz: string) =>
      within(karta).getByTestId(`mat-${klucz}`).className;

    expect(klasy('talent')).toContain('col-start-1');
    expect(klasy('mentor')).toContain('col-start-3');
    expect(klasy('psychological')).toContain('col-start-1');
    expect(klasy('digital')).toContain('col-start-3');
    expect(klasy('social')).toContain('col-start-2');
  });

  it('karta postaci jest duża jak karta problemu', () => {
    // Adam prosił wprost: „niech karty postaci będą wielkości kart problemów".
    // Pola na pięć kategorii nie zmieszczą się na małej karcie.
    render(<PrintCards content={BUILTIN_CONTENT} />);

    const postac = BUILTIN_CONTENT.characters[0];
    const karta = screen.getAllByText(postac.name)[0].closest('article')!;
    expect(karta.className).toContain('col-span-2');
  });

  it('karta postaci ma własny kolor, inny niż karty kompetencji', () => {
    // Adam: „zrób kartę postaci w innym kolorze". Na stole ma się od razu
    // odróżniać od kart, które się na niej kładzie.
    render(<PrintCards content={BUILTIN_CONTENT} />);

    const postac = BUILTIN_CONTENT.characters[0];
    const karta = screen.getAllByText(postac.name)[0].closest('article')!;
    expect(karta.getAttribute('style')).toMatch(/border-color/);
  });

  it('ETER11 jest fioletowy, Czarny Łabędź zostaje czarny', () => {
    // Adam: „karty eter — zrób je na fioletowo", „karty łabędzia — niech
    // pozostaną czarne". Kolor odróżnia je od siebie na wydruku.
    render(<PrintCards content={BUILTIN_CONTENT} />);

    // Przeglądarka zapisuje kolor jako rgb, nie jako zapis szesnastkowy —
    // porównujemy więc wartość, nie sposób jej zapisu.
    const eter = BUILTIN_CONTENT.cards.find((c) => c.category === 'eter11')!;
    const kartaEter = screen.getAllByText(eter.description)[0].closest('article')!;
    expect(kartaEter.getAttribute('style')).toContain('rgb(124, 58, 237)');

    const labedz = BUILTIN_CONTENT.cards.find((c) => c.category === 'blackswan')!;
    const kartaLabedz = screen.getAllByText(labedz.description)[0].closest('article')!;
    expect(kartaLabedz.getAttribute('style')).toContain('rgb(0, 0, 0)');
  });

  it('kliknięcie problemu i postaci prowadzi do edycji', () => {
    // Adam: „abym mógł klikać w karty problemów i postaci i być przeniesionym
    // do edycji — tak samo jak z kartami kompetencji".
    const onEdit = vi.fn();
    const onEditProblem = vi.fn();
    const onEditCharacter = vi.fn();
    render(
      <PrintCards
        content={BUILTIN_CONTENT}
        onEdit={onEdit}
        onEditProblem={onEditProblem}
        onEditCharacter={onEditCharacter}
      />,
    );

    const problem = BUILTIN_CONTENT.problems[0];
    fireEvent.click(screen.getAllByText(problem.name)[0].closest('article')!);
    expect(onEditProblem).toHaveBeenCalledWith(problem.id);

    const postac = BUILTIN_CONTENT.characters[0];
    fireEvent.click(screen.getAllByText(postac.name)[0].closest('article')!);
    expect(onEditCharacter).toHaveBeenCalledWith(postac.name);
  });
});
