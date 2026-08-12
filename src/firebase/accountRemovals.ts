import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from './client';

/**
 * Zlecenia trwałego usunięcia konta.
 *
 * Konta z Firebase nie da się skasować z przeglądarki — to operacja Admin SDK,
 * wymagająca klucza, który daje pełną władzę nad projektem. Trzymany w panelu
 * byłby do wyjęcia przez każdego, kto otworzy narzędzia deweloperskie, więc
 * zamiast tego panel tylko ZLECA usunięcie: zapisuje wpis tutaj, a wykonuje go
 * GitHub Actions, gdzie klucz jest sekretem repozytorium.
 *
 * Dla admina wygląda to jak jedno kliknięcie; różnica jest taka, że konto
 * znika po chwili, a nie natychmiast.
 */
export interface AccountRemoval {
  id: string;
  /** Konto do usunięcia — po nim Actions je znajduje. */
  uid: string;
  /** Adres, żeby w panelu było widać, o kogo chodzi, bez zaglądania do bazy. */
  email: string;
  /** Kto zlecił — podpis do wglądu. */
  requestedBy: string;
  requestedAt: string;
  /** Kiedy Actions wykonał. Puste = jeszcze czeka. */
  doneAt?: string;
  /** Co poszło nie tak, jeśli poszło. */
  error?: string;
}

const COLLECTION = 'accountRemovals';

export async function requestRemoval(input: {
  uid: string;
  email: string;
  requestedBy: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!input.uid) return { ok: false, error: 'Brak konta do usunięcia.' };

  try {
    await addDoc(collection(db, COLLECTION), {
      uid: input.uid,
      email: input.email,
      requestedBy: input.requestedBy,
      requestedAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch (error) {
    console.error('Nie udało się zlecić usunięcia konta:', error);
    return { ok: false, error: 'Nie udało się zlecić usunięcia.' };
  }
}

/**
 * Podgląd zleceń — panel pokazuje, co czeka na wykonanie i co już poszło.
 *
 * Bez tego admin klikałby w ciemno: konto znika dopiero, gdy Actions je
 * podejmie, a to trwa chwilę.
 */
export function watchRemovals(
  onChange: (items: AccountRemoval[]) => void,
): () => void {
  return onSnapshot(
    query(collection(db, COLLECTION), orderBy('requestedAt', 'desc')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data() as Omit<AccountRemoval, 'id'>;
          return {
            id: entry.id,
            uid: data.uid ?? '',
            email: data.email ?? '',
            requestedBy: data.requestedBy ?? '',
            requestedAt: data.requestedAt ?? '',
            ...(data.doneAt ? { doneAt: data.doneAt } : {}),
            ...(data.error ? { error: data.error } : {}),
          };
        }),
      );
    },
    (error) => {
      console.error('Podgląd zleceń usunięcia nie działa:', error);
      onChange([]);
    },
  );
}
