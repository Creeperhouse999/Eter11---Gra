import { useState } from 'react';
import { ALL_CHARACTERS } from '../data/characters';
import { Button } from '../ui/controls/Button';
import { TextField } from '../ui/controls/Field';
import { useToast } from '../ui/controls/Toast';
import { createRoom, joinRoom } from './room';

interface LobbyScreenProps {
  /** Wejście do pokoju — kod i własny uid. */
  onEnter: (code: string, uid: string) => void;
  onBack: () => void;
}

/**
 * Wejście do gry wieloosobowej: załóż pokój albo dołącz kodem.
 *
 * Bez konta — dziecko wpisuje imię i wybiera postać, jak w grze przy stole.
 * Host dostaje krótki kod (4 znaki, bez mylących 0/O/1/I), który reszta
 * wpisuje albo dostaje w linku.
 */
export function LobbyScreen({ onEnter, onBack }: LobbyScreenProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const create = async () => {
    if (!name.trim()) {
      toast('Wpisz swoje imię.', 'danger');
      return;
    }
    setBusy(true);
    try {
      const { code: newCode, uid } = await createRoom({
        hostName: name,
        // Postać wybiera się w poczekalni — tu tylko placeholder.
        characterId: ALL_CHARACTERS[0].id,
      });
      onEnter(newCode, uid);
    } catch (e) {
      // Surowy błąd (uprawnienia, sieć, ślady Firebase) trafia do konsoli dla
      // programisty, a gracz — to gra dla dzieci — widzi czytelny komunikat
      // zamiast technicznego szumu w rodzaju „PERMISSION_DENIED at /rooms".
      console.error('Zakładanie pokoju nie powiodło się:', e);
      toast('Nie udało się założyć pokoju. Spróbuj ponownie.', 'danger');
      setBusy(false);
    }
  };

  const join = async () => {
    if (!name.trim()) {
      toast('Wpisz swoje imię.', 'danger');
      return;
    }
    if (code.trim().length < 4) {
      toast('Wpisz czteroznakowy kod pokoju.', 'danger');
      return;
    }
    setBusy(true);
    try {
      const result = await joinRoom({ code, name, characterId: ALL_CHARACTERS[0].id });
      if (result.ok && result.uid) {
        onEnter(code.trim().toUpperCase(), result.uid);
      } else {
        toast(result.error ?? 'Nie udało się dołączyć.', 'danger');
        setBusy(false);
      }
    } catch (e) {
      // joinRoom woła Firebase (ensureSession/get/update) — sieć albo
      // uprawnienia mogą rzucić. Bez tego przechwycenia przycisk zostawał na
      // zawsze „Dołączam…", bo `setBusy(false)` nigdy nie biegło. Surowy błąd
      // do konsoli (dla programisty), a graczowi czytelny komunikat zamiast
      // technicznego śladu Firebase.
      console.error('Dołączanie do pokoju nie powiodło się:', e);
      toast('Nie udało się dołączyć. Sprawdź kod i spróbuj ponownie.', 'danger');
      setBusy(false);
    }
  };

  return (
    <main className="eter-fade-in relative mx-auto max-w-md px-4 py-10">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      <header className="relative">
        <span className="eter-label">Gra przez internet</span>
        <h1 className="font-display text-3xl font-bold text-accent">Zagraj z innymi</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Załóż pokój i podaj kod znajomym albo dołącz do ich pokoju.
        </p>
      </header>

      {/* Imię i postać — wspólne dla obu trybów. */}
      {mode !== 'choose' && (
        <section className="relative mt-6 rounded-xl border border-edge bg-surface p-4">
          <TextField
            label="Twoje imię"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Imię"
            maxLength={40}
          />

          <p className="mt-2 text-xs text-ink-dim">
            Postać wybierzesz w poczekalni — zobaczysz, które są jeszcze wolne.
          </p>
        </section>
      )}

      {mode === 'choose' && (
        <div className="relative mt-6 space-y-3">
          <Button
            variant="primary"
            size="lg"
            icon="plus"
            className="w-full"
            onClick={() => setMode('create')}
          >
            Załóż pokój
          </Button>
          <Button
            variant="secondary"
            size="lg"
            icon="people"
            className="w-full"
            onClick={() => setMode('join')}
          >
            Dołącz kodem
          </Button>
        </div>
      )}

      {mode === 'create' && (
        <div className="relative mt-4 space-y-3">
          <Button
            variant="primary"
            size="lg"
            icon="rocket"
            className="w-full"
            disabled={busy}
            onClick={() => void create()}
          >
            {busy ? 'Zakładam…' : 'Załóż pokój'}
          </Button>
        </div>
      )}

      {mode === 'join' && (
        <div className="relative mt-4 space-y-3">
          <TextField
            label="Kod pokoju"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="np. K7QP"
            maxLength={4}
            className="font-mono uppercase tracking-widest"
          />
          <Button
            variant="primary"
            size="lg"
            icon="rocket"
            className="w-full"
            disabled={busy}
            onClick={() => void join()}
          >
            {busy ? 'Dołączam…' : 'Dołącz'}
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={() => (mode === 'choose' ? onBack() : setMode('choose'))}
        className="relative mt-6 text-sm text-ink-dim underline hover:text-ink"
      >
        {mode === 'choose' ? 'Wróć do menu' : 'Wstecz'}
      </button>
    </main>
  );
}
