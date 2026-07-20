import { useEffect, useState } from 'react';
import { AdminApp } from './admin/AdminApp';
import { applyTheme } from './data/theme';
import { BUILTIN_CONTENT, loadContent } from './firebase/content';
import type { GameContent } from './firebase/validate';
import { GameApp } from './ui/GameApp';

/**
 * Routing bez biblioteki — aplikacja ma dokładnie dwa widoki.
 * Ścieżka /admin nie jest linkowana z interfejsu gry.
 */
export default function App() {
  const isAdmin = window.location.pathname.startsWith('/admin');
  if (isAdmin) return <AdminApp />;
  return <Game />;
}

function Game() {
  const [content, setContent] = useState<GameContent | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    loadContent().then((result) => {
      setContent(result.content);
      applyTheme(result.content.theme);
      // Pusta baza to stan normalny — gra ma komplet kart w kodzie.
      // Gracza informujemy tylko wtedy, gdy coś naprawdę poszło nie tak.
      if (result.reason === 'unreachable' || result.reason === 'invalid') {
        setNotice(result.warning ?? null);
      }
    });
  }, []);

  if (!content) {
    // Krótka chwila przed odpowiedzią z bazy. Dane wbudowane i tak są zapasem,
    // więc komunikat jest neutralny — gracz nie musi wiedzieć o Firestore.
    return <main className="p-8 font-mono text-sm text-ink-dim">Wczytywanie kart…</main>;
  }

  return <GameApp content={content} notice={notice} />;
}

export { BUILTIN_CONTENT };
