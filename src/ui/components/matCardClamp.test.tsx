import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `line-clamp` nie może stać obok responsywnego `display`.
 *
 * Przycinanie tekstu do kilku linii z wielokropkiem działa WYŁĄCZNIE przy
 * `display:-webkit-box`, który `line-clamp` sam sobie ustawia. Gdy obok stoi
 * `sm:block` (częsty sposób na „pokaż dopiero od tabletu"), obie klasy mają tę
 * samą specyficzność i decyduje kolejność w WYGENEROWANYM CSS — a tam
 * `sm:block` wypada później i nadpisuje `display`. Przycinanie robi się wtedy
 * martwe: tekst ucina się w połowie wiersza, bez wielokropka.
 *
 * Trafiło się to dwa razy — nazwa karty na macie i podpowiedź przy ściance
 * problemu. Wygląda niewinnie, więc łatwo dopisać z powrotem. Poprawnie jest
 * `sm:line-clamp-N`: odsłania element od tabletu w górę i jednocześnie
 * przycina.
 *
 * Uwaga: kolejność klas w samym atrybucie `className` nic tu nie zmienia —
 * liczy się kolejność reguł w zbudowanym arkuszu.
 */

/** Wszystkie widoki w projekcie — pułapka dotyczy każdego, nie jednego pliku. */
function wszystkieWidoki(katalog: string): string[] {
  return readdirSync(katalog, { withFileTypes: true }).flatMap((wpis) => {
    const sciezka = join(katalog, wpis.name);
    if (wpis.isDirectory()) return wszystkieWidoki(sciezka);
    return wpis.name.endsWith('.tsx') && !wpis.name.includes('.test.') ? [sciezka] : [];
  });
}

describe('przycinanie tekstu w widokach', () => {
  it('nigdzie nie łączy line-clamp z responsywnym display', () => {
    // Patrzymy WYŁĄCZNIE na zawartość atrybutów `className` — inaczej test
    // łapałby własne komentarze tłumaczące, czemu tych klas nie łączymy.
    const podejrzane = wszystkieWidoki('src').flatMap((plik) => {
      const zrodlo = readFileSync(plik, 'utf8');
      return [...zrodlo.matchAll(/className="([^"]*)"/g)]
        .map((dopasowanie) => dopasowanie[1])
        .filter(
          (klasy) =>
            /line-clamp/.test(klasy) && /\b(sm|md|lg|xl):(block|flex|grid|inline-block)\b/.test(klasy),
        )
        .map((klasy) => `${plik}: ${klasy}`);
    });

    expect(
      podejrzane,
      `tutaj responsywny display zabija line-clamp (użyj sm:line-clamp-N):\n${podejrzane.join('\n')}`,
    ).toEqual([]);
  });
});
