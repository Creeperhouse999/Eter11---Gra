import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
// tailwind.config.js to plik JS poza `src` — nie ma dla niego deklaracji typów,
// a test tylko podaje go Tailwindowi bez czytania kształtu.
// @ts-expect-error — brak deklaracji typów dla konfiguracji JS
import config from '../../tailwind.config.js';

/**
 * Kolory motywu były zdefiniowane jako gołe `var(--eter-*)`, których Tailwind
 * nie umie wypełnić alfą — modyfikator `/opacity` (np. `bg-bg/80` na przyciemnieniu
 * pod modalem, `bg-surface/90` na pływających pigułkach, `text-ink-dim/30` na
 * wyszarzeniu) kompilował się do NICZEGO. Przyciemnienia pod oknami nie
 * zaciemniały tła w ogóle. Ten test pilnuje, żeby modyfikator alfy działał.
 */
async function compile(markup: string): Promise<string> {
  const result = await postcss([
    tailwindcss({ ...config, content: [{ raw: markup, extension: 'html' }] }),
  ]).process('@tailwind utilities;', { from: undefined });
  return result.css;
}

describe('modyfikator przezroczystości na kolorach motywu', () => {
  it('emituje realną regułę z alfą dla bg-bg/80 (przyciemnienie pod modalem MUSI zaciemniać)', async () => {
    const css = await compile('<div class="bg-bg/80"></div>');
    expect(css).toMatch(/\.bg-bg\\\/80/); // klasa w ogóle istnieje
    expect(css).toMatch(/0?\.8\s*\)/); // alfa 0.8 trafiła do rgb(... / .8)
  });

  it('emituje reguły z alfą dla surface/edge/ink-dim', async () => {
    const css = await compile(
      '<div class="bg-surface/90 border-edge/50 text-ink-dim/30"></div>',
    );
    expect(css).toMatch(/\.bg-surface\\\/90/);
    expect(css).toMatch(/\.border-edge\\\/50/);
    expect(css).toMatch(/\.text-ink-dim\\\/30/);
  });

  it('nie psuje kolorów pełnych (solid)', async () => {
    const css = await compile('<div class="bg-surface text-ink border-edge"></div>');
    expect(css).toMatch(/\.bg-surface\s*\{/);
    expect(css).toMatch(/\.text-ink\s*\{/);
    expect(css).toMatch(/\.border-edge\s*\{/);
  });
});
