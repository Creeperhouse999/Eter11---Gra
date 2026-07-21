import { useEffect, useState } from 'react';
import { AdminApp } from './admin/AdminApp';
import { applyTheme } from './data/theme';
import { BUILTIN_CONTENT, loadContent } from './firebase/content';
import type { GameContent } from './firebase/validate';
import { ToastProvider } from './ui/controls/Toast';
import { GameApp } from './ui/GameApp';

/**
 * Routing bez biblioteki — aplikacja ma dokładnie dwa widoki.
 * Ścieżka /admin nie jest linkowana z interfejsu gry.
 */
export default function App() {
  const isAdmin = window.location.pathname.startsWith('/admin');
  return <ToastProvider>{isAdmin ? <AdminApp /> : <Game />}</ToastProvider>;
}

function Game() {
  const [content, setContent] = useState<GameContent | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let done = false;

    /**
     * Limit czasu na odpowiedź bazy.
     *
     * Firestore przy słabym zasięgu potrafi wisieć bez końca, a gracz zostaje
     * wtedy na „Wczytywanie kart…" — mimo że komplet kart jest w kodzie i gra
     * mogłaby ruszyć od razu. Pięć sekund to granica, po której czekanie
     * przestaje mieć sens.
     */
    const timeout = window.setTimeout(() => {
      if (done) return;
      done = true;
      setContent(BUILTIN_CONTENT);
      applyTheme(BUILTIN_CONTENT.theme);
      setNotice('Baza nie odpowiada — gramy na kartach wbudowanych w grę.');
    }, 5000);

    loadContent()
      .then((result) => {
        if (done) return;
        done = true;
        window.clearTimeout(timeout);

        setContent(result.content);
        applyTheme(result.content.theme);
        // Pusta baza to stan normalny — gra ma komplet kart w kodzie.
        // Gracza informujemy tylko wtedy, gdy coś naprawdę poszło nie tak.
        if (result.reason === 'unreachable' || result.reason === 'invalid') {
          setNotice(result.warning ?? null);
        }
      })
      .catch(() => {
        // `loadContent` łapie własne błędy, ale `applyTheme` już nie — bez
        // tego uszkodzony motyw zostawiał ekran ładowania na zawsze.
        if (done) return;
        done = true;
        window.clearTimeout(timeout);
        setContent(BUILTIN_CONTENT);
        setNotice('Nie udało się wczytać danych — gramy na kartach wbudowanych.');
      });

    return () => window.clearTimeout(timeout);
  }, []);

  if (!content) {
    // Krótka chwila przed odpowiedzią z bazy. Dane wbudowane i tak są zapasem,
    // więc komunikat jest neutralny — gracz nie musi wiedzieć o Firestore.
    return <main className="p-8 font-mono text-sm text-ink-dim">Wczytywanie kart…</main>;
  }

  return <GameApp content={content} notice={notice} />;
}

export { BUILTIN_CONTENT };
