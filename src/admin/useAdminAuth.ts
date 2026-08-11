import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase/client';
import { loadRole, type Role } from '../firebase/roles';

/**
 * Rola do czasu ustalenia prawdziwej — najniższy poziom, żeby guardy
 * (canEdit/canDiscuss/…) odmawiały. Konto bez wpisu roli to coworker
 * (DEFAULT_ROLE), ale to rozstrzyga dopiero `loadRole`; DO wtedy blokujemy, bo
 * inaczej `viewer` przez moment miał prawa coworkera (Zapisz, Ctrl+S, Dyskusja).
 */
const ROLE_UNKNOWN: Role = 'viewer';

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
  // Rola zalogowanego — decyduje, co widać i wolno w panelu. Startuje jako
  // nieznana (najniższy poziom) do czasu odczytu.
  const [role, setRole] = useState<Role>(ROLE_UNKNOWN);
  // Czy `role` to już PRAWDZIWA, odczytana wartość — nie tylko domyślna
  // ROLE_UNKNOWN sprzed odczytu. Bez tego rozróżnienia panel nie umie
  // odróżnić „ta osoba naprawdę nie ma dostępu" od „jeszcze nie wiadomo",
  // a te dwa stany wymagają różnej reakcji: zakładka niedozwolona dla
  // faktycznej roli ma cofnąć na przegląd, ale zakładka z adresu (deep link)
  // nie może zostać cofnięta tylko dlatego, że rola jeszcze się wczytuje —
  // inaczej admin wchodzący wprost na /admin/team zawsze lądował na
  // przeglądzie, bo w chwili sprawdzenia rola była jeszcze nieznana.
  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    // Rośnie przy KAŻDEJ zmianie stanu logowania. Wynik `loadRole` przyjmujemy
    // tylko dla najświeższego logowania — inaczej wolniejszy odczyt roli starego
    // konta (po przelogowaniu w tej samej karcie) rozwiązałby się PO nowym i
    // nadpisał rolę nowego konta rolą starego. Rola bramkuje uprawnienia, więc
    // to realny błąd. Ten sam licznik chroni przed setState po odmontowaniu.
    let authGen = 0;

    // Bezpiecznik: gdyby `onAuthStateChanged` nigdy nie zawołał callbacku
    // (na telefonie zdarza się przy zablokowanym magazynie — patrz persystencja
    // z listą awaryjną w firebase/client.ts), panel wisiałby wiecznie na
    // „Sprawdzanie sesji…". Po 8 s przestajemy czekać i pokazujemy ekran
    // logowania — użytkownik może się zalogować ręcznie zamiast patrzeć w spinner.
    const timeout = setTimeout(() => {
      if (!disposed) setChecking(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      clearTimeout(timeout);
      const gen = (authGen += 1);
      setUser(nextUser);
      setChecking(false);
      // Rola nieznana do czasu odczytu — do wtedy blokujemy uprawnienia.
      setRole(ROLE_UNKNOWN);
      // Bez użytkownika nie ma czego wczytywać — ROLE_UNKNOWN jest tu od razu
      // ostateczną (i poprawną) wartością, nie tymczasowym zgadywaniem.
      setRoleReady(!nextUser);
      if (nextUser) {
        void loadRole(nextUser.uid, nextUser.email).then((resolved) => {
          // Tylko gdy to wciąż aktualne logowanie i komponent żyje.
          if (!disposed && gen === authGen) {
            setRole(resolved);
            setRoleReady(true);
          }
        });
      }
    });

    return () => {
      disposed = true;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

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
    roleReady,
  };
}
