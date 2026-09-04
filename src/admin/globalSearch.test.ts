import { describe, expect, it } from 'vitest';
import { searchContent } from './globalSearch';
import { BUILTIN_CONTENT } from '../data/builtinContent';

/**
 * Wyszukiwarka istniała tylko w kartach, a redaktor pisze też problemy,
 * teksty interfejsu, wstęp i kwestie ETER11. „Gdzie ja wpisałem to zdanie"
 * wymagało obejścia siedmiu zakładek i czytania ich po kolei.
 */
describe('szukanie w całej treści', () => {
  it('nie szuka przy pustym zapytaniu', () => {
    expect(searchContent(BUILTIN_CONTENT, '')).toEqual([]);
    expect(searchContent(BUILTIN_CONTENT, '   ')).toEqual([]);
  });

  it('znajduje kartę po nazwie', () => {
    const card = BUILTIN_CONTENT.cards.find((c) => c.name !== 'ETER11')!;
    const hits = searchContent(BUILTIN_CONTENT, card.name);

    expect(hits.some((h) => h.title === card.name && h.tab === 'cards')).toBe(true);
  });

  it('znajduje problem po treści historii', () => {
    const problem = BUILTIN_CONTENT.problems[0];
    const word = problem.story.split(/\s+/).find((w) => w.length > 6);
    if (!word) return;

    const hits = searchContent(BUILTIN_CONTENT, word);
    expect(hits.some((h) => h.tab === 'problems')).toBe(true);
  });

  it('sięga do wstępu i kwestii ETER11', () => {
    const scene = BUILTIN_CONTENT.intro?.story[0];
    if (!scene) return;

    const hits = searchContent(BUILTIN_CONTENT, scene.heading);
    expect(hits.some((h) => h.tab === 'story')).toBe(true);
  });

  it('dopasowuje słowa w dowolnej kolejności', () => {
    const card = BUILTIN_CONTENT.cards.find(
      (c) => c.name.split(' ').length > 1 && c.name !== 'ETER11',
    );
    if (!card) return;

    const [first, second] = card.name.split(' ');
    // Nikt nie pamięta zdania dosłownie — pamięta dwa słowa z niego,
    // często nie w tej kolejności.
    const hits = searchContent(BUILTIN_CONTENT, `${second} ${first}`);

    expect(hits.some((h) => h.title === card.name)).toBe(true);
  });

  it('znajduje karty po nazwie kategorii, nie po kluczu silnika', () => {
    // Zgłoszenie Adama: nazwa kategorii pokazywała jeden wynik zamiast
    // wszystkich kart tej kategorii, bo szukanie sięgało klucza `digital`,
    // nie nazwy widocznej dla gracza.
    const hits = searchContent(BUILTIN_CONTENT, 'supermoc technologii');
    const cardHits = hits.filter((h) => h.tab === 'cards');

    const digitalCards = BUILTIN_CONTENT.cards.filter((c) => c.category === 'digital');
    expect(cardHits.length).toBe(digitalCards.length);
  });

  it('znajduje karty po nazwie rodziny', () => {
    const hits = searchContent(BUILTIN_CONTENT, 'czerwona');
    const cardHits = hits.filter((h) => h.tab === 'cards');
    const redCards = BUILTIN_CONTENT.cards.filter((c) => c.family === 'red');

    expect(cardHits.length).toBe(redCards.length);
  });

  it('podaje zakładkę, w którą trzeba przejść', () => {
    const hits = searchContent(BUILTIN_CONTENT, 'a');
    for (const hit of hits) {
      expect(hit.tab.length).toBeGreaterThan(0);
      expect(hit.where.length).toBeGreaterThan(0);
    }
  });

  it('skraca fragment do okolic trafienia', () => {
    const problem = BUILTIN_CONTENT.problems.find((p) => p.story.length > 200);
    if (!problem) return;

    const long = problem.story.split(/\s+/).filter((w) => w.length > 6);
    const word = long[long.length - 1];
    if (!word) return;

    const hit = searchContent(BUILTIN_CONTENT, word).find((h) => h.tab === 'problems');
    // Cała historia problemu w wyniku zamieniłaby listę w ścianę tekstu.
    expect(hit && hit.excerpt.length).toBeLessThan(problem.story.length);
  });

  it('nie wstawia literalnego "undefined", gdy pola opcjonalne są puste', () => {
    // validateContent NIE wymaga description/consequence/antagonist/traits
    // (sprawdza je tylko, gdy są tekstem), więc poprawny dokument z bazy może
    // je mieć puste — contentStats domyka to `?? ''`, a wyszukiwarka nie.
    // Bez domknięcia szablon dawał „Kotek undefined …": szukanie „undefined"
    // trafiało w każdą taką kartę, a fragment wyniku pokazywał to słowo.
    const content = {
      ...BUILTIN_CONTENT,
      cards: [
        { id: 'x1', name: 'Kotek', category: 'digital', family: 'red', icon: 'star' },
        ...BUILTIN_CONTENT.cards,
      ],
      characters: [
        { id: 'c1', name: 'Bezcecha', kind: 'child', icon: 'star' },
        ...BUILTIN_CONTENT.characters,
      ],
    } as unknown as typeof BUILTIN_CONTENT;

    // Szukanie „undefined" nie może trafić w kartę/postać z pustym polem.
    const spurious = searchContent(content, 'undefined');
    expect(spurious.some((h) => h.title === 'Kotek')).toBe(false);
    expect(spurious.some((h) => h.title === 'Bezcecha')).toBe(false);

    // Fragment przy trafieniu w nazwę nie zawiera literalnego „undefined".
    const hit = searchContent(content, 'Kotek').find((h) => h.title === 'Kotek');
    expect(hit).toBeTruthy();
    expect(hit!.excerpt.toLowerCase()).not.toContain('undefined');
  });

  it('nie wywraca się na częściowym wstępie', () => {
    // Walidacja nie sprawdza kształtu wstępu, więc w bazie może leżeć sama
    // historia bez zasad i części dla dorosłych. Kiedyś `undefined.forEach`
    // wywracał wyszukiwarkę — teraz brakująca część to zero scen.
    const broken = {
      ...BUILTIN_CONTENT,
      intro: { story: BUILTIN_CONTENT.intro?.story ?? [] },
    } as unknown as typeof BUILTIN_CONTENT;

    expect(() => searchContent(broken, 'test')).not.toThrow();
  });
});
