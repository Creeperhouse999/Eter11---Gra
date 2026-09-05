import { describe, it, expect } from 'vitest';
import { DEFAULT_FAMILIES } from './families';

/**
 * Dopasowanie „4 kolorów osobowości" w opisach rodzin.
 *
 * Adam w dyskusji „Przypomnij idee kolorów i rodzin": „czerwony — odwaga
 * i obrona, niebieski — myślenie i analiza, żółty — ludzie i rozmowa (…) ale
 * zielony to NIE powinno być działanie i organizacja. Działanie powinno być
 * do czerwonego, a organizacja do niebieskiego. Zielony powinien być
 * związany z łagodnością, wspieraniem, emocjami."
 *
 * Rodzina „społeczna/zielona" niosła dokładnie odwrotność: nazwa „Działanie
 * razem" i opis „łączyć ludzi i organizować wspólne działanie" — czyli oba
 * słowa, które Adam poprosił przenieść gdzie indziej.
 */
describe('rodziny „społeczne" — dopasowanie do 4 kolorów osobowości', () => {
  const social = DEFAULT_FAMILIES.social;
  const by = (id: 'red' | 'blue' | 'green') => social.find((f) => f.id === id)!;

  it('zielony nie niesie już działania ani organizacji — tylko łagodność/wsparcie', () => {
    const green = by('green');
    const tekst = `${green.name} ${green.description}`.toLowerCase();
    expect(tekst).not.toMatch(/działa/);
    expect(tekst).not.toMatch(/organizować|organizacj/);
    expect(tekst).toMatch(/wspiera|łagodn/);
  });

  it('czerwony niesie działanie — nie tylko obronę bez ruchu', () => {
    const red = by('red');
    expect(`${red.name} ${red.description}`.toLowerCase()).toMatch(/działa/);
  });

  it('niebieski niesie organizację/planowanie — nie samo „krytyczne myślenie"', () => {
    const blue = by('blue');
    expect(`${blue.name} ${blue.description}`.toLowerCase()).toMatch(/plan|organiz/);
  });
});
