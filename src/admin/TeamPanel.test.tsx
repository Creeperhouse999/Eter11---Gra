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

  /**
   * „Nadaj rolę" obchodziło te same guardy, które ma changeRole/remove: admin
   * mógł wpisać WŁASNY uid z niższą rolą i zdegradować sam siebie, tracąc
   * zakładkę Zespół. Formularz musi odrzucić samo-degradację i degradację
   * konta założyciela — tak samo jak pozostałe ścieżki.
   */
  const fillAndAdd = (email: string, uid: string) => {
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
    fireEvent.change(screen.getByLabelText('UID'), { target: { value: uid } });
    // Rola domyślna to „coworker" — czyli degradacja z admina.
    fireEvent.click(screen.getByRole('button', { name: 'Nadaj' }));
  };

  it('nie pozwala nadać sobie niższej roli (samo-degradacja) przez „Nadaj rolę"', async () => {
    team = [];
    renderPanel('me');

    fillAndAdd('admin@eter11.pl', 'me');

    expect(await screen.findByText(/samemu sobie/i)).toBeTruthy();
    expect(setRole).not.toHaveBeenCalled();
  });

  it('nie pozwala zdegradować konta założyciela przez „Nadaj rolę"', async () => {
    team = [];
    renderPanel('me');

    fillAndAdd(ROOT_ADMIN_EMAIL, 'rootUID');

    expect(await screen.findByText(/założyciela/i)).toBeTruthy();
    expect(setRole).not.toHaveBeenCalled();
  });

  it('nadanie roli innemu kontu nadal działa', async () => {
    team = [];
    renderPanel('me');

    fillAndAdd('nowy@eter11.pl', 'nowy-uid');

    await screen.findByText(/Rola nadana/i);
    expect(setRole).toHaveBeenCalledTimes(1);
  });

  /**
   * Regresja: w odróżnieniu od `changeRole`/`add` w tym samym pliku, `remove`
   * wołało `removeRole` bez try/catch — odrzucony zapis (reguły, wygasła
   * sesja) kończył się niewyłapanym odrzuceniem obietnicy i CISZĄ: brak
   * toasta, admin nie wie, że kliknięcie „Usuń" nic nie zrobiło.
   */
  it('nieudane usunięcie wpisu roli pokazuje komunikat błędu, nie ciszę', async () => {
    team = [
      { uid: 'me', email: 'admin@eter11.pl', role: 'admin' },
      { uid: 'other', email: 'kolega@eter11.pl', role: 'coworker' },
    ];
    removeRole.mockRejectedValueOnce(new Error('permission-denied'));
    renderPanel('me');

    fireEvent.click(screen.getByLabelText('Usuń wpis roli kolega@eter11.pl'));
    fireEvent.click(await screen.findByRole('button', { name: 'Usuń' }));

    expect(await screen.findByText(/nie udało się/i)).toBeTruthy();
  });
});
