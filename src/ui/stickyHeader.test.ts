import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `position: sticky` przestaje działać, gdy któryś przodek ma `overflow`
 * inny niż `visible` — element przykleja się wtedy do kontenera przewijania,
 * którego nikt nie widzi, zamiast do okna.
 *
 * Na `html` skutek jest globalny: unieważnia przyklejanie w CAŁEJ aplikacji.
 * Tak zniknął pasek zakładek w panelu redakcyjnym — uciekał do góry przy
 * przewijaniu, choć miał `sticky top-0`.
 *
 * Ucięcie w poziomie jest potrzebne, ale musi siedzieć na `body`.
 */
describe('przyklejone nagłówki', () => {
  const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf-8');

  /** Treść reguły dla podanego selektora (pierwsze wystąpienie). */
  const ruleFor = (selector: string): string => {
    const match = css.match(new RegExp(`(^|\\n)${selector}\\s*\\{([\\s\\S]*?)\\n\\}`));
    return match ? match[2] : '';
  };

  it('nie ucina przewijania na elemencie html', () => {
    expect(ruleFor('html')).not.toMatch(/overflow(-x|-y)?\s*:\s*(hidden|auto|scroll|clip)/);
  });

  it('nadal chroni przed przewijaniem w bok', () => {
    expect(ruleFor('body')).toMatch(/overflow-x\s*:\s*hidden/);
  });
});
