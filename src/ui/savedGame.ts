import { DEFAULT_CONFIG } from '../engine/reducer';
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

    // Kontrola kształtu obejmuje pola, których UI używa bez sprawdzania —
    // wczytanie stanu bez ręki albo z `mission` innym niż obiekt kończyło się
    // wyjątkiem w renderze, czyli pustym ekranem zamiast wznowionej partii.
    const state = payload.state as GameState;

    const playersOk =
      Array.isArray(state.players) &&
      state.players.length > 0 &&
      state.players.every(
        (player) =>
          typeof player?.id === 'string' &&
          Array.isArray(player.hand) &&
          Array.isArray(player.mat) &&
          Array.isArray(player.experience),
      );
    if (!playersOk) return null;

    // `mission` bywa `null` między misjami — ale gdy jest, musi być obiektem
    // z listą problemów i zagranych kart.
    if (state.mission !== null) {
      const mission = state.mission;
      if (
        typeof mission !== 'object' ||
        !Array.isArray(mission?.problems) ||
        !Array.isArray(mission?.played)
      ) {
        return null;
      }
    }

    if (!Array.isArray(state.drawPile) || !Array.isArray(state.problemPile)) {
      return null;
    }

    // Scalenie zasad z domyślnymi: zapis sprzed dodania jakiegoś parametru
    // (np. `maxHandSize`) nie ma go w `state.config`, a silnik czyta go przy
    // każdej rundzie. Bez tego wznowiona partia ignorowałaby nowy limit —
    // cicho, bez błędu. Wartości zapisane mają pierwszeństwo, dochodzą tylko
    // brakujące.
    return {
      ...state,
      config: { ...DEFAULT_CONFIG, ...state.config },
    };
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

/**
 * Ziarno partii, którą da się wznowić.
 *
 * Celowo przechodzi przez `loadGame`, a nie czyta samego pola: sesja
 * wznawia się z pustą listą graczy i liczy, że stan przyjdzie z zapisu.
 * Gdyby ziarno zwracało się dla zapisu, którego `loadGame` potem odrzuca
 * (inna wersja formatu, uszkodzone dane), powstałaby partia bez graczy —
 * nie do rozegrania i nadpisująca oryginalny zapis.
 */
export function savedSeed(): number | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw) as Partial<Saved>;
    const seed = payload.seed;
    if (typeof seed !== 'number') return null;

    return loadGame(seed) === null ? null : seed;
  } catch {
    return null;
  }
}
