import { describe, it, expect } from 'vitest';
import { statusPoUwadze, etykietaUwagi } from './statusPoUwadze';
import type { ReportStatus } from './reports';

/**
 * Alan: „chciałem dodać komentarz jako ja do zgłoszenia w NOWE i poszło do
 * WRÓCIŁY, nie ma sensu".
 *
 * Przycisk dopisywania uwagi zawsze ustawiał `reopened`, niezależnie od tego,
 * gdzie zgłoszenie leżało. „Wróciło do poprawki" to jednak mocne zdanie:
 * znaczy „sprawdziłem naprawę i ona nie działa", stawia zgłoszenie na szczycie
 * kolejki i mówi, że ktoś już raz się zawiódł. Przy zgłoszeniu, którego nikt
 * jeszcze nie tknął, jest zwyczajnie nieprawdziwe.
 */

describe('status po dopisaniu uwagi', () => {
  it('uwaga do naprawionego odsyła do poprawki — było co sprawdzać', () => {
    expect(statusPoUwadze('fixed')).toBe('reopened');
  });

  it('uwaga do NOWEGO nie rusza statusu — to była zgłoszona usterka', () => {
    expect(statusPoUwadze('new')).toBe('new');
  });

  it('kolejna uwaga do zwróconego nie zmienia niczego', () => {
    expect(statusPoUwadze('reopened')).toBe('reopened');
  });

  it('uwaga do zamkniętych zostawia je zamkniętymi', () => {
    expect(statusPoUwadze('done')).toBe('done');
    expect(statusPoUwadze('dismissed')).toBe('dismissed');
  });

  it('uwaga do czekającego na akceptację nie wpycha go w obieg', () => {
    expect(statusPoUwadze('pending')).toBe('pending');
  });

  /**
   * Napis na przycisku musi mówić prawdę o skutku kliknięcia — inaczej
   * zgłaszający obiecuje sobie coś, czego przycisk nie zrobi (albo odwrotnie:
   * odsyła zgłoszenie, nie chcąc tego).
   */
  it('napis na przycisku zgadza się z tym, co przycisk robi', () => {
    const wszystkie: ReportStatus[] = [
      'pending',
      'new',
      'fixed',
      'reopened',
      'done',
      'dismissed',
    ];

    for (const status of wszystkie) {
      const odsyla = statusPoUwadze(status) !== status;
      const obiecuje = etykietaUwagi(status) === 'Odeślij do poprawki';
      expect(obiecuje, `napis przy „${status}" ma zgadzać się ze skutkiem`).toBe(odsyla);
    }
  });
});
