import { useEffect, useMemo, useState } from 'react';
import { applyTheme } from '../data/theme';
import { BUILTIN_CONTENT, loadContent, saveContent } from '../firebase/content';
import type { GameContent } from '../firebase/validate';
import { validateContent } from '../firebase/validate';
import { Icon, type IconName } from '../ui/icons/Icon';
import { CardEditor } from './CardEditor';
import { CharacterEditor } from './CharacterEditor';
import { DeckOverview } from './DeckOverview';
import { LoginForm } from './LoginForm';
import { ProblemEditor } from './ProblemEditor';
import { RulesEditor } from './RulesEditor';
import { TestMode } from './TestMode';
import { TextEditor } from './TextEditor';
import { ThemeEditor } from './ThemeEditor';
import { useAdminAuth } from './useAdminAuth';

type Tab = 'overview' | 'problems' | 'cards' | 'characters' | 'rules' | 'text' | 'theme' | 'test';

const TABS: Array<{ key: Tab; label: string; icon: IconName }> = [
  { key: 'overview', label: 'Przegląd', icon: 'chart' },
  { key: 'problems', label: 'Problemy', icon: 'clash' },
  { key: 'cards', label: 'Karty', icon: 'clipboard' },
  { key: 'characters', label: 'Postacie', icon: 'people' },
  { key: 'rules', label: 'Zasady', icon: 'balance' },
  { key: 'text', label: 'Teksty', icon: 'message' },
  { key: 'theme', label: 'Kolory', icon: 'palette' },
  { key: 'test', label: 'Tryb testowy', icon: 'flask' },
];

export function AdminApp() {
  const auth = useAdminAuth();
  const [content, setContent] = useState<GameContent>(BUILTIN_CONTENT);
  const [savedContent, setSavedContent] = useState<GameContent>(BUILTIN_CONTENT);
  const [tab, setTab] = useState<Tab>('overview');
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(savedContent),
    [content, savedContent],
  );

  const validation = useMemo(() => validateContent(content), [content]);

  useEffect(() => {
    if (!auth.user) return;
    loadContent().then((result) => {
      setContent(result.content);
      setSavedContent(result.content);
      applyTheme(result.content.theme);
      if (result.warning) setStatus(result.warning);
    });
  }, [auth.user]);

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

  const save = async () => {
    setSaving(true);
    setStatus('Zapisywanie…');
    const result = await saveContent(content);
    setSaving(false);
    if (result.ok) {
      setSavedContent(content);
      setErrors([]);
      setStatus('Zapisano. Gracze zobaczą zmiany po odświeżeniu strony.');
    } else {
      setErrors(result.errors);
      setStatus(null);
    }
  };

  const discard = () => {
    if (!window.confirm('Odrzucić wszystkie niezapisane zmiany?')) return;
    setContent(savedContent);
    applyTheme(savedContent.theme);
    setErrors([]);
    setStatus('Zmiany odrzucone.');
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eter11-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const check = validateContent(parsed);
        if (!check.ok) {
          setErrors(['Plik zawiera błędy — nie został wczytany:', ...check.errors]);
          return;
        }
        setContent(parsed);
        applyTheme(parsed.theme);
        setStatus('Wczytano plik. Sprawdź zawartość i zapisz, żeby trafiła do bazy.');
        setErrors([]);
      } catch {
        setErrors(['Plik nie jest poprawnym JSON-em.']);
      }
    };
    reader.readAsText(file);
  };

  const problemBonusIds = useMemo(
    () => new Set(content.problems.flatMap((p) => p.slots.flatMap((s) => s.bonusCardIds))),
    [content.problems],
  );

  if (auth.checking) {
    return <main className="p-8 text-sm text-ink-dim">Sprawdzanie sesji…</main>;
  }

  if (!auth.user) {
    return <LoginForm onSubmit={auth.login} error={auth.error} pending={auth.pending} />;
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
            <button
              type="button"
              onClick={exportJson}
              className="flex items-center gap-1.5 rounded border border-edge px-3 py-1.5 text-sm"
            >
              <Icon name="download" size={14} />
              Eksportuj
            </button>
            <label className="flex cursor-pointer items-center gap-1.5 rounded border border-edge px-3 py-1.5 text-sm">
              <Icon name="upload" size={14} />
              Importuj
              <input
                type="file"
                accept="application/json"
                onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
                className="sr-only"
              />
            </label>
            {dirty && (
              <button
                type="button"
                onClick={discard}
                className="rounded border border-edge px-3 py-1.5 text-sm text-danger"
              >
                Odrzuć zmiany
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving || !validation.ok}
              title={!validation.ok ? 'Popraw błędy, żeby zapisać' : undefined}
              className="rounded bg-accent px-4 py-1.5 text-sm font-bold text-bg disabled:opacity-40"
            >
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
            <button
              type="button"
              onClick={auth.logout}
              aria-label="Wyloguj"
              className="rounded border border-edge p-2"
            >
              <Icon name="logout" size={14} />
            </button>
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
        {status && (
          <p className="mb-4 rounded border border-edge bg-surface px-3 py-2 text-sm">{status}</p>
        )}

        {errors.length > 0 && (
          <div role="alert" className="mb-4 rounded border border-danger bg-surface px-3 py-2">
            <p className="text-sm font-bold text-danger">Zapis odrzucony — popraw błędy:</p>
            <ul className="mt-1 list-inside list-disc text-xs text-ink-dim">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {!validation.ok && errors.length === 0 && (
          <div role="status" className="mb-4 rounded border border-danger bg-surface px-3 py-2">
            <p className="text-sm font-bold text-danger">
              Zawartość ma {validation.errors.length} {validation.errors.length === 1 ? 'błąd' : 'błędów'} — zapis jest zablokowany:
            </p>
            <ul className="mt-1 list-inside list-disc text-xs text-ink-dim">
              {validation.errors.slice(0, 5).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
              {validation.errors.length > 5 && <li>…i {validation.errors.length - 5} więcej</li>}
            </ul>
          </div>
        )}

        {tab === 'overview' && <DeckOverview content={content} />}
        {tab === 'problems' && (
          <ProblemEditor
            problems={content.problems}
            cards={content.cards}
            onChange={(problems) => update({ problems })}
          />
        )}
        {tab === 'cards' && (
          <CardEditor
            cards={content.cards}
            problemBonusIds={problemBonusIds}
            onChange={(cards) => update({ cards })}
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
      </main>
    </div>
  );
}
