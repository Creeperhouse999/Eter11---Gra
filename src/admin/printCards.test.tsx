import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('PrintCards', () => {
  it('drukuje dokładnie tyle kart, ile buduje silnik gry (draft pominięte, kompetencje x2)', () => {
    const c = content();
    render(<PrintCards content={c} />);
    const expected = buildDeck(playableCards(c.cards));
    expect(screen.getByRole('button', { name: `Drukuj (${expected.length} kart)` })).toBeTruthy();
    expect(document.querySelectorAll('article')).toHaveLength(expected.length);
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
});
