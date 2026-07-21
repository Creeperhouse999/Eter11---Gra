import type { GameState } from '../engine/types';

const KEY = 'eter11:game';

/**
 * Wersja zapisu. Zmiana kształtu stanu unieważnia stare partie — lepiej
 * zacząć od nowa niż wczytać dane, których reducer już nie rozumie.
 */
const VERSION = 1;

interface Saved {
  version: number;
  /** Do rozpoznania, czy zapis pasuje do tej samej rozgrywki. */
  seed: number;
  state: GameState;
}

/**
 * Zapis partii między odświeżeniami strony.
 *
 * Gra przy stole trwa do siedmiu misji, a przeglądarka na telefonie
 * potrafi odświeżyć kartę sama — bez zapisu cała partia przepadała.
 * Stan gry to czysty obiekt (bez klas i dat), więc JSON wystarcza.
 *
 * Zapis jest najlepszym staraniem: brak `localStorage` (tryb prywatny,
 * wyłączone ciasteczka) nie może wywrócić gry, więc każdy błąd kończy się
 * cichym pominięciem zapisu.
 */
export function saveGame(seed: number, state: GameState): void {
  try {
    const payload: Saved = { version: VERSION, seed, state };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Brak miejsca albo zablokowany zapis — gra działa dalej bez zapisu.
  }
}

/** Wczytuje zapisaną partię. `null`, gdy nie ma czego wczytać. */
export function loadGame(seed: number): GameState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw) as Partial<Saved>;
    if (payload.version !== VERSION) return null;
    if (payload.seed !== seed) return null;
    if (!payload.state || typeof payload.state !== 'object') return null;

    // Minimalna kontrola kształtu: uszkodzony zapis ma nie wywalić gry.
    const state = payload.state as GameState;
    if (!Array.isArray(state.players) || state.players.length === 0) return null;

    return state;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nie ma czego czyścić.
  }
}

/** Czy jest zapisana partia — niezależnie od ziarna. */
export function hasSavedGame(): boolean {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw) as Partial<Saved>;
    return payload.version === VERSION && Boolean(payload.state);
  } catch {
    return false;
  }
}

/** Ziarno zapisanej partii — potrzebne, żeby ją wznowić. */
export function savedSeed(): number | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as Partial<Saved>;
    return payload.version === VERSION ? (payload.seed ?? null) : null;
  } catch {
    return null;
  }
}
