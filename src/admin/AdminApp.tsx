import { useEffect, useMemo, useState } from 'react';
import { applyTheme } from '../data/theme';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { loadContent, saveContent } from '../firebase/content';
import type { GameContent } from '../firebase/validate';
import { validateContent } from '../firebase/validate';
import { Alert } from '../ui/controls/Alert';
import { Button } from '../ui/controls/Button';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { Icon, type IconName } from '../ui/icons/Icon';
import { CardEditor } from './CardEditor';
import { CharacterEditor } from './CharacterEditor';
import { DeckOverview } from './DeckOverview';
import { FamilyEditor } from './FamilyEditor';
import { LoginForm } from './LoginForm';
import { ProblemEditor } from './ProblemEditor';
import { ReportsPanel } from './ReportsPanel';
import { RulesEditor } from './RulesEditor';
import { TestMode } from './TestMode';
import { TextEditor } from './TextEditor';
import { ThemeEditor } from './ThemeEditor';
import { useAdminAuth } from './useAdminAuth';

type Tab =
  | 'overview'
  | 'problems'
  | 'cards'
  | 'families'
  | 'characters'
  | 'rules'
  | 'text'
  | 'theme'
  | 'test'
  | 'reports';

const TABS: Array<{ key: Tab; label: string; icon: IconName }> = [
  { key: 'overview', label: 'Przegląd', icon: 'chart' },
  { key: 'problems', label: 'Problemy', icon: 'clash' },
  { key: 'cards', label: 'Karty', icon: 'clipboard' },
  { key: 'families', label: 'Rodziny', icon: 'palette' },
  { key: 'characters', label: 'Postacie', icon: 'people' },
  { key: 'rules', label: 'Zasady', icon: 'balance' },
  { key: 'text', label: 'Teksty', icon: 'message' },
  { key: 'theme', label: 'Kolory', icon: 'palette' },
  { key: 'test', label: 'Tryb testowy', icon: 'flask' },
  { key: 'reports', label: 'Zgłoszenia', icon: 'megaphone' },
];

export function AdminApp() {
  const auth = useAdminAuth();
  const [content, setContent] = useState<GameContent>(BUILTIN_CONTENT);
  const [savedContent, setSavedContent] = useState<GameContent>(BUILTIN_CONTENT);
  const [tab, setTab] = useState<Tab>('overview');
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();
  const toast = useToast();

  const dirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(savedContent),
    [content, savedContent],
  );

  const validation = useMemo(() => validateContent(content), [content]);

  /**
   * Wczytanie zawartości po zalogowaniu.
   *
   * Zależność to `uid`, nie obiekt użytkownika: Firebase odświeża token co
   * godzinę i podstawia NOWY obiekt, choć to wciąż ta sama osoba. Zależność
   * od obiektu uruchamiała wtedy ponowne wczytanie, które nadpisywało
   * niezapisane zmiany redaktora — bez pytania i bez śladu.
   *
   * `ignore` chroni przed drugą wersją tego samego problemu: odpowiedź
   * z porzuconego żądania nie może wywrócić stanu, który już nie jest jej.
   */
  const uid = auth.user?.uid;
  useEffect(() => {
    if (!uid) return;
    let ignore = false;

    loadContent().then((result) => {
      if (ignore) return;
      setContent(result.content);
      setSavedContent(result.content);
      setBaseVersion(result.updatedAt);
      applyTheme(result.content.theme);
      if (result.warning) setStatus(result.warning);
    });

    return () => {
      ignore = true;
    };
  }, [uid]);

  /**
   * Podgląd motywu nie może przeżyć panelu.
   *
   * Edytor kolorów przestawia zmienne CSS całego dokumentu, żeby było widać
   * efekt bez zapisywania. Po wylogowaniu te zmienne zostawały — ekran
   * logowania i gra dostawały kolory, których nikt nie zapisał, łącznie
   * z takimi, na których nie da się nic przeczytać.
   */
  const savedTheme = savedContent?.theme;
  useEffect(
    () => () => {
      applyTheme(savedTheme);
    },
    [savedTheme],
  );

  // Ostrzeżenie przed zamknięciem karty z niezapisanymi zmianami.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const update = (patch: Partial<GameContent>) => {
    setContent((prev) => ({ ...prev, ...patch }));
    setStatus(null);
    setErrors([]);
  };

  /**
   * Wersja, na której otwarto panel. Zapis odsyła ją do bazy, żeby wykryć,
   * że w międzyczasie zapisał ktoś inny — bez tego dwie osoby edytujące
   * naraz po cichu kasowały sobie pracę.
   */
  const [baseVersion, setBaseVersion] = useState<string | undefined>(undefined);

  const save = async () => {
    setSaving(true);
    setStatus('Zapisywanie…');
    const result = await saveContent(content, baseVersion);
    setSaving(false);
    if (result.ok) {
      // Po udanym zapisie nasza wersja staje się tą aktualną.
      setBaseVersion(new Date().toISOString());
      setSavedContent(content);
      setErrors([]);
      setStatus(null);
      toast('Zapisano. Gracze zobaczą zmiany po odświeżeniu strony.', 'success');
    } else {
      setErrors(result.errors);
      setStatus(null);
      toast('Zapis odrzucony — popraw błędy.', 'danger');
    }
  };

  /**
   * Ctrl+S zapisuje, tak jak w każdym edytorze.
   *
   * Redaktor poprawiający kilkadziesiąt kart inaczej po każdej zmianie wraca
   * myszą na górę strony. Przeglądarkowe „zapisz stronę" jest tu bezużyteczne,
   * więc przechwycenie skrótu niczego nie zabiera.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== 's') return;
      event.preventDefault();
      if (dirty && !saving && validation.ok) void save();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Celowo bez tablicy zależności. Handler czyta `dirty`, `saving` i
    // `validation`, które zmieniają się przy każdej edycji — z pustą tablicą
    // domknięcie zamroziłoby je na wartościach z pierwszego renderu i skrót
    // zapisywałby nieaktualny stan. Wymienienie ich w tablicy dałoby to samo
    // co brak tablicy, bo `save` i tak powstaje na nowo w każdym renderze.
    // Rejestracja listenera jest tania, a cleanup zdejmuje poprzedni.
  });

  /** Wylogowanie kasuje niezapisane zmiany — pytamy, zanim to zrobimy. */
  const logout = async () => {
    if (dirty) {
      const confirmed = await confirm({
        title: 'Wylogować się?',
        message:
          'Masz niezapisane zmiany. Wylogowanie je porzuci — zapisz je najpierw, jeśli mają zostać.',
        confirmLabel: 'Wyloguj',
        tone: 'danger',
      });
      if (!confirmed) return;
    }
    await auth.logout();
  };

  const discard = async () => {
    const confirmed = await confirm({
      title: 'Odrzucić zmiany?',
      message: 'Wszystkie niezapisane zmiany zostaną utracone i wrócisz do ostatnio zapisanej wersji.',
      confirmLabel: 'Odrzuć',
      tone: 'danger',
    });
    if (!confirmed) return;
    setContent(savedContent);
    applyTheme(savedContent.theme);
    setErrors([]);
    toast('Wrócono do ostatnio zapisanej wersji.');
  };

  if (auth.checking) {
    return <main className="p-8 text-sm text-ink-dim">Sprawdzanie sesji…</main>;
  }

  if (!auth.user) {
    return (
      <>
        <LoginForm onSubmit={auth.login} error={auth.error} pending={auth.pending} />
        {/* Sesja Firebase wygasa po godzinie. Bez tego ostrzeżenia redaktor
            widział nagle ekran logowania i nie wiedział, że jego niezapisane
            zmiany czekają w pamięci karty — wystarczy zalogować się ponownie
            zamiast odświeżać stronę. */}
        {dirty && (
          <div className="mx-auto mt-4 max-w-sm px-4">
            <Alert tone="warning" title="Masz niezapisane zmiany">
              Zaloguj się ponownie w tej karcie, a wrócisz do nich. Odświeżenie
              strony je skasuje.
            </Alert>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-edge bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <span className="eter-label">Panel redakcyjny</span>
            <h1 className="font-display text-xl font-bold text-accent">ETER11</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <span className="rounded bg-accent-2 px-2 py-1 font-mono text-[10px] font-bold text-bg">
                niezapisane zmiany
              </span>
            )}
            {dirty && (
              <Button variant="ghost" size="sm" onClick={discard} className="text-danger">
                Odrzuć zmiany
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={save}
              disabled={!dirty || saving || !validation.ok}
              title={
                !validation.ok
                  ? 'Popraw błędy, żeby zapisać'
                  : !dirty
                    ? 'Nie ma czego zapisywać — wszystko jest aktualne'
                    : 'Zapisz zmiany (Ctrl+S)'
              }
            >
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon="logout"
              onClick={() => void logout()}
              aria-label="Wyloguj"
            />
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Sekcje panelu">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-current={tab === item.key ? 'page' : undefined}
              className={[
                'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition',
                tab === item.key
                  ? 'bg-accent font-bold text-bg'
                  : 'border border-edge hover:border-ink-dim',
              ].join(' ')}
            >
              <Icon name={item.icon} size={15} />
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {dialog}

        {status && (
          <div className="mb-4">
            <Alert tone="info" onDismiss={() => setStatus(null)}>
              {status}
            </Alert>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mb-4">
            <Alert tone="danger" title="Zapis odrzucony — popraw błędy">
              <ul className="list-inside list-disc space-y-0.5 text-xs">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          </div>
        )}

        {!validation.ok && errors.length === 0 && (
          <div className="mb-4">
            <Alert
              tone="warning"
              title={`Zapis zablokowany — ${validation.errors.length} ${
                validation.errors.length === 1 ? 'błąd' : 'błędów'
              } w zawartości`}
            >
              <ul className="list-inside list-disc space-y-0.5 text-xs">
                {validation.errors.slice(0, 5).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {validation.errors.length > 5 && (
                  <li>…i {validation.errors.length - 5} więcej</li>
                )}
              </ul>
            </Alert>
          </div>
        )}

        <div key={tab} className="eter-fade-in">
        {tab === 'overview' && <DeckOverview content={content} onGoTo={setTab} />}
        {tab === 'problems' && (
          <ProblemEditor
            problems={content.problems}
            onChange={(problems) => update({ problems })}
          />
        )}
        {tab === 'cards' && (
          <CardEditor cards={content.cards} onChange={(cards) => update({ cards })} />
        )}
        {tab === 'families' && (
          <FamilyEditor
            families={content.families}
            cards={content.cards}
            onChange={(families) => update({ families })}
          />
        )}
        {tab === 'characters' && (
          <CharacterEditor
            characters={content.characters}
            onChange={(characters) => update({ characters })}
          />
        )}
        {tab === 'rules' && (
          <RulesEditor rules={content.rules} onChange={(rules) => update({ rules })} />
        )}
        {tab === 'text' && (
          <TextEditor text={content.text} onChange={(text) => update({ text })} />
        )}
        {tab === 'theme' && (
          <ThemeEditor theme={content.theme} onChange={(theme) => update({ theme })} />
        )}
        {tab === 'test' && <TestMode key={JSON.stringify(content.rules)} content={content} />}
        {tab === 'reports' && <ReportsPanel />}
        </div>
      </main>
    </div>
  );
}
