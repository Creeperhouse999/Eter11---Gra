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

  it('zbiera wiele błędów naraz', () => {
    const content = validContent();
    content.problems = [];
    content.rules = { ...content.rules, handSize: 0 };
    const result = validateContent(content);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
