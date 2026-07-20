import { useState } from 'react';
import { Alert } from '../ui/controls/Alert';
import { Button } from '../ui/controls/Button';
import { TextField } from '../ui/controls/Field';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  error: string | null;
  pending: boolean;
}

export function LoginForm({ onSubmit, error, pending }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="eter-rise mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
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
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />

        <TextField
          label="Hasło"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <Alert tone="danger">{error}</Alert>}

        <Button type="submit" variant="primary" disabled={pending} className="w-full">
          {pending ? 'Logowanie…' : 'Zaloguj'}
        </Button>
      </form>

      <a href="/" className="mt-6 text-center text-xs text-ink-dim underline underline-offset-2">
        Wróć do gry
      </a>
    </main>
  );
}
