import { useEffect, useState } from 'react';
import { Button } from '../ui/controls/Button';
import { TextField } from '../ui/controls/Field';
import { Icon } from '../ui/icons/Icon';
import { useToast } from '../ui/controls/Toast';

interface AccountPanelProps {
  email: string | null;
  /** Imię z konta. Puste, gdy nikt go jeszcze nie ustawił. */
  displayName: string | null;
  onSaveName: (name: string) => Promise<{ ok: boolean; error?: string }>;
  onChangePassword: (
    current: string,
    next: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}

/**
 * Ustawienia własnego konta.
 *
 * Firebase Console pozwala założyć konto i zmienić hasło z zewnątrz, ale
 * `displayName` dla kont e-mail istnieje wyłącznie w API i tylko dla
 * zalogowanego. Bez tej zakładki nie dałoby się go ustawić w ogóle, a pod
 * każdą wypowiedzią w dyskusji stałby adres e-mail.
 *
 * Hasło zmienia się tutaj, bo osoba z zespołu dostaje je od właściciela
 * projektu przy zakładaniu konta — i powinna móc je zmienić bez proszenia
 * kogokolwiek.
 */
export function AccountPanel({
  email,
  displayName,
  onSaveName,
  onChangePassword,
}: AccountPanelProps) {
  const [name, setName] = useState(displayName ?? '');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const toast = useToast();

  // Imię mogło zmienić się gdzie indziej — pole ma nadążać.
  useEffect(() => {
    setName(displayName ?? '');
  }, [displayName]);

  const saveName = async () => {
    setSavingName(true);
    const result = await onSaveName(name);
    setSavingName(false);

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się zapisać imienia.', 'danger');
      return;
    }
    toast('Imię zapisane. Tak podpiszą się Twoje wypowiedzi.', 'success');
  };

  const changePassword = async () => {
    if (nextPassword !== repeatPassword) {
      toast('Nowe hasła się różnią.', 'danger');
      return;
    }

    setChanging(true);
    const result = await onChangePassword(currentPassword, nextPassword);
    setChanging(false);

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się zmienić hasła.', 'danger');
      return;
    }

    setCurrentPassword('');
    setNextPassword('');
    setRepeatPassword('');
    toast('Hasło zmienione.', 'success');
  };

  const nameChanged = name.trim() !== (displayName ?? '').trim();
  const passwordReady =
    currentPassword.length > 0 && nextPassword.length > 0 && repeatPassword.length > 0;

  return (
    <section aria-label="Konto">
      <h2 className="font-display text-xl font-bold">Konto</h2>
      <p className="mt-1 text-sm text-ink-dim">
        Zalogowano jako <span className="text-ink">{email ?? 'nieznane konto'}</span>
      </p>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {/* Imię */}
        <div className="rounded-xl border border-edge bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="text-accent">
              <Icon name="people" size={18} />
            </span>
            <h3 className="font-display font-bold">Twoje imię</h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-dim">
            Tym podpisują się Twoje wypowiedzi w dyskusjach i zgłoszeniach. Bez
            imienia widoczny jest adres e-mail.
          </p>

          <div className="mt-3 flex items-end gap-2">
            <TextField
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameChanged) void saveName();
              }}
              placeholder="Imię"
              aria-label="Twoje imię"
              maxLength={40}
              className="flex-1"
            />
            <Button
              variant="primary"
              icon="tick"
              onClick={() => void saveName()}
              disabled={savingName || !nameChanged || name.trim().length === 0}
            >
              {savingName ? 'Zapisuję…' : 'Zapisz'}
            </Button>
          </div>
        </div>

        {/* Hasło */}
        <div className="rounded-xl border border-edge bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="text-accent">
              <Icon name="lock" size={18} />
            </span>
            <h3 className="font-display font-bold">Zmiana hasła</h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-dim">
            Podaj obecne hasło — to potwierdza, że przy komputerze siedzi
            właściciel konta, a nie ktoś, kto zastał otwartą przeglądarkę.
          </p>

          <div className="mt-3 space-y-2">
            <TextField
              type="password"
              label="Obecne hasło"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <TextField
              type="password"
              label="Nowe hasło"
              value={nextPassword}
              onChange={(e) => setNextPassword(e.target.value)}
              autoComplete="new-password"
              hint="Co najmniej 6 znaków."
            />
            <TextField
              type="password"
              label="Powtórz nowe hasło"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              autoComplete="new-password"
              error={
                repeatPassword.length > 0 && repeatPassword !== nextPassword
                  ? 'Hasła się różnią.'
                  : undefined
              }
            />
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              variant="primary"
              onClick={() => void changePassword()}
              disabled={changing || !passwordReady}
            >
              {changing ? 'Zmieniam…' : 'Zmień hasło'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
