import { useEffect, useMemo, useState } from 'react';
import { applyTheme } from '../data/theme';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import { loadContent, saveContent } from '../firebase/content';
import { describeChanges, recordVersion } from '../firebase/history';
import { HistoryPanel } from './HistoryPanel';
import { StatsPanel } from './StatsPanel';
import { TeamPanel } from './TeamPanel';
import { canManageRoles, canDiscuss, canEdit } from '../firebase/roles';
import type { GameContent } from '../firebase/validate';
import { validateContent } from '../firebase/validate';
import { Alert } from '../ui/controls/Alert';
import { Button } from '../ui/controls/Button';
import { Select } from '../ui/controls/Select';
import { Tooltip } from '../ui/controls/Tooltip';
import { TextField } from '../ui/controls/Field';
import { searchContent } from './globalSearch';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { Icon, type IconName } from '../ui/icons/Icon';
import { CardEditor } from './CardEditor';
import { CharacterEditor } from './CharacterEditor';
import { DeckOverview } from './DeckOverview';
import { FamilyEditor } from './FamilyEditor';
import { LoginForm } from './LoginForm';
import { ProblemEditor } from './ProblemEditor';
import { ReportsPanel, isReportStatus } from './ReportsPanel';
import { DiscussionsPanel } from './DiscussionsPanel';
import { AccountPanel } from './AccountPanel';
import { RulesEditor } from './RulesEditor';
import { TestMode } from './TestMode';
import { TextEditor } from './TextEditor';
import { StoryEditor, isStoryPart } from './StoryEditor';
import { CategoryEditor } from './CategoryEditor';
import { IconEditor } from './IconEditor';
import { setCategoryStyles, setCustomIcons } from '../ui/components/categoryStyles';
import { useTabRoute } from './useTabRoute';
import { ThemeEditor } from './ThemeEditor';
import { useAdminAuth } from './useAdminAuth';

type Tab =
  | 'overview'
  | 'problems'
  | 'cards'
  | 'families'
  | 'categories'
  | 'icons'
  | 'characters'
  | 'rules'
  | 'text'
  | 'story'
  | 'theme'
  | 'test'
  | 'reports'
  | 'discussions'
  | 'account'
  | 'history'
  | 'stats'
  | 'team';

const TABS: Array<{ key: Tab; label: string; icon: IconName }> = [
  { key: 'overview', label: 'Przegląd', icon: 'chart' },
  { key: 'problems', label: 'Problemy', icon: 'clash' },
  { key: 'cards', label: 'Karty', icon: 'clipboard' },
  { key: 'families', label: 'Rodziny', icon: 'palette' },
  { key: 'categories', label: 'Kategorie', icon: 'clipboard' },
  { key: 'icons', label: 'Ikony', icon: 'palette' },
  { key: 'characters', label: 'Postacie', icon: 'people' },
  { key: 'rules', label: 'Zasady', icon: 'balance' },
  { key: 'text', label: 'Teksty', icon: 'message' },
  { key: 'story', label: 'Wstęp i ETER11', icon: 'spark' },
  { key: 'theme', label: 'Kolory', icon: 'palette' },
  { key: 'test', label: 'Tryb testowy', icon: 'flask' },
  { key: 'reports', label: 'Zgłoszenia', icon: 'megaphone' },
  { key: 'discussions', label: 'Dyskusja', icon: 'message' },
  { key: 'account', label: 'Konto', icon: 'people' },
  { key: 'history', label: 'Historia', icon: 'undo' },
  { key: 'stats', label: 'Statystyki', icon: 'chart' },
  { key: 'team', label: 'Zespół', icon: 'people' },
];

export function AdminApp() {
  const auth = useAdminAuth();
  const [content, setContent] = useState<GameContent>(BUILTIN_CONTENT);
  const [savedContent, setSavedContent] = useState<GameContent>(BUILTIN_CONTENT);
  // Zakładkę zaczynamy od tej z adresu — wejście na /admin/discussions
  // otwiera dyskusje, nie przegląd.
  const initialTab = (): Tab => {
    const slug = window.location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
    return TABS.some((t) => t.key === slug) ? (slug as Tab) : 'overview';
  };
  const [tab, setTab] = useState<Tab>(initialTab);

  // Zakładki widoczne dla tej roli.
  //
  // Zespół (nadawanie ról) tylko dla admina. Dyskusja znika dla edytora
  // i podglądu — pierwszy zgłasza, ale nie dyskutuje; drugi tylko patrzy.
  // Reszta widoczna dla wszystkich; co wolno w środku, pilnuje już panel.
  const visibleTabs = TABS.filter((item) => {
    if (item.key === 'team') return canManageRoles(auth.role);
    if (item.key === 'discussions') return canDiscuss(auth.role);
    return true;
  });

  const isTab = (value: string): value is Tab => visibleTabs.some((t) => t.key === value);
  const route = useTabRoute(tab, setTab, isTab);

  // Rola ładuje się asynchronicznie, więc przy pierwszym renderze zakładka
  // z adresu (np. /admin/team) może być widoczna, zanim okaże się, że ta
  // rola jej nie ma. Gdy rola dojedzie i aktywna zakładka nie jest dla niej
  // dozwolona, wracamy na przegląd — inaczej edytor zobaczyłby listę kont.
  const tabAllowed = visibleTabs.some((item) => item.key === tab);
  useEffect(() => {
    if (!tabAllowed) setTab('overview');
  }, [tabAllowed]);

  // Nowa zakładka zaczyna się od góry. Bez tego przejście z długiej listy
  // (karty) na krótszą (konto) zostawiało widok przewinięty w połowie, na
  // pustce pod treścią.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);
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

  const [hunt, setHunt] = useState('');
  const found = useMemo(
    () => (hunt.trim().length > 1 ? searchContent(content, hunt) : []),
    [content, hunt],
  );

  /** Które sekcje różnią się od ostatniego zapisu — po ludzku. */
  const pendingChanges = useMemo(
    () => describeChanges(content, savedContent),
    [content, savedContent],
  );

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

  // Podgląd nazw i ikon kategorii w samym panelu.
  //
  // Redaktor zmienia nazwę i od razu widzi ją na kartach w zakładce „Karty”
  // oraz na ściankach problemów — bez zapisu i odświeżania gry. Bez tego
  // pisałby w ciemno i sprawdzał efekt dopiero po wdrożeniu.
  useEffect(() => {
    setCategoryStyles(content.categories);
    setCustomIcons(content.customIcons);
  }, [content.categories]);

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
      // Znacznik bierzemy z zapisu, nie z własnego zegara: różnica choćby
      // milisekundy kazałaby następnemu zapisowi uznać własną wersję za cudzą.
      setBaseVersion(result.updatedAt);

      // Historia po zapisie, nie zamiast: gdyby jej dopisanie padło, treść
      // i tak jest już w grze i nie ma czego cofać.
      void recordVersion({
        content,
        previous: savedContent,
        author: auth.user?.displayName || auth.user?.email || 'Zespół',
        at: result.updatedAt ?? new Date().toISOString(),
      }).catch(() => {
        // Cicho: brak wpisu w historii nie jest powodem, by straszyć
        // redaktora komunikatem o nieudanym zapisie, który się udał.
      });

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
    // Pierwszy ekran panelu — pokazuje się, zanim cokolwiek innego zdąży
    // się narysować, więc musi wyglądać jak reszta aplikacji. Gołe `<main>`
    // dostawało domyślną czcionkę przeglądarki i witało redaktora Times
    // New Roman na środku ciemnego ekranu.
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="eter-fade-in text-center">
          <span className="eter-pulse inline-flex text-accent">
            <Icon name="spark" size={28} />
          </span>
          <p className="mt-3 font-display text-sm text-ink-dim">Sprawdzanie sesji…</p>
        </div>
      </main>
    );
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
      <header
        className="sticky top-0 border-b border-edge bg-bg/95 backdrop-blur"
        style={{ zIndex: 'var(--z-sticky)' }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <span className="eter-label">Panel redakcyjny</span>
            <h1 className="font-display text-xl font-bold text-accent">ETER11</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Co dokładnie się zmieniło, nie tylko „coś".
                Redaktor wraca do panelu po godzinie i widzi ostrzeżenie
                o niezapisanych zmianach, nie pamiętając, czy sam coś ruszył,
                czy przypadkiem skasował literę w cudzym tekście. */}
            {dirty && (
              // Custom podpowiedź zamiast natywnego `title` (szary systemowy dymek).
              <Tooltip label={`Zmienione: ${pendingChanges}`}>
                <span className="rounded bg-accent-2 px-2 py-1 font-mono text-[10px] font-bold text-bg">
                  niezapisane: {pendingChanges}
                </span>
              </Tooltip>
            )}
            {dirty && (
              <Button variant="ghost" size="sm" onClick={discard} className="text-danger">
                Odrzuć zmiany
              </Button>
            )}
            <Tooltip
              label={
                !validation.ok
                  ? 'Popraw błędy, żeby zapisać'
                  : !dirty
                    ? 'Nie ma czego zapisywać — wszystko jest aktualne'
                    : 'Zapisz zmiany (Ctrl+S)'
              }
            >
              <Button
                variant="primary"
                size="sm"
                onClick={save}
                disabled={!dirty || saving || !validation.ok || !canEdit(auth.role)}
              >
                {saving ? 'Zapisywanie…' : 'Zapisz'}
              </Button>
            </Tooltip>
            <Button
              variant="secondary"
              size="sm"
              icon="logout"
              onClick={() => void logout()}
              aria-label="Wyloguj"
            />
          </div>
        </div>

        {/* Na telefonie lista zamiast paska.
            Szesnaście zakładek w pasku przewijanym w bok znaczy, że połowa
            jest poza ekranem i trzeba do niej dojechać na oślep — a nazwy
            zakładek to jedyne, po czym da się w tym panelu nawigować. */}
        {/* Szukanie w całej zawartości — dostępne z każdej zakładki, bo
            pytanie „gdzie ja to wpisałem" pada właśnie wtedy, gdy redaktor
            jest w innej sekcji. */}
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <TextField
            value={hunt}
            onChange={(e) => setHunt(e.target.value)}
            placeholder="Szukaj w kartach, problemach, tekstach i wstępie"
            aria-label="Szukaj w całej zawartości"
            className="w-full"
          />

          {hunt.trim().length > 1 && (
            <div className="eter-rise mt-2 max-h-72 overflow-y-auto rounded-lg border border-edge bg-surface">
              {found.length === 0 ? (
                <p className="p-3 text-sm text-ink-dim">Nic takiego nie ma w treści.</p>
              ) : (
                <ul className="divide-y divide-edge">
                  {found.slice(0, 40).map((hit, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => {
                          const phrase = hunt.trim();
                          // Skok jednym ruchem: zakładka + pod-zakładka + filtr.
                          // Karty otwieramy z frazą, żeby wynik był od razu
                          // widoczny na przefiltrowanej liście; trafienia we
                          // wstępie/ETER11 — wprost we właściwej pod-zakładce.
                          route.navigate(
                            hit.tab as Tab,
                            hit.part ?? null,
                            hit.tab === 'cards' ? { filter: phrase } : {},
                          );
                          setHunt('');
                        }}
                        className="w-full px-3 py-2 text-left transition hover:bg-raised"
                      >
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-semibold">{hit.title}</span>
                          <span className="font-mono text-[10px] text-accent">{hit.where}</span>
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-ink-dim">
                          {hit.excerpt}
                        </span>
                      </button>
                    </li>
                  ))}
                  {found.length > 40 && (
                    <li className="px-3 py-2 text-xs text-ink-dim">
                      …i {found.length - 40} więcej. Dopisz słowo, żeby zawęzić.
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-2 sm:hidden">
          <Select
            value={tab}
            ariaLabel="Sekcja panelu"
            className="w-full"
            options={visibleTabs.map((item) => ({ value: item.key, label: item.label }))}
            onChange={setTab}
          />
        </div>

        <nav
          className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:flex"
          aria-label="Sekcje panelu"
        >
          {visibleTabs.map((item) => (
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
            // Rozwinięty problem żyje w adresie (`?open=<id>`), więc link
            // wprost do konkretnego problemu da się wysłać dalej.
            openId={route.params.open ?? null}
            onOpenChange={(id) => route.setParam('open', id)}
          />
        )}
        {tab === 'cards' && (
          <CardEditor
            cards={content.cards}
            onChange={(cards) => update({ cards })}
            // Fraza filtra żyje w adresie (`?filter=…`), więc link do
            // przefiltrowanej listy da się wysłać dalej. `key` z tej frazy
            // resetuje pole edytora, gdy adres wskaże nową frazę (np. z
            // wyszukiwarki albo z wklejonego linku).
            key={route.params.filter ?? ''}
            initialSearch={route.params.filter ?? ''}
            onSearchChange={(value) => route.setParam('filter', value || null)}
          />
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
        {tab === 'categories' && (
          <CategoryEditor
            categories={content.categories}
            onChange={(categories) => update({ categories })}
          />
        )}
        {tab === 'icons' && (
          <IconEditor
            icons={content.customIcons}
            onChange={(customIcons) => update({ customIcons })}
          />
        )}
        {tab === 'story' && (
          <StoryEditor
            intro={content.intro}
            tutorial={content.tutorial}
            onChange={update}
            // Pod-zakładka z adresu (`/admin/story/adults`); nieznany slug
            // zostawia widok domyślny, a klik zapisuje wybór z powrotem do URL.
            part={route.sub && isStoryPart(route.sub) ? route.sub : undefined}
            onPartChange={(next) => route.setSub(next)}
          />
        )}
        {tab === 'theme' && (
          <ThemeEditor theme={content.theme} onChange={(theme) => update({ theme })} />
        )}
        {tab === 'test' && <TestMode key={JSON.stringify(content.rules)} content={content} />}
        {tab === 'reports' && (
          <ReportsPanel
            author={auth.user?.displayName || auth.user?.email || 'Zespół'}
            role={auth.role}
            // Filtr statusu to pod-zakładka (`/admin/reports/fixed`); nieznany
            // slug zostawia widok domyślny. Otwarte zgłoszenie żyje w query
            // (`?open=<id>`) — link prowadzi wprost do listy i do zgłoszenia.
            statusTab={route.sub && isReportStatus(route.sub) ? route.sub : undefined}
            onStatusTabChange={(s) => route.setSub(s)}
            openId={route.params.open ?? null}
            onOpenChange={(id) => route.setParam('open', id)}
          />
        )}
        {/* Imię z konta, nie z pola tekstowego: pod wypowiedzią w dyskusji
            ma stać podpis, którego nie da się podszyć. */}
        {tab === 'discussions' && (
          <DiscussionsPanel
            author={auth.user?.displayName || auth.user?.email || 'Zespół'}
            // Przełącznik otwarte/ustalone żyje w adresie (`?closed=1`), więc
            // link wprost do listy ustalonych da się wysłać dalej.
            showClosed={route.params.closed === '1'}
            onShowClosedChange={(v) => route.setParam('closed', v ? '1' : null)}
          />
        )}
        {tab === 'stats' && <StatsPanel content={content} />}
        {tab === 'team' && auth.user && <TeamPanel currentUid={auth.user.uid} />}
        {tab === 'history' && (
          <HistoryPanel
            currentVersion={baseVersion}
            onRestore={(restored) => {
              setContent(restored);
              applyTheme(restored.theme);
              toast('Wersja wczytana. Kliknij „Zapisz", żeby trafiła do gry.');
            }}
          />
        )}
        {tab === 'account' && (
          <AccountPanel
            email={auth.user?.email ?? null}
            displayName={auth.user?.displayName ?? null}
            onSaveName={auth.setDisplayName}
          />
        )}
        </div>
      </main>
    </div>
  );
}
