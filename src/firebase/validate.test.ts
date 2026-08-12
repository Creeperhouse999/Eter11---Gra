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

  // Gra przy stole ma co najmniej dwóch graczy, a każdy musi dostać INNĄ
  // postać (postać identyfikuje go na planszy). Jedna postać robi grę
  // niegrywalną — walidacja łapie to jak każdą inną konfigurację nie do
  // rozegrania (za mało problemów, próg zwycięstwa ponad liczbę misji itd.).
  it('odrzuca zawartość z jedną postacią — za mało na dwóch graczy', () => {
    const content = validContent();
    content.characters = content.characters.slice(0, 1);
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toContain('za mało postaci');
  });

  it('akceptuje dokładnie dwie postacie (minimum na dwóch graczy)', () => {
    const content = validContent();
    content.characters = content.characters.slice(0, 2);
    const result = validateContent(content);
    expect(result.ok, result.errors.join('; ')).toBe(true);
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

  it('odrzuca więcej misji niż grywalnych problemów', () => {
    const content = validContent();
    // Gra deklaruje 20 misji, a grywalnych (nieroboczych) problemów jest mniej —
    // skończy się przed czasem, a ekran „odkryj problem" zostaje bez treści.
    content.rules = { ...content.rules, missionsPerGame: 20, teamWinThreshold: 20 };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('więcej niż grywalnych problemów');
  });

  it('przepuszcza długie misje — rozmiar ręki ogranicza maxHandSize, nie liczba rund', () => {
    const content = validContent();
    // Ręka rośnie o kartę na rundę TYLKO do maxHandSize: reducer przerywa
    // dobieranie, gdy `hand.length >= maxHandSize`. Przy maxHandSize 7 dwadzieścia
    // rund nie zrobi z ręki dwudziestu pięciu kart. Walidator mylił rozmiar ręki
    // z sumą (rozdanie + rundy) i odrzucał grywalną konfigurację długiej misji —
    // o tym, czy ręka mieści się na ekranie, decyduje zakres maxHandSize (1–12),
    // sprawdzany osobno, a nie liczba rund.
    content.rules = { ...content.rules, handSize: 5, roundsPerMission: 20, maxHandSize: 7 };
    const result = validateContent(content);
    expect(result.ok, result.errors.join('; ')).toBe(true);
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

  it('odrzuca maxHandSize równy zero — silnik przestałby dobierać karty', () => {
    const content = validContent();
    // reducer.ts dobiera kartę na nowej rundzie tylko gdy
    // hand.length < maxHandSize. Przy 0 warunek jest zawsze fałszywy, więc
    // ręka nigdy się nie uzupełnia — dokładnie to, przed czym walidator ma
    // chronić przy innych zasadach, a maxHandSize mijał go zupełnie.
    content.rules = { ...content.rules, maxHandSize: 0 };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('maxHandSize');
  });

  it('odrzuca maxHandSize, który nie jest liczbą całkowitą', () => {
    const content = validContent();
    content.rules = { ...content.rules, maxHandSize: Number.NaN };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('maxHandSize');
  });

  it('odrzuca limit ręki mniejszy niż rozdanie', () => {
    const content = validContent();
    // Limit poniżej rozdania jest sprzeczny: gracz startuje z ręką powyżej
    // limitu, a dobierania na rundę i tak nigdy nie ruszą.
    content.rules = { ...content.rules, handSize: 5, maxHandSize: 3 };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toContain('limit ręki');
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

/**
 * Walidator musi mierzyć GRYWALNOŚĆ tą samą treścią, którą widzą gracze —
 * czyli bez wersji roboczych (`draft`), bo te nie trafiają do partii
 * (playableCards/playableProblems). Inaczej przepuściłby zawartość niegrywalną
 * w prawdziwej grze albo zablokował zapis niedokończonego szkicu.
 */
describe('validateContent — świadomość wersji roboczych (draft)', () => {
  it('grywalny problem ze ścianką pokrytą tylko kartą roboczą jest odrzucany', () => {
    const content = validContent();
    const problem = content.problems.find((p) => !p.draft)!;
    const slot = problem.slots[0];
    // Wszystkie pasujące karty stają się robocze — grywalna talia traci pokrycie.
    for (const c of content.cards) {
      if (c.category === slot.key && c.family === slot.family) c.draft = true;
    }
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/nie da się ukończyć|nie zawiera żadnej karty/i);
  });

  it('roboczy problem z niepokrytą ścianką nie blokuje zapisu, a nieroboczy — tak', () => {
    const base = structuredClone(validContent().problems.find((p) => !p.draft)!);
    const build = (draft: boolean) => {
      const content = validContent();
      const p = structuredClone(base);
      p.id = 'p-nowy';
      p.draft = draft;
      // Ścianka mentora w rodzinie, której żadna karta nie ma → niepokryta.
      p.slots = p.slots.map((s) =>
        s.key === 'mentor'
          ? { ...s, family: '__brak__' as unknown as typeof s.family }
          : s,
      );
      content.problems = [...content.problems, p];
      return validateContent(content);
    };
    // Jako szkic: kontrola pokrycia pomijana → nadal ok.
    const asDraft = build(true);
    expect(asDraft.ok, asDraft.errors.join('; ')).toBe(true);
    // Jako nieroboczy: ścianka niepokryta → odrzucony.
    expect(build(false).ok).toBe(false);
  });

  it('missionsPerGame liczy problemy nierobocze, nie wszystkie', () => {
    const content = validContent();
    const playable = content.problems.filter((p) => !p.draft).length;
    const drafts = content.problems.length - playable;
    expect(drafts).toBeGreaterThan(0); // w danych SĄ robocze problemy
    // O jeden więcej niż grywalnych, ale wciąż ≤ wszystkich (w tym roboczych).
    content.rules = { ...content.rules, missionsPerGame: playable + 1 };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/grywalnych problemów/i);
  });

  // Zapis z panelu admina nie przechodzi przez nic poza `validateContent`
  // (patrz AdminApp.tsx: przycisk Zapisz jest zablokowany tylko przez
  // `!validation.ok`). Pusta scena wstępu albo pusty krok samouczka
  // trafiłaby więc bez przeszkód do wszystkich graczy.
  it('odrzuca scenę wstępu z pustym nagłówkiem, treścią albo ikoną', () => {
    const content = validContent();
    content.intro = {
      story: [{ heading: '', body: 'Coś', icon: 'earth' }],
      rules: [],
      adults: [],
    };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toContain('wstęp');
  });

  it('akceptuje kompletny wstęp', () => {
    const content = validContent();
    content.intro = {
      story: [{ heading: 'Tytuł', body: 'Treść', icon: 'earth' }],
      rules: [],
      adults: [],
    };
    const result = validateContent(content);
    expect(result.ok, result.errors.join('; ')).toBe(true);
  });

  it('odrzuca krok samouczka z pustą kwestią albo pochwałą', () => {
    const content = validContent();
    content.tutorial = [
      { id: 'x', goal: 'intro', allow: [], say: '', praise: 'Brawo' },
    ];
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toContain('samouczek');
  });

  it('akceptuje kompletny krok samouczka', () => {
    const content = validContent();
    content.tutorial = [
      { id: 'x', goal: 'intro', allow: [], say: 'Cześć', praise: 'Brawo' },
    ];
    const result = validateContent(content);
    expect(result.ok, result.errors.join('; ')).toBe(true);
  });

  // Uszkodzony zapis (np. ręczna edycja bazy) mógłby wpisać zły KSZTAŁT —
  // nie pustą wartość, tylko np. tekst zamiast obiektu/listy. Bez jawnej
  // kontroli walidacja po cichu POMIJA taki fragment (żadnego błędu), a
  // zepsute dane trafiają do wszystkich graczy i wywalają IntroScreen /
  // samouczek na `.split is not a function` / podobnym TypeError.
  it('odrzuca intro, które nie jest obiektem', () => {
    const content = validContent();
    (content as unknown as Record<string, unknown>).intro = 'nie obiekt';
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toContain('wstęp');
  });

  it('odrzuca sekcję wstępu, która nie jest listą', () => {
    const content = validContent();
    content.intro = {
      story: 'Kiedyś dawno temu...' as unknown as never,
      rules: [],
      adults: [],
    };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toContain('wstęp');
  });

  it('odrzuca samouczek, który nie jest listą', () => {
    const content = validContent();
    (content as unknown as Record<string, unknown>).tutorial = { krok: 1 };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toContain('samouczek');
  });

  /**
   * Zero grywalnych problemów to nie „krótsza gra", tylko gra bez treści:
   * talia problemów jest pusta, „Odkryj problem" nie działa i jedynym wyjściem
   * jest powrót do menu. Sprawdzenie liczby problemów ten przypadek POMIJAŁO
   * (wyłączał je warunek `playableProblems.length > 0`), więc panel
   * przepuszczał taką zawartość bez słowa ostrzeżenia.
   */
  it("wszystkie problemy robocze = zawartość odrzucona, nie cicha zgoda", () => {
    const content = validContent();
    for (const problem of content.problems) problem.draft = true;

    const result = validateContent(content);

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ").toLowerCase()).toContain("wersjami roboczymi");
  });
});
