import { describe, it, expect } from 'vitest';
import { isIconName } from '../ui/icons/Icon';
import { ALL_CARDS, buildDeck } from './cards';

describe('ALL_CARDS', () => {
  it('ma unikalne identyfikatory', () => {
    const ids = ALL_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('każda karta ma nazwę, opis i emoji', () => {
    for (const card of ALL_CARDS) {
      expect(card.name.length, `karta ${card.id} bez nazwy`).toBeGreaterThan(0);
      expect(card.description.length, `karta ${card.id} bez opisu`).toBeGreaterThan(0);
      expect(isIconName(card.icon), `karta ${card.id}: nieznana ikona ${card.icon}`).toBe(true);
    }
  });

  /**
   * Zgłoszenie „Do poprawki: Karta robocza: Nieustępliwość" (ze Strefy Nudy):
   * „za trudne słowo" dla gry 8-13 lat. Nie może to być „Wytrwałość" —
   * ten prostszy synonim jest już zajęty przez kartę talentu
   * (`tal-r-wytrwalosc`), więc dwie karty nosiłyby tę samą nazwę
   * (dokładnie to, co wyłapuje statystyka „Powtórzone nazwy").
   */
  it('karta psy-r-wytrwalosc nie nosi trudnego słowa „Nieustępliwość" ani nazwy zajętej przez inną kartę', () => {
    const card = ALL_CARDS.find((c) => c.id === 'psy-r-wytrwalosc');
    expect(card, 'karta psy-r-wytrwalosc zniknęła z ALL_CARDS').toBeTruthy();
    expect(card!.name).not.toBe('Nieustępliwość');

    const inna = ALL_CARDS.filter((c) => c.id !== card!.id);
    expect(
      inna.some((c) => c.name === card!.name),
      `nazwa „${card!.name}" koliduje z inną kartą`,
    ).toBe(false);
  });

  it('zawiera karty każdej kategorii kompetencji', () => {
    for (const category of ['psychological', 'digital', 'social'] as const) {
      const count = ALL_CARDS.filter((c) => c.category === category).length;
      expect(count, `za mało kart kategorii ${category}`).toBeGreaterThanOrEqual(6);
    }
  });

  it('zawiera talenty i mentorów', () => {
    expect(ALL_CARDS.filter((c) => c.category === 'talent').length).toBeGreaterThanOrEqual(6);
    expect(ALL_CARDS.filter((c) => c.category === 'mentor').length).toBeGreaterThanOrEqual(6);
  });

  it('każdy Czarny Łabędź ma określony wariant', () => {
    const swans = ALL_CARDS.filter((c) => c.category === 'blackswan');
    expect(swans.length).toBeGreaterThanOrEqual(3);
    for (const swan of swans) {
      expect(swan.blackSwanKind, `łabędź ${swan.id} bez wariantu`).toBeDefined();
    }
  });

  it('zawiera kartę ETER11', () => {
    expect(ALL_CARDS.some((c) => c.category === 'eter11')).toBe(true);
  });
});

describe('buildDeck', () => {
  it('talia jest wystarczająca dla 4 graczy przez 7 misji', () => {
    expect(buildDeck().length).toBeGreaterThanOrEqual(60);
  });

  it('identyfikatory w talii pozostają unikalne po zwielokrotnieniu', () => {
    const ids = buildDeck().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('karty specjalne nie są zwielokrotniane', () => {
    const deck = buildDeck();
    const swans = deck.filter((c) => c.category === 'blackswan');
    const originals = ALL_CARDS.filter((c) => c.category === 'blackswan');
    expect(swans).toHaveLength(originals.length);
  });
});
