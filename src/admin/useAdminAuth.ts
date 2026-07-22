import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase/client';
import { loadRole, DEFAULT_ROLE, type Role } from '../firebase/roles';

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
  // Rola zalogowanego — decyduje, co widać i wolno w panelu.
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);

  useEffect(
    () =>
      onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setChecking(false);
        if (nextUser) {
          void loadRole(nextUser.uid, nextUser.email).then(setRole);
        } else {
          setRole(DEFAULT_ROLE);
        }
      }),
    [],
  );

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

  /**
   * Imię podpisujące wypowiedzi w dyskusjach i zgłoszeniach.
   *
   * Firebase Console nie ma pola na `displayName` przy koncie e-mail —
   * ustawić je można wyłącznie z kodu, przez zalogowanego użytkownika.
   * Stąd to pole w panelu: bez niego pod każdą wypowiedzią stoi adres
   * e-mail, a „info@eter11.pl napisał" czyta się gorzej niż imię.
   *
   * `setUser` z kopią obiektu, bo `updateProfile` zmienia `auth.currentUser`
   * w miejscu — React nie zobaczyłby zmiany bez nowej referencji.
   */
  const setDisplayName = async (name: string): Promise<{ ok: boolean; error?: string }> => {
    const current = auth.currentUser;
    if (!current) return { ok: false, error: 'Nie jesteś zalogowany.' };

    try {
      await updateProfile(current, { displayName: name.trim() });
      setUser(Object.assign(Object.create(Object.getPrototypeOf(current)), current));
      return { ok: true };
    } catch (problem) {
      const message = problem instanceof Error ? problem.message : String(problem);
      return { ok: false, error: `Nie udało się zapisać imienia: ${message}` };
    }
  };

  return {
    user,
    checking,
    error,
    pending,
    login,
    logout,
    setDisplayName,
    role,
  };
}
