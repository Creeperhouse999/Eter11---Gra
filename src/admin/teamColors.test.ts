import { describe, it, expect, vi } from 'vitest';

/**
 * Kolor podpisu pod wypowiedzią.
 *
 * Zgłoszenia i wątki pamiętają tylko IMIĘ autora, nigdy konta — most między
 * podpisem a wpisem zespołu robi ta funkcja. Gdy się pomyli, awatar dostaje
 * cudzy kolor albo wraca do losowego wyliczonego z liter, a wygląda to jak
 * usterka: „ustawiłem Alanowi niebieski, a w dyskusjach jest różowy".
 * Alan zgłosił dokładnie ten objaw.
 *
 * Historyczne wpisy podpisywały się różnie: imieniem, adresem, samą jego
 * częścią przed małpą — wszystkie trzy muszą trafiać do właściwej osoby.
 */

vi.mock('../firebase/client', () => ({ db: {}, auth: {} }));
vi.mock('../firebase/roles', () => ({ watchTeam: () => () => {} }));

const { colorForAuthor } = await import('./useTeamColors');

const zespol = [
  { uid: 'u-alan', email: 'info@eter11.pl', name: 'Alan', color: '#38bdf8' },
  { uid: 'u-adam', email: 'adam@eter11.pl', name: 'Adam', color: '#ef4444' },
  // Marcin nie ma ustawionego imienia — podpisuje się częścią adresu.
  { uid: 'u-marcin', email: 'marcin@eter11.pl', color: '#22c55e' },
  // Joanna ma imię, ale admin nie nadał jej koloru.
  { uid: 'u-joanna', email: 'joanna@eter11.pl', name: 'Joanna' },
];

describe('colorForAuthor — kolor podpisu', () => {
  it('trafia po imieniu ustawionym przez admina', () => {
    expect(colorForAuthor('Alan', zespol)).toBe('#38bdf8');
  });

  it('nie rozróżnia wielkości liter ani spacji wokół', () => {
    // Wpisy historyczne bywają zapisane jako „ADam" albo „ adam ".
    expect(colorForAuthor('  aDaM ', zespol)).toBe('#ef4444');
  });

  it('trafia po pełnym adresie', () => {
    expect(colorForAuthor('info@eter11.pl', zespol)).toBe('#38bdf8');
  });

  it('trafia po części adresu przed małpą, gdy imienia nie ustawiono', () => {
    expect(colorForAuthor('Marcin', zespol)).toBe('#22c55e');
  });

  it('osoba bez nadanego koloru nie dostaje cudzego', () => {
    // Sedno: brak koloru ma zwrócić `undefined`, żeby awatar policzył sobie
    // własny z liter — a nie odziedziczył barwy kogoś z listy.
    expect(colorForAuthor('Joanna', zespol)).toBeUndefined();
  });

  it('nieznany podpis nie dostaje koloru', () => {
    expect(colorForAuthor('Ktoś Obcy', zespol)).toBeUndefined();
  });

  it('pusty podpis nie dostaje koloru', () => {
    expect(colorForAuthor('   ', zespol)).toBeUndefined();
  });

  it('pusta lista zespołu nie wywraca funkcji', () => {
    // Tak wygląda pierwszy render, zanim nasłuch przyniesie listę z bazy.
    expect(colorForAuthor('Alan', [])).toBeUndefined();
  });
});
