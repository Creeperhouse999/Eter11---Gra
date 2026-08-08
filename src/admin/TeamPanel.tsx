import { useEffect, useState } from 'react';
import {
  watchTeam,
  setRole,
  removeRole,
  ROLE_LABELS,
  ROLE_HINTS,
  ROOT_ADMIN_EMAIL,
  type Role,
  type TeamMember,
} from '../firebase/roles';
import { Button } from '../ui/controls/Button';
import { Select } from '../ui/controls/Select';
import { TextField } from '../ui/controls/Field';
import { Icon } from '../ui/icons/Icon';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';

interface TeamPanelProps {
  /** UID zalogowanego admina — nie pozwalamy odebrać roli samemu sobie. */
  currentUid: string;
}

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as Role[]).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
  hint: ROLE_HINTS[role],
}));

/**
 * Wspólny bezpiecznik degradacji — jedno źródło dla zmiany roli i „Nadaj rolę".
 *
 * Zwraca powód odmowy albo `null`, gdy operacja jest dozwolona. Wcześniej te
 * same reguły miał tylko `changeRole`, a formularz „Nadaj rolę" (`add`) wołał
 * `setRole` na wprost — więc admin, który wpisał WŁASNY uid z niższą rolą,
 * degradował sam siebie i tracił zakładkę Zespół (jedyne miejsce, z którego da
 * się odzyskać admina poza kontem założyciela). Ten sam rozjazd, przed którym
 * chroni ujednolicenie: reguła w jednym miejscu, nie kopiowana ścieżka po ścieżce.
 */
export function roleGuardReason(
  target: { uid: string; email: string },
  role: Role,
  currentUid: string,
): string | null {
  if (target.uid === currentUid && role !== 'admin') {
    return 'Nie odbierzesz roli admina samemu sobie.';
  }
  if (target.email === ROOT_ADMIN_EMAIL && role !== 'admin') {
    return 'Konta założyciela nie da się zdegradować.';
  }
  return null;
}

/**
 * Zarządzanie rolami zespołu — widoczne tylko dla admina.
 *
 * Firebase nie pozwala wypisać wszystkich kont z poziomu aplikacji (to
 * operacja Admin SDK), więc listę budujemy z wpisów ról w bazie plus konta,
 * które admin doda ręcznie po adresie. Konto bez wpisu jest coworkerem —
 * pojawia się tu dopiero, gdy admin nada mu jawnie inną rolę.
 */
export function TeamPanel({ currentUid }: TeamPanelProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newUid, setNewUid] = useState('');
  const [newRole, setNewRole] = useState<Role>('coworker');

  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    const stop = watchTeam((next) => {
      setMembers(next);
      setLoading(false);
    });
    return stop;
  }, []);

  const changeRole = async (member: TeamMember, role: Role) => {
    // Bezpiecznik degradacji (własne konto, konto założyciela) — wspólny z
    // formularzem „Nadaj rolę", żeby żadna ścieżka go nie obeszła.
    const blocked = roleGuardReason(member, role, currentUid);
    if (blocked) {
      toast(blocked, 'danger');
      return;
    }
    try {
      await setRole({ ...member, role });
      toast(`${member.email}: ${ROLE_LABELS[role]}.`, 'success');
    } catch {
      toast('Nie udało się zmienić roli.', 'danger');
    }
  };

  const add = async () => {
    const email = newEmail.trim();
    const uid = newUid.trim();
    if (!email || !uid) {
      toast('Podaj adres e-mail i UID konta.', 'danger');
      return;
    }
    // Ten sam bezpiecznik co przy zmianie roli: „Nadaj rolę" nie może posłużyć
    // do samo-degradacji (własny uid) ani degradacji konta założyciela.
    const blocked = roleGuardReason({ uid, email }, newRole, currentUid);
    if (blocked) {
      toast(blocked, 'danger');
      return;
    }
    try {
      await setRole({ uid, email, role: newRole });
      setNewEmail('');
      setNewUid('');
      setNewRole('coworker');
      toast('Rola nadana.', 'success');
    } catch {
      toast('Nie udało się nadać roli.', 'danger');
    }
  };

  const remove = async (member: TeamMember) => {
    // Te same zabezpieczenia co przy zmianie roli — inaczej „kosz" na
    // własnym wierszu obchodził je bokiem: usunięcie własnego wpisu cofa
    // rolę do coworkera, a wtedy znika zakładka Zespół i nie ma jak
    // przywrócić sobie admina (poza kontem założyciela). Guard MUSI stać
    // przed potwierdzeniem, żeby dialog w ogóle się nie pokazał.
    if (member.uid === currentUid) {
      toast('Nie usuniesz własnego wpisu roli — stracił(a)byś dostęp do zarządzania zespołem.', 'danger');
      return;
    }
    if (member.email === ROOT_ADMIN_EMAIL) {
      toast('Wpisu konta założyciela nie da się usunąć.', 'danger');
      return;
    }
    const confirmed = await confirm({
      title: 'Usunąć wpis roli?',
      message: `${member.email} wróci do domyślnej roli (coworker). Konto nie znika — tylko jego wpis roli.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await removeRole(member.uid);
      toast('Wpis roli usunięty.');
    } catch {
      toast('Nie udało się usunąć wpisu roli.', 'danger');
    }
  };

  return (
    <section aria-label="Zespół">
      {dialog}
      <h2 className="font-display text-lg font-bold">Zespół</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Role decydują, kto co może w panelu. Konto bez wpisu jest coworkerem.
        Adres <span className="text-ink">{ROOT_ADMIN_EMAIL}</span> jest adminem
        zawsze i nie da się tego zmienić.
      </p>

      {/* Nadanie roli nowemu kontu */}
      <div className="mt-4 rounded-xl border border-edge bg-surface p-4">
        <h3 className="font-display font-bold">Nadaj rolę</h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-dim">
          UID konta znajdziesz w Firebase Console → Authentication → Users.
          Aplikacja nie potrafi wypisać kont sama, więc dodajesz je po adresie
          i UID.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end">
          <TextField
            label="E-mail"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="ktos@eter11.pl"
          />
          <TextField
            label="UID"
            value={newUid}
            onChange={(e) => setNewUid(e.target.value)}
            placeholder="np. N8KRfRu…"
          />
          <Select
            label="Rola"
            value={newRole}
            options={ROLE_OPTIONS}
            onChange={setNewRole}
          />
          <Button variant="primary" icon="plus" onClick={() => void add()}>
            Nadaj
          </Button>
        </div>
      </div>

      {loading && <p className="mt-4 text-sm text-ink-dim">Wczytuję…</p>}

      {!loading && members.length === 0 && (
        <p className="mt-4 rounded-lg border border-edge bg-surface p-3 text-sm text-ink-dim">
          Nikomu jeszcze nie nadano roli. Wszyscy poza adminem są coworkerami.
        </p>
      )}

      <ul className="eter-stagger mt-4 space-y-2">
        {members.map((member) => (
          <li
            key={member.uid}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-edge bg-surface p-3"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{member.email}</span>
              <span className="block truncate font-mono text-[10px] text-ink-dim">
                {member.uid}
              </span>
            </span>

            <div className="w-40 shrink-0">
              <Select
                ariaLabel={`Rola ${member.email}`}
                value={member.role}
                options={ROLE_OPTIONS}
                onChange={(role) => void changeRole(member, role)}
              />
            </div>

            <Button
              size="sm"
              variant="ghost"
              icon="trash"
              aria-label={`Usuń wpis roli ${member.email}`}
              className="shrink-0 text-danger"
              onClick={() => void remove(member)}
            />
          </li>
        ))}
      </ul>

      {/* Ściąga ról */}
      <div className="mt-6 rounded-lg border border-edge bg-surface p-3">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Icon name="info" size={14} />
          Co która rola może
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-ink-dim">
          {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
            <li key={role}>
              <span className="font-semibold text-ink">{ROLE_LABELS[role]}</span> —{' '}
              {ROLE_HINTS[role]}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
