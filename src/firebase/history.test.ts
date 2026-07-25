import { describe, expect, it } from 'vitest';
import { describeChanges } from './history';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import type { GameContent } from './validate';

/**
 * Historia zapisów istnieje po to, żeby dało się cofnąć cudze nadpisanie.
 * Znacznik czasu do tego nie wystarcza: „zapisano 14:32" nie mówi, czy warto
 * się cofać. Opis zmian mówi — i to on decyduje, czy funkcja jest użyteczna.
 */
describe('opis zmian między wersjami', () => {
  const base = BUILTIN_CONTENT;

  it('pierwszy zapis nie ma się do czego porównać', () => {
    expect(describeChanges(base, undefined)).toBe('pierwszy zapis');
  });

  it('nazywa sekcję, która się zmieniła', () => {
    const next: GameContent = {
      ...base,
      text: { ...base.text, gameTitle: 'Inny tytuł' },
    };

    expect(describeChanges(next, base)).toBe('teksty');
  });

  it('liczy dodane i usunięte elementy', () => {
    const added: GameContent = {
      ...base,
      cards: [...base.cards, { ...base.cards[0], id: 'nowa-karta' }],
    };
    expect(describeChanges(added, base)).toBe('karty (+1)');

    const removed: GameContent = { ...base, cards: base.cards.slice(0, -2) };
    expect(describeChanges(removed, base)).toBe('karty (-2)');
  });

  it('wymienia wszystkie ruszone sekcje', () => {
    const next: GameContent = {
      ...base,
      text: { ...base.text, gameTitle: 'Inny' },
      theme: { ...base.theme, catDigital: '#123456' },
    };

    const summary = describeChanges(next, base);
    expect(summary).toContain('teksty');
    expect(summary).toContain('kolory');
  });

  it('zmiana wewnątrz karty to nadal zmiana, choć liczba się nie zmienia', () => {
    const next: GameContent = {
      ...base,
      cards: base.cards.map((card, i) =>
        i === 0 ? { ...card, name: 'Przemianowana' } : card,
      ),
    };

    // Bez licznika: nic nie przybyło ani nie ubyło, ale treść jest inna.
    expect(describeChanges(next, base)).toBe('karty');
  });

  it('zapis bez zmian mówi to wprost', () => {
    expect(describeChanges(base, base)).toBe('bez zmian w treści');
  });

  it('zmiana tylko jasnego motywu jest widoczna w opisie', () => {
    // Redaktor edytujący same kolory trybu jasnego zapisuje zmianę wyłącznie
    // w `themeLight` (patrz AdminApp — update({ themeLight: colors })). Bez tej
    // sekcji w opisie historia mówiłaby „bez zmian w treści", choć zapisała
    // pełną wersję — a redaktor szukający „kiedy zmieniłem jasne kolory" nie
    // znalazłby po czym.
    const prev: GameContent = { ...base, themeLight: { ...base.theme } };
    const next: GameContent = {
      ...base,
      themeLight: { ...base.theme, catDigital: '#abcdef' },
    };

    const summary = describeChanges(next, prev);
    expect(summary).not.toBe('bez zmian w treści');
    expect(summary).toContain('jasny');
  });
});
