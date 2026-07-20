import { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  error: string | null;
  pending: boolean;
}

export function LoginForm({ onSubmit, error, pending }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <span className="eter-label">Panel redakcyjny</span>
      <h1 className="font-display text-3xl font-bold text-accent">ETER11</h1>
      <p className="mt-1 text-sm text-ink-dim">Edycja kart i zasad gry.</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email, password);
        }}
      >
        <label className="block">
          <span className="text-sm text-ink-dim">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            className="mt-1 w-full rounded-lg border border-edge bg-bg px-3 py-2 text-ink"
          />
        </label>

        <label className="block">
          <span className="text-sm text-ink-dim">Hasło</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-edge bg-bg px-3 py-2 text-ink"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent px-4 py-2 font-display font-bold text-bg disabled:opacity-40"
        >
          {pending ? 'Logowanie…' : 'Zaloguj'}
        </button>
      </form>

      <a href="/" className="mt-6 text-center text-xs text-ink-dim underline underline-offset-2">
        Wróć do gry
      </a>
    </main>
  );
}
