import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import type { TeamMember } from '../firebase/roles';

/**
 * Regresja: „kosz" na własnym wierszu obchodził zabezpieczenie, które
 * `changeRole` ma jawnie — admin mógł usunąć własny wpis roli, spaść do
 * coworkera i stracić zakładkę Zespół bez możliwości przywrócenia sobie
 * admina. Guard w `remove()` ma temu zapobiec dla własnego konta i konta
 * założyciela.
 */

const removeRole = vi.fn(async (_uid: string) => {});
const setRole = vi.fn(async (_m: TeamMember) => {});
let team: TeamMember[] = [];

vi.mock('../firebase/roles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/roles')>();
  return {
    ...actual,
    watchTeam: (cb: (m: TeamMember[]) => void) => {
      cb(team);
      return () => {};
    },
    removeRole: (uid: string) => removeRole(uid),
    setRole: (m: TeamMember) => setRole(m),
  };
});

const { TeamPanel } = await import('./TeamPanel');
const { ROOT_ADMIN_EMAIL } = await import('../firebase/roles');

const renderPanel = (currentUid: string) =>
  render(
    <ToastProvider>
      <TeamPanel currentUid={currentUid} />
    </ToastProvider>,
  );

beforeEach(() => {
  removeRole.mockClear();
  setRole.mockClear();
});

describe('TeamPanel — ochrona przed samo-wylogowaniem', () => {
  it('nie usuwa własnego wpisu roli: pokazuje ostrzeżenie zamiast pytać o potwierdzenie', async () => {
    team = [
      { uid: 'me', email: 'admin@eter11.pl', role: 'admin' },
      { uid: 'other', email: 'kolega@eter11.pl', role: 'coworker' },
    ];
    renderPanel('me');

    fireEvent.click(screen.getByLabelText('Usuń wpis roli admin@eter11.pl'));

    // Buggy wersja otwierała dialog potwierdzenia — poprawka spina go PRZED.
    expect(screen.queryByText('Usunąć wpis roli?')).toBeNull();
    expect(await screen.findByText(/własnego wpisu/i)).toBeTruthy();
    expect(removeRole).not.toHaveBeenCalled();
  });

  it('nie usuwa wpisu konta założyciela', async () => {
    team = [{ uid: 'root', email: ROOT_ADMIN_EMAIL, role: 'admin' }];
    renderPanel('me');

    fireEvent.click(screen.getByLabelText(`Usuń wpis roli ${ROOT_ADMIN_EMAIL}`));

    expect(screen.queryByText('Usunąć wpis roli?')).toBeNull();
    expect(await screen.findByText(/założyciela/i)).toBeTruthy();
    expect(removeRole).not.toHaveBeenCalled();
  });

  it('cudzy wpis nadal da się usunąć — pojawia się pytanie o potwierdzenie', async () => {
    team = [
      { uid: 'me', email: 'admin@eter11.pl', role: 'admin' },
      { uid: 'other', email: 'kolega@eter11.pl', role: 'coworker' },
    ];
    renderPanel('me');

    fireEvent.click(screen.getByLabelText('Usuń wpis roli kolega@eter11.pl'));

    // Dla cudzego konta „kosz" działa jak dotąd: prosi o potwierdzenie.
    expect(await screen.findByText('Usunąć wpis roli?')).toBeTruthy();
  });
});
