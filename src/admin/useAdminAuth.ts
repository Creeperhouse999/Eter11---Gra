import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase/client';

/**
 * Uwierzytelnianie panelu administracyjnego.
 *
 * Hasło żyje wyłącznie w Firebase — nigdy w kodzie aplikacji ani w repozytorium.
 * Zmiana hasła odbywa się w Firebase Console, bez ponownego wdrożenia.
 */
export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setChecking(false);
  }), []);

  const login = async (email: string, password: string) => {
    setPending(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      // Komunikat celowo nie zdradza, czy błędny był email czy hasło —
      // inaczej ułatwiałby zgadywanie istniejących kont.
      setError('Nieprawidłowy email lub hasło.');
    } finally {
      setPending(false);
    }
  };

  const logout = () => signOut(auth);

  return { user, checking, error, pending, login, logout };
}
