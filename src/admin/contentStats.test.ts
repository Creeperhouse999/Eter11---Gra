import { describe, expect, it } from 'vitest';
import { contentStats } from './contentStats';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import type { GameContent } from '../firebase/validate';

/** Wyszukuje pozycję po etykiecie w dowolnej grupie. */
function entry(content: GameContent, label: string) {
  for (const group of contentStats(content)) {
    const found = group.entries.find((e) => e.label === label);
    if (found) return found;
  }
  throw new Error(`Brak pozycji: ${label}`);
}

/**
 * Statystyki mają dwa zadania: powiedzieć, co jest w grze, i pokazać rzeczy
 * warte uwagi zanim zobaczy je dziecko. Drugie jest ważniejsze, więc te testy
 * pilnują przede wszystkim ostrzeżeń — i tego, żeby nie krzyczały na
 * poprawnej treści.
 */
describe('statystyki treści', () => {
  it('liczy karty i problemy z zawartości', () => {
    expect(entry(BUILTIN_CONTENT, 'Karty').value).toBe(
      String(BUILTIN_CONTENT.cards.length),
    );
    expect(entry(BUILTIN_CONTENT, 'Problemy').value).toBe(
      String(BUILTIN_CONTENT.problems.length),
    );
  });

  it('nie ostrzega na treści wbudowanej', () => {
    // Ostrzeżenie krzyczące na poprawnej treści uczy redaktora je ignorować,
    // a wtedy przestaje działać także wtedy, gdy coś naprawdę jest nie tak.
    expect(entry(BUILTIN_CONTENT, 'Karty bez opisu').warn).toBeFalsy();
    expect(entry(BUILTIN_CONTENT, 'Powtórzone nazwy').warn).toBeFalsy();
    expect(entry(BUILTIN_CONTENT, 'Kombinacje kategoria + rodzina').warn).toBeFalsy();
  });

  it('wyłapuje kartę bez opisu', () => {
    const broken: GameContent = {
      ...BUILTIN_CONTENT,
      cards: BUILTIN_CONTENT.cards.map((card, i) =>
        i === 0 ? { ...card, description: '' } : card,
      ),
    };

    const stat = entry(broken, 'Karty bez opisu');
    expect(stat.value).toBe('1');
    expect(stat.warn).toBe(true);
  });

  it('wyłapuje powtórzoną nazwę', () => {
    const first = BUILTIN_CONTENT.cards.find((c) => c.name !== 'ETER11')!;
    const broken: GameContent = {
      ...BUILTIN_CONTENT,
      cards: [...BUILTIN_CONTENT.cards, { ...first, id: 'kopia' }],
    };

    const stat = entry(broken, 'Powtórzone nazwy');
    expect(stat.value).toBe('1');
    expect(stat.warn).toBe(true);
  });

  it('nie uznaje wielu ETER11 za pomyłkę', () => {
    // ETER11 leży w talii w kilku egzemplarzach z założenia — to ta sama
    // karta, nie przeoczenie redaktora.
    const eters = BUILTIN_CONTENT.cards.filter((c) => c.name === 'ETER11').length;
    expect(eters).toBeGreaterThan(0);
    expect(entry(BUILTIN_CONTENT, 'Powtórzone nazwy').value).toBe('0');
  });

  it('pokazuje nazwy kategorii, nie klucze silnika', () => {
    // `psychological` i `action` to identyfikatory, których redaktor nie widzi
    // nigdzie indziej w panelu — na ekranie mają stać polskie nazwy.
    const tight = entry(BUILTIN_CONTENT, 'Najbardziej napięta kategoria');
    expect(tight.value).not.toMatch(/^[a-z]+$/);

    const types = entry(BUILTIN_CONTENT, 'Typy problemów');
    expect(types.note).not.toMatch(/action|thinking|cooperation/);
  });

  it('liczy słowa do przeczytania', () => {
    const total = Number(entry(BUILTIN_CONTENT, 'Razem').value);
    expect(total).toBeGreaterThan(0);
    expect(entry(BUILTIN_CONTENT, 'Razem').note).toMatch(/min czytania/);
  });
});
