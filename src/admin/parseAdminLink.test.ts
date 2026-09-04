import { describe, it, expect } from 'vitest';
import { parseAdminLink } from './parseAdminLink';

/**
 * Link z powiadomienia ma dowozić do KONKRETU, nie do samej zakładki.
 *
 * Alan zgłaszał to dwa razy. Link niósł właściwe dane; gubiły się przy
 * przejściu, bo zmiana zakładki czyści parametry adresu, a `open` ustawiany
 * osobno zaraz po niej był kasowany. Panel woła teraz `navigate` z gotowym
 * celem — jednym przejściem.
 *
 * Ten test pilnuje rozkładania linku: gdyby `open` przestało z niego
 * wychodzić, powiadomienia znów prowadziłyby donikąd.
 */
describe('parseAdminLink', () => {
  it('z linku do dyskusji wyciąga zakładkę I wskazany wątek', () => {
    const cel = parseAdminLink('/admin/discussions?open=2026-08-11T18:53:34.213Z');

    expect(cel.tab).toBe('discussions');
    // Sedno zgłoszenia: bez tego panel otwiera samą listę wątków.
    expect(cel.params.open).toBe('2026-08-11T18:53:34.213Z');
  });

  it('z linku do zgłoszenia wyciąga pod-zakładkę i otwarte zgłoszenie', () => {
    const cel = parseAdminLink('/admin/reports/fixed?open=r1');

    expect(cel.tab).toBe('reports');
    expect(cel.sub).toBe('fixed');
    expect(cel.params.open).toBe('r1');
  });

  it('niesie filtr karty ze Strefy Nudy', () => {
    // Bez `filter` link otwierał pełną listę kart bez wskazania, której szukać.
    const cel = parseAdminLink('/admin/cards?filter=Odporno%C5%9B%C4%87');

    expect(cel.tab).toBe('cards');
    expect(cel.params.filter).toBe('Odporność');
  });

  it('link bez parametrów nie wymyśla pustych wartości', () => {
    // Pusty `open` w adresie wyglądałby jak wskazanie nieistniejącego wpisu.
    const cel = parseAdminLink('/admin/overview');

    expect(cel.tab).toBe('overview');
    expect(cel.sub).toBeNull();
    expect(cel.params).toEqual({});
  });

  it('identyfikator wątku z dwukropkami i kropkami przechodzi w całości', () => {
    // Wątki mają id w postaci znacznika czasu ISO — ucięcie na dwukropku
    // dałoby wskazanie na nieistniejący wpis.
    const cel = parseAdminLink('/admin/discussions?open=2026-09-04T10:00:00.000Z');

    expect(cel.params.open).toBe('2026-09-04T10:00:00.000Z');
  });
});
