import { Icon } from '../ui/icons/Icon';

interface AccountPanelProps {
  email: string | null;
  /** Imię, którym podpisują się wpisy — nadane w zakładce zespołu. */
  displayName: string | null;
}

/**
 * Ustawienia własnego konta — dziś sam podgląd.
 *
 * Zmiana hasła była tu wcześniej, ale konto redakcyjne bywa współdzielone:
 * jedna osoba zmieniająca hasło wylogowywała pozostałych, a nowego nikt inny
 * nie znał. Hasło ustawia się w Firebase Console, przez właściciela projektu.
 *
 * Imienia też się tu nie zmienia. Wcześniej każdy wpisywał je sobie sam
 * (`displayName` konta), przez co ta sama osoba podpisywała się raz „Adam",
 * raz „ADam", raz adresem e-mail — i nie dało się tego uporządkować, bo
 * imienia w cudzym koncie zmienić nie można. Teraz imiona nadaje admin przy
 * wpisie członka, więc wszędzie wyglądają tak samo.
 */
export function AccountPanel({ email, displayName }: AccountPanelProps) {

  return (
    <section aria-label="Konto" className="max-w-xl">
      <h2 className="font-display text-xl font-bold">Konto</h2>
      <p className="mt-1 text-sm text-ink-dim">
        Zalogowano jako <span className="text-ink">{email ?? 'nieznane konto'}</span>
      </p>

      <div className="mt-5 rounded-xl border border-edge bg-surface p-4">
        <div className="flex items-center gap-2">
          <span className="text-accent">
            <Icon name="people" size={18} />
          </span>
          <h3 className="font-display font-bold">Twoje imię</h3>
        </div>
        <p className="mt-1 text-sm">{displayName || email || 'nieznane'}</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-dim">
          Tym podpisują się Twoje wypowiedzi w dyskusjach, zgłoszeniach
          i pamięci zespołu. Imiona ustala admin, żeby wszędzie wyglądały tak
          samo — napisz do niego, jeśli chcesz je zmienić.
        </p>
      </div>

    </section>
  );
}
