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
}

/**
 * Ustawienia własnego konta.
 *
 * Tylko imię. Zmiana hasła była tu wcześniej, ale konto redakcyjne jest
 * współdzielone przez zespół — jedna osoba zmieniająca hasło wylogowywała
 * wszystkich pozostałych, a nowego hasła nikt inny nie znał. Hasło ustawia
 * się teraz wyłącznie w Firebase Console, przez właściciela projektu.
 *
 * `displayName` dla kont e-mail istnieje tylko w API i tylko dla
 * zalogowanego, więc tego pola nie da się zastąpić konsolą — stąd zostaje.
 */
export function AccountPanel({ email, displayName, onSaveName }: AccountPanelProps) {
  const [name, setName] = useState(displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const toast = useToast();

  // Imię mogło zmienić się gdzie indziej — pole ma nadążać.
  useEffect(() => {
    setName(displayName ?? '');
  }, [displayName]);

  const nameChanged = name.trim() !== (displayName ?? '').trim();
  // Jedno źródło warunku zapisu dla przycisku i Entera — inaczej Enter obchodził
  // wyłączony przycisk: przy pustym polu zapisywał puste imię i WYMAZYWAŁ je.
  const canSave = !savingName && nameChanged && name.trim().length > 0;

  const saveName = async () => {
    const trimmed = name.trim();
    // Bezpiecznik na wypadek wywołania z pominięciem `canSave` (np. Enter):
    // puste imię nie ma czego zapisać, a zapisalibyśmy nim istniejące.
    if (!trimmed) return;

    setSavingName(true);
    // Zapisujemy przycięte — inaczej „ Jan " podpisywałby wypowiedzi ze spacjami.
    const result = await onSaveName(trimmed);
    setSavingName(false);

    if (!result.ok) {
      toast(result.error ?? 'Nie udało się zapisać imienia.', 'danger');
      return;
    }
    toast('Imię zapisane. Tak podpiszą się Twoje wypowiedzi.', 'success');
  };

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
        <p className="mt-1 text-xs leading-relaxed text-ink-dim">
          Tym podpisują się Twoje wypowiedzi w dyskusjach i zgłoszeniach. Bez
          imienia widoczny jest adres e-mail.
        </p>

        <div className="mt-3 flex items-end gap-2">
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSave) void saveName();
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
            disabled={!canSave}
          >
            {savingName ? 'Zapisuję…' : 'Zapisz'}
          </Button>
        </div>
      </div>

    </section>
  );
}
