import { setCategoryStyles, setCustomIcons } from './ui/components/categoryStyles';
import { lazy, Suspense, useEffect, useState } from 'react';
import { applyTheme, baseTheme, setThemeOverrides } from './data/theme';
import { BUILTIN_CONTENT } from './data/builtinContent';
import type { GameContent } from './firebase/validate';
import { ToastProvider } from './ui/controls/Toast';
import { GameApp } from './ui/GameApp';
import { ThemeToggle } from './ui/ThemeToggle';

/**
 * Panel redakcyjny ładowany dopiero pod adresem /admin.
 *
 * Trafia tam kilka osób z zespołu, a gracze nigdy — nie ma powodu, żeby
 * każde dziecko przy stole pobierało edytory kart razem z pakietem Firestore,
 * który panel ciągnie za sobą.
 */
const AdminApp = lazy(() =>
  import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })),
);

/**
 * Routing bez biblioteki — aplikacja ma dokładnie dwa widoki.
 * Ścieżka /admin nie jest linkowana z interfejsu gry.
 */
export default function App() {
  const isAdmin = window.location.pathname.startsWith('/admin');

  return (
    <ToastProvider>
      {isAdmin ? (
        <Suspense
          fallback={<main className="p-8 font-mono text-sm text-ink-dim">Wczytywanie panelu…</main>}
        >
          {/* Panel ma własny przełącznik w nagłówku (obok Zapisz/Wyloguj),
              żeby nie nachodził na tamte przyciski w rogu. */}
          <AdminApp />
        </Suspense>
      ) : (
        <>
          {/* Gra: przełącznik jako pływający przycisk w rogu. */}
          <ThemeToggle />
          <Game />
        </>
      )}
    </ToastProvider>
  );
}

function Game() {
  /**
   * Gra startuje na kartach wbudowanych, a dane z bazy dochodzą w tle.
   *
   * Wcześniej pierwszy render czekał na Firestore — 464 KB pakietu plus
   * zapytanie sieciowe — choć komplet kart jest w kodzie i wystarcza do gry.
   * Teraz plansza jest od razu, a `import()` ściąga Firestore dopiero po
   * pierwszym renderze; jeśli baza ma nowszą zawartość, podmienia ją.
   */
  const [content, setContent] = useState<GameContent>(BUILTIN_CONTENT);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let done = false;

    /**
     * Limit czasu na odpowiedź bazy.
     *
     * Gra już działa na kartach wbudowanych, więc czekanie niczego nie
     * blokuje — ale po pięciu sekundach przestajemy liczyć na bazę i mówimy
     * o tym graczowi, zamiast w nieskończoność trzymać nieaktualne dane.
     */
    // `done` znaczy „komponent zniknął", nie „skończyliśmy czekać": limit ma
    // tylko UPRZEDZIĆ gracza. Wcześniej gasił też samo oczekiwanie, więc
    // odpowiedź, która przyszła po pięciu sekundach (wolne łącze, słaby
    // zasięg), lądowała w koszu — redaktor zmieniał kartę w panelu, a dziecko
    // grało starą wersją, chociaż dane dotarły.
    const timeout = window.setTimeout(() => {
      if (done) return;
      setNotice('Baza nie odpowiada — gramy na kartach wbudowanych w grę.');
    }, 5000);

    // `import()` zamiast zwykłego importu: pakiet Firestore waży 464 KB,
    // więcej niż React i cała reszta gry razem. Statyczny import kazał
    // przeglądarce pobrać go i wykonać, zanim pokazała pierwszą kartę.
    void import('./firebase/content')
      .then(({ loadContent }) => loadContent())
      .then((result) => {
        if (done) return;
        window.clearTimeout(timeout);

        setContent(result.content);
        // Własne motywy z bazy (osobno ciemny/jasny) trafiają do rejestru,
        // żeby przełącznik trybu sięgał po nie, nie tylko po wbudowane.
        // Potem stosujemy motyw aktualnego trybu.
        setThemeOverrides({ dark: result.content.theme, light: result.content.themeLight });
        const mode = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
        applyTheme(baseTheme(mode));
        // Nazwy i ikony kategorii czyta trzydzieści miejsc w interfejsie,
        // w tym funkcje bez dostępu do Reacta — stąd rejestr modułowy
        // ustawiany raz, zamiast właściwości wleczonej przez całe drzewo.
        setCategoryStyles(result.content.categories);
        setCustomIcons(result.content.customIcons);
        // Pusta baza to stan normalny — gra ma komplet kart w kodzie.
        // Gracza informujemy tylko wtedy, gdy coś naprawdę poszło nie tak.
        if (result.reason === 'unreachable' || result.reason === 'invalid') {
          setNotice(result.warning ?? null);
        } else {
          // Baza odezwała się mimo wcześniejszego „nie odpowiada" — pasek
          // przestał być prawdą, więc go zdejmujemy.
          setNotice(null);
        }
      })
      .catch(() => {
        // Gra toczy się dalej na danych wbudowanych — nie ma czego ratować,
        // wystarczy powiedzieć, że nowszej zawartości nie będzie.
        if (done) return;
        window.clearTimeout(timeout);
        setNotice('Nie udało się wczytać danych — gramy na kartach wbudowanych.');
      });

    // `done` zapala się przy odmontowaniu: po zniknięciu komponentu nie mamy
    // już czego ustawiać.
    return () => {
      done = true;
      window.clearTimeout(timeout);
    };
  }, []);


  return <GameApp content={content} notice={notice} />;
}

export { BUILTIN_CONTENT };
