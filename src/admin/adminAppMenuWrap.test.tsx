import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Menu zakładek panelu ma zawijać się na kilka linii, nie przewijać w bok.
 *
 * Regresja (zgłoszenie „Popraw menu"): `<nav>` łączył `sm:flex` z
 * `overflow-x-auto`, a każdy przycisk miał `shrink-0` — przy większej liczbie
 * zakładek na wąskim ekranie menu zamieniało się w jeden rząd do przewijania
 * palcem, zamiast zawinąć się do 2-3 linii. Test czyta źródło (nie renderuje
 * całego `AdminApp`, który wymaga ciężkiego zestawu atrap Firebase) i pilnuje,
 * żeby `overflow-x-auto`/`shrink-0` nie wróciły obok nawigacji zakładek.
 */
describe('AdminApp — zawijanie menu zakładek', () => {
  it('nav zakładek zawija się (flex-wrap), nie przewija w bok', () => {
    const zrodlo = readFileSync(join('src/admin/AdminApp.tsx'), 'utf8');
    const navMatch = zrodlo.match(/<nav\s+className="([^"]*)"\s*\n\s*aria-label="Sekcje panelu"/);
    expect(navMatch, 'nie znaleziono <nav aria-label="Sekcje panelu">').toBeTruthy();
    const navClasses = navMatch![1];

    expect(navClasses).toMatch(/\bflex-wrap\b/);
    expect(navClasses).not.toMatch(/overflow-x-auto/);

    // Przycisk zakładki tuż pod nav — bez fixu miał `shrink-0`, co blokowało
    // zawijanie (elementy nie chciały się zmniejszyć/przenieść do nowej linii).
    const navSection = zrodlo.slice(zrodlo.indexOf('aria-label="Sekcje panelu"'));
    const buttonMatch = navSection.match(/className=\{\[\s*\n\s*'([^']*)',/);
    expect(buttonMatch, 'nie znaleziono className przycisku zakładki w nav').toBeTruthy();
    expect(buttonMatch![1]).not.toMatch(/shrink-0/);
  });
});
