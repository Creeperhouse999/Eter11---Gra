import { describe, it, expect } from 'vitest';
import { DEFAULT_FAMILIES, FAMILY_IDS } from './families';
import type { CardCategory } from '../engine/types';

/**
 * Kolor znaczy to samo we wszystkich kategoriach.
 *
 * Adam w wątku „Przypomnij idee kolorów i rodzin" ustalił to wprost:
 * „pasuje mi czerwony — odwaga i obrona, niebieski — myślenie i analiza,
 * żółty — ludzie i rozmowa, ale zielony to nie powinno być działanie
 * i organizacja. Działanie powinno być do czerwonego, a organizacja do
 * niebieskiego. Zielony powinien być związany z łagodnością, wspieraniem,
 * emocjami. Popraw dopasowanie tak, aby to pasowało do 4 kolorów osobowości".
 *
 * To nie jest kwestia gustu, tylko nauki grania: dziecko ma zapamiętać CZTERY
 * znaczenia, nie dwadzieścia. Jeśli zielony raz znaczy „wsparcie", a raz
 * „świat bez sieci", kolor przestaje cokolwiek podpowiadać i zostaje samo
 * dopasowywanie plamek.
 *
 * Test pilnuje słów, bo to one niosą znaczenie dziecku — nazwa i opis rodziny
 * są tym, co czyta na karcie.
 */

const KATEGORIE: CardCategory[] = ['psychological', 'digital', 'social', 'mentor', 'talent'];

/**
 * Słowa, które mają NIE pojawiać się przy danym kolorze — bo należą do innego.
 * Sprawdzamy zakazy, nie nakazy: nazwa może być poetycka („Serce"), byle nie
 * obiecywała czegoś, co w grze niesie inna barwa.
 */
const OBCE_SLOWA: Record<string, string[]> = {
  // Organizowanie i planowanie to niebieski.
  green: ['organiz', 'planow', 'kierowanie', 'prowadzić innych'],
  // Emocje i łagodność to zielony.
  blue: ['emocj', 'łagodn', 'wsparci'],
  // Rozmowa i dogadywanie się to żółty.
  red: ['rozmow', 'dogad'],
};

describe('kolory rodzin trzymają jedną ideę', () => {
  it.each(FAMILY_IDS)('kolor „%s" nie obiecuje tego, co niesie inny', (family) => {
    const obce = OBCE_SLOWA[family];
    if (!obce) return;

    for (const kategoria of KATEGORIE) {
      const rodzina = DEFAULT_FAMILIES[kategoria]?.find((f) => f.id === family);
      if (!rodzina) continue;

      const tekst = `${rodzina.name} ${rodzina.description}`.toLowerCase();
      for (const slowo of obce) {
        expect(
          tekst.includes(slowo),
          `${kategoria}/${family} („${rodzina.name}") używa słowa „${slowo}", ` +
            'które w grze niesie inny kolor',
        ).toBe(false);
      }
    }
  });

  it('każda kategoria ma komplet czterech kolorów', () => {
    for (const kategoria of KATEGORIE) {
      const kolory = (DEFAULT_FAMILIES[kategoria] ?? []).map((f) => f.id);
      expect(new Set(kolory), `${kategoria}`).toEqual(new Set(FAMILY_IDS));
    }
  });

  it('żadna rodzina nie jest bez nazwy ani bez opisu', () => {
    for (const kategoria of KATEGORIE) {
      for (const rodzina of DEFAULT_FAMILIES[kategoria] ?? []) {
        expect(rodzina.name.trim(), `${kategoria}/${rodzina.id}`).not.toBe('');
        expect(rodzina.description.trim(), `${kategoria}/${rodzina.id}`).not.toBe('');
      }
    }
  });
});
