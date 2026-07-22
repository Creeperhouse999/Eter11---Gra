import { useRef, useState } from 'react';
import { Button } from '../controls/Button';
import { Modal } from '../controls/Modal';
import { TextField, TextArea } from '../controls/Field';
import { Icon } from '../icons/Icon';
import { useToast } from '../controls/Toast';

/**
 * Zgłoszenie błędu wprost z gry.
 *
 * Gracz nie ma konta ani dostępu do panelu, a przy stole najłatwiej zauważyć,
 * że coś nie działa. Mały przycisk w rogu otwiera krótki formularz; zgłoszenie
 * trafia do panelu jako „czeka na akceptację", podpisane „gracz", bo nie ma
 * jak mu odpisać — dlatego pomija normalny obieg i czeka na moderatora.
 *
 * Widoczny tylko w normalnej rozgrywce, nie w samouczku: dziecko się wtedy
 * uczy, a nie zgłasza.
 */
export function ReportButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  // Ref, nie stan: `sending` w stanie zmienia się dopiero po renderze, więc
  // dwa szybkie kliknięcia zdążyłyby wysłać dwa zgłoszenia, zanim przycisk
  // się wyłączy. Ref blokuje drugie wejście natychmiast.
  const inFlight = useRef(false);
  const toast = useToast();

  const send = async () => {
    if (inFlight.current || title.trim().length === 0) return;
    inFlight.current = true;
    setSending(true);

    // Import dynamiczny: pakiet Firestore waży więcej niż reszta gry, a
    // zgłoszenie to rzadkość — nie ma po co ładować go przy każdej partii.
    const { addReport } = await import('../../firebase/reports');
    const result = await addReport({
      kind: 'bug',
      title,
      description,
      author: 'gracz',
      // Z gry zawsze do akceptacji — nie ma konta ani roli, więc moderator
      // decyduje, czy to trafia do realizacji.
      status: 'pending',
    });

    setSending(false);
    inFlight.current = false;
    if (!result.ok) {
      toast(result.error ?? 'Nie udało się wysłać zgłoszenia.', 'danger');
      return;
    }

    setTitle('');
    setDescription('');
    setOpen(false);
    toast('Dzięki! Zgłoszenie trafiło do zespołu.', 'success');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Zgłoś błąd"
        title="Zgłoś błąd"
        className="fixed bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-surface text-ink-dim shadow-lg transition hover:border-accent hover:text-accent"
        style={{ zIndex: 'var(--z-hint)' }}
      >
        <Icon name="megaphone" size={18} />
      </button>

      <Modal open={open} title="Zgłoś błąd" onClose={() => setOpen(false)}>
        <div>
          <p className="text-sm text-ink-dim">
            Coś nie działa? Napisz krótko, co i gdzie. Zgłoszenie trafi do zespołu.
          </p>

          <div className="mt-3 space-y-2">
            <TextField
              label="Co się dzieje?"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Krótko: co jest nie tak"
            />
            <TextArea
              label="Szczegóły (opcjonalnie)"
              value={description}
              maxLength={4000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Co dokładnie się stało i kiedy."
              rows={3}
            />
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button
              variant="primary"
              icon="rocket"
              onClick={() => void send()}
              disabled={sending || title.trim().length === 0}
            >
              {sending ? 'Wysyłam…' : 'Wyślij'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
