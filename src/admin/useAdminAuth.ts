import { useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
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

  /**
   * Zmiana hasła.
   *
   * Firebase wymaga świeżego logowania do operacji na koncie — po godzinie
   * pracy w panelu sesja jest za stara i zmiana odbiłaby się błędem
   * `requires-recent-login`. Dlatego prosimy o obecne hasło i logujemy się
   * nim ponownie tuż przed zmianą. Przy okazji chroni to konto porzucone
   * przy zalogowanej przeglądarce: bez znajomości starego hasła nikt nie
   * ustawi nowego.
   */
  const changePassword = async (
    currentPassword: string,
    nextPassword: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    const current = auth.currentUser;
    if (!current?.email) return { ok: false, error: 'Nie jesteś zalogowany.' };

    if (nextPassword.length < 6) {
      return { ok: false, error: 'Nowe hasło musi mieć co najmniej 6 znaków.' };
    }

    try {
      await reauthenticateWithCredential(
        current,
        EmailAuthProvider.credential(current.email, currentPassword),
      );
    } catch {
      return { ok: false, error: 'Obecne hasło się nie zgadza.' };
    }

    try {
      await updatePassword(current, nextPassword);
      return { ok: true };
    } catch (problem) {
      const message = problem instanceof Error ? problem.message : String(problem);
      return { ok: false, error: `Nie udało się zmienić hasła: ${message}` };
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
    changePassword,
  };
}
