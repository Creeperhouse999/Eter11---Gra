import { describe, it, expect, beforeEach } from 'vitest';
import { kodPasuje, czyOdblokowane, odblokuj, zablokuj } from './aiUnlock';

/**
 * Alan poprosił o bramkę na kod przed funkcjami ETER (AI): „w menu głównym
 * wpisujesz kod, który aktywuje w ogóle funkcje AI".
 *
 * Powód jest kosztowy, nie bezpieczeństwowy — sam Alan napisał przy tym
 * zgłoszeniu „Koszty… i jeszcze raz koszty…". Chodzi o to, żeby funkcja nie
 * chodziła u każdego dziecka, które dostało link do gry.
 */

beforeEach(() => {
  zablokuj();
});

describe('kod odblokowujący ETER', () => {
  it('poprawny kod pasuje', () => {
    expect(kodPasuje('ZanklodVanWriter')).toBe(true);
  });

  /**
   * Kod bywa przepisywany z kartki albo dyktowany na głos. Literówka
   * w wielkości liter nie jest powodem, żeby powiedzieć „zły kod" —
   * to frustracja bez żadnego zysku.
   */
  it('wielkość liter i spacje nie mają znaczenia', () => {
    expect(kodPasuje('zanklodvanwriter')).toBe(true);
    expect(kodPasuje('  ZANKLODVANWRITER  ')).toBe(true);
    expect(kodPasuje('Zanklod Van Writer')).toBe(true);
  });

  it('zły kod nie przechodzi', () => {
    expect(kodPasuje('zanklod')).toBe(false);
    expect(kodPasuje('')).toBe(false);
    expect(kodPasuje('VanWriterZanklod')).toBe(false);
  });
});

describe('zapamiętanie odblokowania', () => {
  it('na starcie ETER jest wyłączona', () => {
    expect(czyOdblokowane()).toBe(false);
  });

  it('po poprawnym kodzie zostaje włączona', () => {
    expect(odblokuj('ZanklodVanWriter')).toBe(true);
    expect(czyOdblokowane()).toBe(true);
  });

  it('zły kod niczego nie włącza', () => {
    expect(odblokuj('cokolwiek')).toBe(false);
    expect(czyOdblokowane()).toBe(false);
  });

  it('da się wyłączyć z powrotem', () => {
    odblokuj('ZanklodVanWriter');
    zablokuj();
    expect(czyOdblokowane()).toBe(false);
  });
});
