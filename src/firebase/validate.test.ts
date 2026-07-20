import { describe, it, expect } from 'vitest';
import { validateContent, type GameContent } from './validate';
import { ALL_CARDS } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';
import { ALL_CHARACTERS } from '../data/characters';
import { DEFAULT_CONFIG } from '../engine/reducer';

const validContent = (): GameContent => ({
  cards: structuredClone(ALL_CARDS),
  problems: structuredClone(ALL_PROBLEMS),
  characters: structuredClone(ALL_CHARACTERS),
  rules: { ...DEFAULT_CONFIG },
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

  it('odrzuca problem bez kompletu 4 ścianek', () => {
    const content = validContent();
    content.problems = [
      { ...content.problems[0], slots: content.problems[0].slots.slice(0, 3) },
    ];
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('mentorTalent');
  });

  it('odrzuca kartę bonusową wskazującą na nieistniejącą kartę', () => {
    const content = validContent();
    content.problems[0].slots[0].bonusCardIds = ['nie-ma-takiej-karty'];
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('nie-ma-takiej-karty');
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

  it('zbiera wiele błędów naraz', () => {
    const content = validContent();
    content.problems = [];
    content.rules = { ...content.rules, handSize: 0 };
    const result = validateContent(content);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
