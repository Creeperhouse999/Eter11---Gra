import { describe, it, expect } from 'vitest';
import { validateContent, type GameContent } from './validate';
import { ALL_CARDS } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';
import { ALL_CHARACTERS } from '../data/characters';
import { DEFAULT_CONFIG } from '../engine/reducer';
import { DEFAULT_FAMILIES } from '../data/families';
import { DEFAULT_THEME } from '../data/theme';
import { DEFAULT_UI_TEXT } from '../data/uiText';

const validContent = (): GameContent => ({
  cards: structuredClone(ALL_CARDS),
  problems: structuredClone(ALL_PROBLEMS),
  characters: structuredClone(ALL_CHARACTERS),
  rules: { ...DEFAULT_CONFIG },
  text: { ...DEFAULT_UI_TEXT },
  theme: { ...DEFAULT_THEME },
  families: structuredClone(DEFAULT_FAMILIES),
});

describe('validateContent', () => {
  it('akceptuje dane wbudowane', () => {
    const result = validateContent(validContent());
    expect(result.ok, result.errors.join('; ')).toBe(true);
  });

  it('odrzuca wartość, która nie jest obiektem', () => {
    expect(validateContent(null).ok).toBe(false);
    expect(validateContent('tekst').ok).toBe(false);
  });

  it('odrzuca brak wymaganej sekcji', () => {
    const content = validContent() as Partial<GameContent>;
    delete content.cards;
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('cards');
  });

  it('odrzuca zduplikowane identyfikatory kart', () => {
    const content = validContent();
    content.cards = [...content.cards, content.cards[0]];
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toContain('duplikat');
  });

  // Walidator ma ZŁAPAĆ uszkodzone dane, nie wywrócić się na nich. Element,
  // który nie jest obiektem (null/liczba/tekst po uszkodzeniu dokumentu),
  // rzucał TypeError przy pierwszym dostępie do pola — a wyjątek łapał się
  // w loadContent jako „brak połączenia", więc admin nie wiedział, że dane
  // są zepsute.
  it('zgłasza kartę, która nie jest obiektem, zamiast się wywrócić', () => {
    const content = validContent();
    (content.cards as unknown[]).unshift(null);
    let result!: ReturnType<typeof validateContent>;
    expect(() => {
      result = validateContent(content);
    }).not.toThrow();
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toContain('nie jest obiektem');
  });

  it('zgłasza ściankę, która nie jest obiektem, zamiast się wywrócić', () => {
    const content = validContent();
    (content.problems[0].slots as unknown[]).push(null);
    let result!: ReturnType<typeof validateContent>;
    expect(() => {
      result = validateContent(content);
    }).not.toThrow();
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toContain('ścianka');
  });

  it('zgłasza motyw, który nie jest obiektem, zamiast się wywrócić', () => {
    const content = validContent();
    (content as { theme: unknown }).theme = 'nie-obiekt';
    let result!: ReturnType<typeof validateContent>;
    expect(() => {
      result = validateContent(content);
    }).not.toThrow();
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toContain('motyw');
  });

  it('odrzuca kartę bez nazwy', () => {
    const content = validContent();
    content.cards[0] = { ...content.cards[0], name: '' };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('nazwy');
  });

  it('odrzuca Czarnego Łabędzia bez wariantu', () => {
    const content = validContent();
    content.cards = content.cards.map((c) =>
      c.category === 'blackswan' ? { ...c, blackSwanKind: undefined } : c,
    );
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('wariantu');
  });

  it('odrzuca problem bez kompletu 5 ścianek', () => {
    const content = validContent();
    content.problems = [
      { ...content.problems[0], slots: content.problems[0].slots.slice(0, 3) },
    ];
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('brakuje ścianki');
  });

  it('odrzuca ściankę, której nie da się zamknąć żadną kartą z talii', () => {
    const content = validContent();
    const slot = content.problems[0].slots[0];
    // Zabieramy z talii wszystkie karty pasujące do tej ścianki.
    content.cards = content.cards.filter(
      (c) => !(c.category === slot.key && c.family === slot.family),
    );
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('misji nie da się ukończyć');
  });

  it('odrzuca więcej misji niż problemów w talii', () => {
    const content = validContent();
    // Gra deklaruje 20 misji, a problemów jest 13 — skończy się przed czasem,
    // a ekran „odkryj problem" zostaje bez treści.
    content.rules = { ...content.rules, missionsPerGame: 20, teamWinThreshold: 20 };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('więcej niż problemów');
  });

  it('odrzuca zasady, przy których ręka nie mieści się na ekranie', () => {
    const content = validContent();
    // Ręka rośnie o kartę na rundę: 12 + 30 to ponad czterdzieści kart,
    // czyli kilka ekranów samego przewijania.
    content.rules = { ...content.rules, handSize: 12, roundsPerMission: 30 };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('nie mieści się na ekranie');
  });

  it('przepuszcza zasady mieszczące się w granicach', () => {
    const content = validContent();
    content.rules = { ...content.rules, handSize: 7, roundsPerMission: 10 };
    const result = validateContent(content);
    expect(result.ok, result.errors.join('; ')).toBe(true);
  });

  it('odrzuca teksty dłuższe niż mieści interfejs', () => {
    const content = validContent();
    content.cards[0].name = 'x'.repeat(200);
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('nie zmieści się na karcie');
  });

  it('odrzuca znaczniki w nazwie, które wyświetlą się dosłownie', () => {
    const content = validContent();
    content.cards[0].name = '<script>alert(1)</script>';
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('< lub >');
  });

  it('odrzuca ułamkowe wartości zasad', () => {
    const content = validContent();
    // 5.7 karty na ręce nie znaczy nic, a rozjeżdża dobieranie.
    content.rules = { ...content.rules, handSize: 5.7 };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('całkowitą');
  });

  it('przepuszcza emoji w nazwach', () => {
    // Emoji to normalny tekst — blokujemy tylko znaczniki.
    const content = validContent();
    content.cards[0].name = 'Odwaga 🦁';
    const result = validateContent(content);
    expect(result.ok, result.errors.join('; ')).toBe(true);
  });

  it('dane wbudowane przechodzą walidację w komplecie', () => {
    // To one ratują grę, gdy Firestore jest nieosiągalny albo pusty.
    // Gdyby nie przechodziły walidacji, tryb offline startowałby z danymi,
    // które gra sama uznaje za uszkodzone.
    const result = validateContent(validContent());
    expect(result.ok, result.errors.join('; ')).toBe(true);
  });

  it('odrzuca motyw z brakującymi kolorami', () => {
    const content = validContent();
    // Brakujące pole wpisywało się do CSS jako `undefined` i element tracił
    // tło albo tekst — bez żadnego komunikatu.
    content.theme = { bg: '#000000' } as typeof content.theme;
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('brakuje kolorów');
  });

  it('odrzuca liczbę rund poniżej 1', () => {
    const content = validContent();
    content.rules = { ...content.rules, roundsPerMission: 0 };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('roundsPerMission');
  });

  it('odrzuca talię bez kart którejś kategorii kompetencji', () => {
    const content = validContent();
    content.cards = content.cards.filter((c) => c.category !== 'digital');
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('digital');
  });

  it('odrzuca brak problemów', () => {
    const content = validContent();
    content.problems = [];
    expect(validateContent(content).ok).toBe(false);
  });

  it('odrzuca próg zwycięstwa wyższy niż liczba misji', () => {
    const content = validContent();
    content.rules = { ...content.rules, teamWinThreshold: 10, missionsPerGame: 5 };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('niemożliwa do wygrania');
  });

  it('odrzuca kolor motywu w złym formacie', () => {
    const content = validContent();
    content.theme = { ...content.theme, accent: 'turkusowy' };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('accent');
  });

  it('akceptuje zawartość bez sekcji text i theme (starszy dokument)', () => {
    const content = validContent() as Partial<GameContent>;
    delete content.text;
    delete content.theme;
    expect(validateContent(content).ok).toBe(true);
  });

  // `themeLight` (kolory trybu jasnego) ma ten sam kształt co `theme` i tak
  // samo trafia do zmiennych CSS (App.tsx / AdminApp.tsx → setThemeOverrides →
  // applyTheme). Był jednak walidowany tylko motyw ciemny — uszkodzony
  // `themeLight` (brak koloru albo zły format) wpisywał `undefined`/śmieć do
  // zmiennych trybu jasnego, więc gracz w jasnym motywie tracił tło/tekst.
  it('odrzuca motyw jasny z brakującymi kolorami', () => {
    const content = validContent();
    content.themeLight = { bg: '#ffffff' } as GameContent['themeLight'];
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('brakuje kolorów');
  });

  it('odrzuca kolor motywu jasnego w złym formacie', () => {
    const content = validContent();
    content.themeLight = { ...DEFAULT_THEME, accent: 'fiolet' };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('accent');
  });

  it('zgłasza motyw jasny, który nie jest obiektem, zamiast się wywrócić', () => {
    const content = validContent();
    (content as { themeLight: unknown }).themeLight = 'nie-obiekt';
    let result!: ReturnType<typeof validateContent>;
    expect(() => {
      result = validateContent(content);
    }).not.toThrow();
    expect(result.ok).toBe(false);
  });

  it('akceptuje zawartość bez motywu jasnego (starszy dokument)', () => {
    const content = validContent() as Partial<GameContent>;
    delete content.themeLight;
    const result = validateContent(content);
    expect(result.ok, result.errors.join('; ')).toBe(true);
  });

  it('zbiera wiele błędów naraz', () => {
    const content = validContent();
    content.problems = [];
    content.rules = { ...content.rules, handSize: 0 };
    const result = validateContent(content);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
