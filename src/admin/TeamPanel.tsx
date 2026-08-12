import { useEffect, useRef, useState } from 'react';
import {
  watchTeam,
  setRole,
  ROLE_LABELS,
  ROLE_HINTS,
  ROOT_ADMIN_EMAIL,
  type Role,
  type TeamMember,
} from '../firebase/roles';
import { Button } from '../ui/controls/Button';
import { Select } from '../ui/controls/Select';
import { TextField } from '../ui/controls/Field';
import { ColorPicker } from '../ui/controls/ColorPicker';
import { Icon } from '../ui/icons/Icon';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { Avatar, colorFor, COLOR_PRESETS } from './Avatar';
import { requestRemoval, watchRemovals, type AccountRemoval } from '../firebase/accountRemovals';

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
  /**
   * Imiona w trakcie wpisywania, per konto.
   *
   * Osobno od `members`, bo ta lista przychodzi z bazy na żywo — gdyby pole
   * czytało wprost z niej, każdy cudzy zapis kasowałby to, co admin właśnie
   * wpisuje. Wpis zostaje tu do momentu wyjścia z pola.
   */
  const [names, setNames] = useState<Record<string, string>>({});
  /**
   * Kolory w trakcie wybierania, per konto — jak `names`.
   *
   * Pole pokazuje to, co użytkownik właśnie przeciąga, a do bazy idzie dopiero
   * ustalona wartość (patrz `changeColor`). Bez tego suwak wracałby do starego
   * koloru przy każdym renderze, dopóki zapis nie dojdzie.
   */
  const [colors, setColors] = useState<Record<string, string | undefined>>({});
  /**
   * Zlecone usunięcia kont. Konto znika po chwili (wykonuje je Actions), więc
   * bez tej listy admin klikałby drugi raz, nie widząc żadnej zmiany.
   */
  const [removals, setRemovals] = useState<AccountRemoval[]>([]);
  useEffect(() => watchRemovals(setRemovals), []);
  /** Konta ze zleceniem, którego jeszcze nie wykonano — kosz im nie przysługuje. */
  const pendingRemoval = new Set(
    removals.filter((item) => !item.doneAt).map((item) => item.uid),
  );
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newUid, setNewUid] = useState('');
  const [newRole, setNewRole] = useState<Role>('coworker');

  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  // Opóźnione zapisy (kolor) muszą czytać AKTUALNĄ listę, nie tę z renderu,
  // w którym je zaplanowano — patrz `changeColor`.
  // Uzupełniamy przy NAPŁYWIE danych, nie przy renderze: opóźniony zapis
  // potrafi odpalić się, zanim React zdąży przerenderować po `setMembers`,
  // i wtedy widziałby jeszcze poprzednią listę.
  const membersRef = useRef<TeamMember[]>([]);

  useEffect(() => {
    const stop = watchTeam((next) => {
      membersRef.current = next;
      setMembers(next);
      setLoading(false);
    });
    return stop;
  }, []);

  /**
   * Konto założyciela bywa nieobecne na liście.
   *
   * Jest adminem po adresie (patrz `rolaKonta` w regułach), więc wpis w bazie
   * nie jest mu potrzebny — ale bez wpisu nie ma też imienia ani koloru, a
   * powiadomienia nie mają po czym go rozpoznać. Podpowiadamy więc adminowi,
   * żeby dodał sobie wpis, zamiast zostawiać ten przypadek w cieniu.
   */
  const founderMissing =
    !loading && !members.some((member) => member.email === ROOT_ADMIN_EMAIL);

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

  /**
   * Kolor awatara. `setRole` zapisuje CAŁY dokument, więc rolę przekazujemy
   * niezmienioną — zmiana koloru nie może przy okazji ruszyć uprawnień.
   *
   * Zapis po ustaniu ruchu, nie przy każdym drgnięciu suwaka.
   *
   * ColorPicker zgłasza każdą zmianę na bieżąco (w edytorze motywu to zaleta —
   * widać podgląd). Tutaj każde zgłoszenie szło do bazy i wyskakiwał toast,
   * więc jedno przeciągnięcie po polu koloru zasypywało ekran setką
   * komunikatów i tyloma samymi zapisami. Czekamy pół sekundy na spokój i
   * zapisujemy raz — kolor pod ręką aktualizuje się od razu, bo pole trzyma
   * własny stan.
   */
  const colorTimers = useRef<Record<string, number>>({});
  const changeColor = (member: TeamMember, color: string | undefined) => {
    setColors((prev) => ({ ...prev, [member.uid]: color }));

    window.clearTimeout(colorTimers.current[member.uid]);
    colorTimers.current[member.uid] = window.setTimeout(() => {
      void (async () => {
        try {
          // Wpis bierzemy świeży, z listy w chwili ZAPISU, a nie ten sprzed pół
          // sekundy. `setRole` zapisuje cały dokument (bez `merge` — inaczej nie
          // dałoby się skasować koloru), więc stary wpis cofałby imię zapisane
          // w międzyczasie: pole „Imię" pustoszało, a podpisy tej osoby
          // w wątkach wracały do adresu e-mail.
          const fresh = membersRef.current.find((m) => m.uid === member.uid) ?? member;
          await setRole({ ...fresh, color });
          toast(
            color ? `${member.email}: nowy kolor.` : `${member.email}: kolor domyślny.`,
            'success',
          );
        } catch {
          toast('Nie udało się zmienić koloru.', 'danger');
          // Cofamy podgląd do tego, co naprawdę jest w bazie.
          setColors((prev) => ({ ...prev, [member.uid]: member.color }));
        }
      })();
    }, 500);
  };

  // Zaległy zapis nie ma po co odpalać się po zamknięciu zakładki.
  useEffect(() => {
    const timers = colorTimers.current;
    return () => {
      Object.values(timers).forEach((id) => window.clearTimeout(id));
    };
  }, []);

  /**
   * Imię, którym podpisują się wpisy tej osoby.
   *
   * Ustawia je tutaj admin, bo imienia w cudzym koncie nie da się zmienić
   * z aplikacji — a bez jednego miejsca ta sama osoba podpisywała się raz
   * „Adam", raz „ADam", raz adresem e-mail. Puste pole znaczy „wróć do tego,
   * co poda samo konto".
   */
  const saveName = async (member: TeamMember) => {
    const next = (names[member.uid] ?? member.name ?? '').trim();
    // Bez zmiany nie ma po co pisać do bazy — `onBlur` odpala się przy każdym
    // wyjściu z pola, także gdy nikt nic nie wpisał.
    if (next === (member.name ?? '')) return;

    try {
      await setRole({ ...member, name: next || undefined });
      toast(next ? `${member.email}: podpisuje się „${next}".` : `${member.email}: imię z konta.`, 'success');
    } catch {
      toast('Nie udało się zapisać imienia.', 'danger');
      // Cofamy pole do stanu z bazy, żeby nie pokazywało zmiany, której nie ma.
      setNames((prev) => ({ ...prev, [member.uid]: member.name ?? '' }));
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

  /**
   * Trwałe usunięcie konta z Firebase.
   *
   * Panel tylko zleca: konta kasuje Admin SDK, którego klucz daje pełną władzę
   * nad projektem i w przeglądarce byłby do wyjęcia przez każdego. Zlecenie
   * podejmuje GitHub Actions (co dziesięć minut), więc konto znika po chwili,
   * a nie natychmiast — i tak to opisujemy, żeby admin nie klikał drugi raz.
   */
  const removeAccount = async (member: TeamMember) => {
    // Te same bezpieczniki co przy odbieraniu roli, tylko stawka wyższa:
    // tu nie ma czego przywracać.
    if (member.uid === currentUid) {
      toast('Nie usuniesz własnego konta — stracił(a)byś dostęp do panelu.', 'danger');
      return;
    }
    if (member.email === ROOT_ADMIN_EMAIL) {
      toast('Konta założyciela nie da się usunąć.', 'danger');
      return;
    }

    const confirmed = await confirm({
      title: 'Usunąć konto na stałe?',
      message: `${member.email} zniknie z Firebase razem z dostępem do panelu. Tego nie da się cofnąć — konto trzeba by założyć od nowa.`,
      confirmLabel: 'Usuń konto',
      tone: 'danger',
    });
    if (!confirmed) return;

    const result = await requestRemoval({
      uid: member.uid,
      email: member.email,
      requestedBy: currentUid,
    });
    if (!result.ok) {
      toast(result.error ?? 'Nie udało się zlecić usunięcia.', 'danger');
      return;
    }
    toast(`${member.email}: konto zostanie usunięte w ciągu kilku minut.`, 'success');
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

      {/* Konta usuwa GitHub Actions, więc między kliknięciem a zniknięciem
          mija chwila. Bez tej listy admin nie wiedziałby, czy kliknięcie
          w ogóle zadziałało, i klikał drugi raz. */}
      {removals.filter((item) => !item.doneAt).length > 0 && (
        <div className="mt-4 rounded-xl border border-accent bg-surface p-3">
          <p className="text-sm font-semibold">Konta w trakcie usuwania</p>
          <ul className="mt-1 space-y-0.5">
            {removals
              .filter((item) => !item.doneAt)
              .map((item) => (
                <li key={item.id} className="text-xs text-ink-dim">
                  {item.email || item.uid} — zniknie w ciągu kilku minut
                </li>
              ))}
          </ul>
        </div>
      )}

      {removals.some((item) => item.error) && (
        <div className="mt-4 rounded-xl border border-danger bg-surface p-3">
          <p className="text-sm font-semibold text-danger">
            Nie udało się usunąć konta
          </p>
          <ul className="mt-1 space-y-0.5">
            {removals
              .filter((item) => item.error)
              .map((item) => (
                <li key={item.id} className="text-xs text-ink-dim">
                  {item.email || item.uid}: {item.error}
                </li>
              ))}
          </ul>
        </div>
      )}

      {founderMissing && (
        <div className="mt-4 rounded-xl border border-accent bg-surface p-4">
          <p className="text-sm">
            Twojego konta nie ma jeszcze na liście — a to z niej biorą się imię,
            kolor i powiadomienia. Adminem jesteś tak czy inaczej.
          </p>
          <Button
            className="mt-3"
            size="sm"
            icon="plus"
            onClick={() => {
              setNewEmail(ROOT_ADMIN_EMAIL);
              setNewUid(currentUid);
              setNewRole('admin');
            }}
          >
            Wypełnij moimi danymi
          </Button>
        </div>
      )}

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
            {/* Podgląd — dokładnie ten awatar, który zobaczą inni w wątkach. */}
            <Avatar name={member.name || member.email} color={colors[member.uid] ?? member.color} size={32} />

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{member.email}</span>
              <span className="block truncate font-mono text-[10px] text-ink-dim">
                {member.uid}
              </span>
            </span>

            {/* Claude ma stałą tożsamość: podpisuje się swoim imieniem i nosi
                swój znak w firmowym pomarańczu. Nadanie mu innego imienia albo
                koloru tylko rozjeżdżałoby to, po czym zespół go rozpoznaje —
                więc zamiast pól pokazujemy, że tak zostaje. */}
            {member.role === 'programmer' ? (
              <div className="w-80 shrink-0 text-xs text-ink-dim">
                Podpisuje się jako <span className="text-ink">Claude</span> i ma
                swój znak — imienia ani koloru się tu nie zmienia.
              </div>
            ) : (
              <>
                <div className="w-40 shrink-0">
                  <TextField
                    label="Imię"
                    value={names[member.uid] ?? member.name ?? ''}
                    placeholder={member.email.split('@')[0]}
                    maxLength={40}
                    onChange={(e) =>
                      setNames((prev) => ({ ...prev, [member.uid]: e.target.value }))
                    }
                    // Zapis po wyjściu z pola, nie po każdej literze: inaczej każde
                    // naciśnięcie klawisza szłoby do bazy.
                    onBlur={() => void saveName(member)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                  />
                </div>

                <div className="w-40 shrink-0">
                  <ColorPicker
                    label={`Kolor ${member.email}`}
                    // Dopóki admin nie nada koloru, picker startuje od tego, który
                    // osoba ma teraz — inaczej otwierałby się na przypadkowym
                    // odcieniu, niezwiązanym z tym, co widać w wątku.
                    value={
                      colors[member.uid] ?? member.color ?? colorFor(member.name || member.email)
                    }
                    presets={COLOR_PRESETS}
                    onChange={(color) => void changeColor(member, color)}
                  />
                </div>
              </>
            )}

            <div className="w-40 shrink-0">
              <Select
                ariaLabel={`Rola ${member.email}`}
                value={member.role}
                options={ROLE_OPTIONS}
                onChange={(role) => void changeRole(member, role)}
              />
            </div>

            {/* Jeden kosz, i kasuje konto na stałe. Osobny przycisk „odbierz
                rolę" tylko mylił: koncie podglądowemu PODNOSIŁ uprawnienia
                (wracało do domyślnego coworkera), czyli robił odwrotność tego,
                po co sięga się po kosz.

                Gdy zlecenie już czeka, kosz ustępuje miejsca informacji —
                konto znika dopiero po chwili (kasuje je Actions), a bez tego
                admin klikałby w kółko, nie widząc żadnej zmiany. */}
            {pendingRemoval.has(member.uid) ? (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-danger">
                Usuwanie…
              </span>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                icon="trash"
                aria-label={`Usuń konto ${member.email} na stałe`}
                className="shrink-0 text-danger"
                onClick={() => void removeAccount(member)}
              />
            )}
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
