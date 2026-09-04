import { describe, it, expect } from 'vitest';
import { ALL_CHARACTERS } from './characters';
import { kolorPostaci, DOMYSLNY_KOLOR_POSTACI } from './characters';

/**
 * Każda postać ma swój kolor.
 *
 * Adam poprosił po obejrzeniu wydruku: „aby karty postaci miały różne kolory —
 * każda postać inny kolor" i „aby można było w panelu edycji karty postaci
 * ustawiać kolor tej karty".
 *
 * Przy stole gracze trzymają swoje karty obok siebie; jednakowe wyglądają jak
 * komplet, a nie jak „moja i twoja". Kolor rozwiązuje to bez czytania nazwy.
 */

describe('kolory kart postaci', () => {
  it('każda postać ma inny kolor', () => {
    const kolory = ALL_CHARACTERS.map((p) => kolorPostaci(p));

    expect(new Set(kolory).size).toBe(ALL_CHARACTERS.length);
  });

  it('postać bez ustawionego koloru dostaje sensowny domyślny', () => {
    // Treść zapisana przed tą zmianą nie ma pola `color` — karta nie może
    // wyjść wtedy bezbarwna.
    const bezKoloru = { ...ALL_CHARACTERS[0], color: undefined };

    expect(kolorPostaci(bezKoloru)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('ustawiony kolor ma pierwszeństwo przed domyślnym', () => {
    // Sedno prośby: redaktor zmienia kolor w panelu i wydruk idzie za nim.
    const wlasny = { ...ALL_CHARACTERS[0], color: '#ff00ff' };

    expect(kolorPostaci(wlasny)).toBe('#ff00ff');
  });

  it('domyślne kolory są zapisane poprawnie', () => {
    // Literówka w kolorze nie wywala aplikacji — przeglądarka po cichu
    // ignoruje złą wartość i element zostaje bez koloru.
    for (const kolor of DOMYSLNY_KOLOR_POSTACI) {
      expect(kolor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('kolorów starcza dla wszystkich postaci', () => {
    // Gdyby lista była krótsza, dwie postacie dostałyby ten sam kolor —
    // dokładnie to, czego Adam nie chce.
    expect(DOMYSLNY_KOLOR_POSTACI.length).toBeGreaterThanOrEqual(
      ALL_CHARACTERS.length,
    );
  });
});
