import { describe, it, expect } from 'vitest';
import {
  canDelete,
  canModerate,
  skipsApproval,
  canDiscuss,
  canEdit,
  canReport,
  canManageRoles,
  type Role,
} from './roles';

/**
 * Uprawnienia ról decydują, kto co widzi i może w panelu. To fundament
 * bezpieczeństwa interfejsu (reguły bazy egzekwują backend, ale UI nie może
 * kusić akcją, której rola nie ma). Tabela poniżej jest źródłem prawdy —
 * zmiana uprawnienia bez zmiany tabeli wywala test.
 *
 * `programmer` to konto dewelopera traktowane jak admin. `info@eter11.pl` jest
 * adminem zawsze (obsłużone w rolaKonta, nie tutaj).
 */

const ROLES: Role[] = ['admin', 'programmer', 'co-admin', 'coworker', 'editor', 'viewer'];

// Dla każdej funkcji: które role dają `true`.
const TABLE: Record<string, { fn: (r: Role) => boolean; allowed: Role[] }> = {
  canDelete: { fn: canDelete, allowed: ['admin', 'programmer'] },
  canModerate: { fn: canModerate, allowed: ['admin', 'programmer', 'co-admin'] },
  skipsApproval: { fn: skipsApproval, allowed: ['admin', 'programmer', 'co-admin'] },
  canDiscuss: { fn: canDiscuss, allowed: ['admin', 'programmer', 'co-admin', 'coworker'] },
  canEdit: { fn: canEdit, allowed: ['admin', 'programmer', 'co-admin', 'coworker', 'editor'] },
  canReport: { fn: canReport, allowed: ['admin', 'programmer', 'co-admin', 'coworker', 'editor'] },
  canManageRoles: { fn: canManageRoles, allowed: ['admin', 'programmer'] },
};

describe('uprawnienia ról', () => {
  for (const [name, { fn, allowed }] of Object.entries(TABLE)) {
    describe(name, () => {
      for (const role of ROLES) {
        const expected = allowed.includes(role);
        it(`${role} → ${expected}`, () => {
          expect(fn(role)).toBe(expected);
        });
      }
    });
  }

  it('programmer ma dokładnie te same prawa co admin', () => {
    for (const { fn } of Object.values(TABLE)) {
      expect(fn('programmer')).toBe(fn('admin'));
    }
  });

  it('viewer nie może nic poza czytaniem', () => {
    for (const { fn } of Object.values(TABLE)) {
      expect(fn('viewer')).toBe(false);
    }
  });

  it('zamiana wątku w zgłoszenie (canModerate) tylko dla admin/programmer/co-admin', () => {
    // To pilnuje konkretnego wymagania: przycisk „Zrób z tego zgłoszenie"
    // w dyskusjach jest gated na canModerate.
    expect(canModerate('co-admin')).toBe(true);
    expect(canModerate('coworker')).toBe(false);
    expect(canModerate('editor')).toBe(false);
    expect(canModerate('viewer')).toBe(false);
  });
});
