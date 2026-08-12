import { describe, it, expect, vi } from 'vitest';

/**
 * Most między podpisem a kontem.
 *
 * Zgłoszenia i wątki zapisują tylko IMIĘ autora — nigdy identyfikatora konta.
 * Żeby powiadomienie trafiło do właściwej osoby, trzeba to imię dopasować do
 * listy zespołu. Ta funkcja jest jedynym miejscem, gdzie się to dzieje, a
 * pomyłka jest cicha: powiadomienie po prostu idzie do kogoś innego albo do
 * nikogo, i nikt się o tym nie dowiaduje.
 */

vi.mock('./client', () => ({ db: {}, auth: {} }));

const { uidsForAuthor } = await import('./notifications');

const zespol = [
  { uid: 'u-alan', email: 'info@eter11.pl', name: 'Alan' },
  { uid: 'u-adam', email: 'adam@eter11.pl', name: 'Adam' },
  { uid: 'u-marcin', email: 'marcin@eter11.pl' },
];

describe('uidsForAuthor — kto dostanie powiadomienie', () => {
  it('trafia po imieniu ustawionym przez admina', () => {
    expect(uidsForAuthor('Alan', zespol)).toEqual(['u-alan']);
  });

  it('nie rozróżnia wielkości liter ani spacji wokół', () => {
    // Historyczne wpisy bywają zapisane różnie („ADam", „ adam ").
    expect(uidsForAuthor('  aLaN ', zespol)).toEqual(['u-alan']);
  });

  it('trafia po adresie e-mail', () => {
    expect(uidsForAuthor('marcin@eter11.pl', zespol)).toEqual(['u-marcin']);
  });

  it('trafia po części adresu przed małpą, gdy imienia nie ustawiono', () => {
    // Marcin nie ma ustawionego imienia — podpisuje się częścią adresu.
    expect(uidsForAuthor('Marcin', zespol)).toEqual(['u-marcin']);
  });

  it('nieznany podpis nie powiadamia nikogo, zamiast zgadywać', () => {
    expect(uidsForAuthor('Ktoś Obcy', zespol)).toEqual([]);
  });

  it('pusty podpis nie powiadamia nikogo', () => {
    expect(uidsForAuthor('   ', zespol)).toEqual([]);
  });

  /**
   * Sedno: imię jednej osoby nie może być jednocześnie początkiem adresu
   * drugiej. Gdy tak jest, powiadomienie ma trafić do OBU — lepiej powiadomić
   * o jedno konto za dużo niż pominąć właściwego adresata i zostawić go bez
   * informacji, że ktoś odpisał w jego wątku.
   */
  it('przy zbieżności imienia i adresu powiadamia oba konta, nie zgaduje', () => {
    const zbiezny = [
      { uid: 'u-adam', email: 'adam@eter11.pl', name: 'Adam' },
      { uid: 'u-inny', email: 'adam@inna-firma.pl', name: 'Damian' },
    ];
    expect(uidsForAuthor('Adam', zbiezny).sort()).toEqual(['u-adam', 'u-inny']);
  });
});
