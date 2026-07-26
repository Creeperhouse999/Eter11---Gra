import { describe, it, expect } from 'vitest';
import { BUILTIN_CONTENT } from './builtinContent';
import { validateContent } from '../firebase/validate';
import { DEFAULT_CATEGORIES } from './categories';
import { isIconName, CUSTOM_ICON_PREFIX } from '../ui/icons/Icon';

/**
 * Zapas wbudowany to treść, na którą gra spada, gdy Firestore milczy albo
 * ma dane uszkodzone (loadContent zwraca BUILTIN_CONTENT). Ten zapas jest
 * zaufany — loadContent NIE waliduje go przed użyciem. Musi więc sam
 * przechodzić dokładnie te reguły, które walidacja egzekwuje na treści z
 * panelu; inaczej redaktor mógłby zepsuć zapas (np. usunąć postacie poniżej
 * dwóch, dać misji więcej niż jest problemów, zostawić ściankę bez pasującej
 * karty), a wykryłoby się to dopiero, gdy dziecko utknie w grze offline.
 *
 * `validContent()` w validate.test.ts to osobna, ręcznie utrzymywana kopia
 * listy pól — może odjechać od prawdziwego BUILTIN_CONTENT. Ten test pilnuje
 * SAMEGO obiektu-zapasu.
 */
describe('BUILTIN_CONTENT — zaufany zapas', () => {
  it('przechodzi tę samą walidację, co treść z panelu redakcyjnego', () => {
    const result = validateContent(BUILTIN_CONTENT);
    expect(result.ok, result.errors.join('; ')).toBe(true);
  });

  it('każda kategoria ma ikonę znaną Icon.tsx (kategorie nie są walidowane)', () => {
    for (const [key, style] of Object.entries(DEFAULT_CATEGORIES)) {
      const known = isIconName(style.icon) || style.icon.startsWith(CUSTOM_ICON_PREFIX);
      expect(known, `kategoria ${key}: nieznana ikona „${style.icon}"`).toBe(true);
    }
  });
});
