import { describe, it, expect } from 'vitest';
import { ALL_CARDS, buildDeck, playableCards } from './cards';

/**
 * Ile kart ETER11 i Czarnych Łabędzi jest w talii.
 *
 * Marcin zgłosił: „w ciągu jednej gry przy 7 problemach jeden z graczy dostał
 * 4 razy kartę ETER11, a drugi ani razu". Adam doprecyzował, czego chce:
 * „na całą talię kart ustalmy, że są 4 karty eter i 4 karty Czarny Łabędź" —
 * czyli tak jak w fizycznym pudełku, gdzie liczba kart jest policzalna
 * i stała.
 *
 * Wcześniej karty specjalne były pojedyncze (2 ETER11, 3 Łabędzie), podczas
 * gdy zwykłe szły w dwóch egzemplarzach. Przy takiej proporcji trafienie
 * ETER11 zależało wyłącznie od szczęścia w tasowaniu.
 *
 * Liczba jest ustawieniem gry, nie stałą w kodzie: zespół zmienia balans
 * w panelu, a nie zgłoszeniem do programisty.
 */

describe('karty specjalne w talii', () => {
  it('ETER11 i Czarny Łabędź mają po tyle kopii, ile mówią zasady', () => {
    const grywalne = playableCards(ALL_CARDS);
    const talia = buildDeck(grywalne, { specialCopies: 4 });

    expect(talia.filter((c) => c.category === 'eter11')).toHaveLength(4);
    expect(talia.filter((c) => c.category === 'blackswan')).toHaveLength(4);
  });

  it('kopie mają różne identyfikatory — inaczej to jedna karta, nie cztery', () => {
    // Silnik rozpoznaje karty po `id`. Cztery kopie z tym samym id zachowałyby
    // się jak jedna: zagranie jednej „zużyłoby" pozostałe.
    const talia = buildDeck(playableCards(ALL_CARDS), { specialCopies: 4 });
    const eter = talia.filter((c) => c.category === 'eter11');

    expect(new Set(eter.map((c) => c.id)).size).toBe(eter.length);
  });

  it('zmiana liczby w zasadach zmienia talię — bez ruszania kodu', () => {
    const dwie = buildDeck(playableCards(ALL_CARDS), { specialCopies: 2 });
    const szesc = buildDeck(playableCards(ALL_CARDS), { specialCopies: 6 });

    expect(dwie.filter((c) => c.category === 'eter11')).toHaveLength(2);
    expect(szesc.filter((c) => c.category === 'eter11')).toHaveLength(6);
  });

  it('bez podanej liczby talia wygląda jak dotąd — stare wywołania działają', () => {
    // `buildDeck` woła też wydruk i testy silnika; brak ustawienia nie może
    // zmienić im talii pod nogami.
    const domyslna = buildDeck(playableCards(ALL_CARDS));
    const zwykle = playableCards(ALL_CARDS).filter(
      (c) => c.category !== 'eter11' && c.category !== 'blackswan',
    );

    expect(domyslna.filter((c) => c.category === 'eter11').length).toBeGreaterThan(0);
    // Zwykłe karty dalej po dwie sztuki.
    expect(domyslna.filter((c) => c.category !== 'eter11' && c.category !== 'blackswan'))
      .toHaveLength(zwykle.length * 2);
  });

  it('zero kopii usuwa karty specjalne z talii, zamiast wywracać budowanie', () => {
    // Ktoś może chcieć zagrać bez jokerów — to ustawienie, nie błąd.
    const bez = buildDeck(playableCards(ALL_CARDS), { specialCopies: 0 });

    expect(bez.filter((c) => c.category === 'eter11')).toHaveLength(0);
    expect(bez.length).toBeGreaterThan(0);
  });
});
