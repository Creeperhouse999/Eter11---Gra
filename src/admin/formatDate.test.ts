import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

/**
 * Uszkodzona data nie może wypisać się jako „Invalid Date".
 *
 * To angielski komunikat techniczny w polskim panelu — dla Adama czy Joanny
 * wygląda jak awaria, choć znaczy tylko tyle, że jeden wpis ma zepsuty
 * znacznik czasu. A trafić tam może: zgłoszenie wysyła też osoba bez konta
 * (tak zdecydował właściciel), a reguły bazy nie sprawdzają formatu daty,
 * więc w polu `createdAt` może wylądować dowolny tekst.
 *
 * Cztery panele miały własne kopie tej funkcji i tylko jedna sprawdzała
 * poprawność daty — dlatego jest teraz jedna wspólna.
 */

describe('formatDate — data w panelu', () => {
  it('poprawną datę pokazuje po polsku, z godziną', () => {
    const wynik = formatDate('2026-07-21T14:32:00.000Z');

    // Nie porównujemy dokładnego napisu (zależy od strefy maszyny) — sprawdzamy,
    // że jest dzień, skrócony miesiąc po polsku i godzina.
    expect(wynik).toMatch(/\d{1,2}\s+\p{L}+/u);
    expect(wynik).toMatch(/\d{2}:\d{2}/);
    expect(wynik).not.toMatch(/Invalid/i);
  });

  it.each([
    ['pusty tekst', ''],
    ['tekst, który nie jest datą', 'kiedyś tam'],
    ['data nie z tego świata', '2026-13-45T99:99:99Z'],
    ['brak wartości', undefined],
    ['null z bazy', null],
  ])('%s daje pusto, nie „Invalid Date"', (_opis, wejscie) => {
    const wynik = formatDate(wejscie as string | undefined | null);

    expect(wynik).toBe('');
  });
});
