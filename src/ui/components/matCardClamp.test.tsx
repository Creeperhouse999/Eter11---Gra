import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Długa nazwa karty na karcie postaci ma być przycięta z wielokropkiem.
 *
 * Slot na macie ma kilkadziesiąt pikseli, a nazwa karty do sześćdziesięciu
 * znaków — bez przycięcia rozlewa się na kilka wierszy i wychodzi poza obrys.
 * Służy do tego `line-clamp`, ale on działa WYŁĄCZNIE przy
 * `display:-webkit-box`, który sam sobie ustawia.
 *
 * Pułapka: obok stało `sm:block`. Obie klasy mają tę samą specyficzność, więc
 * decyduje kolejność w WYGENEROWANYM CSS — a tam `sm:block` wypadał później
 * i nadpisywał `display`, przez co przycinanie było martwe, a nazwa ucinała
 * się w połowie wiersza bez wielokropka. Kolejność klas w atrybucie `class`
 * nie ma z tym nic wspólnego, więc samo „poprawienie" ich zapisu by nie
 * pomogło. Stąd ten test: pilnuje, żeby `sm:block` nie wrócił obok
 * `line-clamp`.
 */

const PLIK = 'src/ui/components/PlayerMat.tsx';

describe('nazwa karty na macie', () => {
  it('nie łączy line-clamp z display:block w tym samym elemencie', () => {
    const zrodlo = readFileSync(PLIK, 'utf8');

    // Patrzymy WYŁĄCZNIE na zawartość atrybutów `className` — inaczej test
    // łapałby własne komentarze tłumaczące, czemu tych klas nie łączymy.
    const klasy = [...zrodlo.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);

    // Szukamy elementów, które mają JEDNOCZEŚNIE obie klasy — to właśnie
    // ten przypadek psuje przycinanie.
    const podejrzane = klasy.filter(
      (lista) => /line-clamp/.test(lista) && /\b(sm|md|lg):block\b/.test(lista),
    );

    expect(podejrzane, `w tych wierszach line-clamp jest zabity przez display:block:\n${podejrzane.join('\n')}`).toEqual([]);
  });

});
