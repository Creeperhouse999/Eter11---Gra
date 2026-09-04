import { describe, it, expect } from 'vitest';
import { canSetProgress, canModerate, type Role } from './roles';

/**
 * Alan: „pokazuj zmianę statusu tylko dla ciebie, itd. takie rzeczy też tylko
 * ty, nawet nie ja admin".
 *
 * Postęp prac to zdanie o MOJEJ robocie: „siedzę przy tym w tej chwili".
 * Gdy ustawić go mógł każdy moderator, plakietka przestawała cokolwiek
 * znaczyć — „Robi się" przy zgłoszeniu, którego nikt nie tknął, jest gorsze
 * niż brak plakietki.
 */

const WSZYSTKIE: Role[] = [
  'admin',
  'programmer',
  'co-admin',
  'coworker',
  'editor',
  'viewer',
];

describe('kto ustawia postęp prac', () => {
  it('programista tak', () => {
    expect(canSetProgress('programmer')).toBe(true);
  });

  it('nikt inny — admina włącznie', () => {
    for (const role of WSZYSTKIE.filter((r) => r !== 'programmer')) {
      expect(canSetProgress(role), `${role} nie ustawia postępu`).toBe(false);
    }
  });

  /**
   * Postęp jest węższy niż moderowanie: admin i co-admin nadal akceptują,
   * odrzucają i zmieniają status zgłoszenia. Odbieramy im wyłącznie plakietkę
   * „kto przy tym siedzi".
   */
  it('nie odbiera moderowania adminowi ani co-adminowi', () => {
    expect(canModerate('admin')).toBe(true);
    expect(canModerate('co-admin')).toBe(true);
  });
});
