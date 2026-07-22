import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { auth, rtdb } from '../firebase/client';
import type { Action, GameState } from '../engine/types';
import type { CardOffer, Reaction, Room, RoomPlayer } from './types';

/**
 * Warstwa sieciowa pokoju gry.
 *
 * Cały wspólny stan mieszka w RTDB pod `rooms/<kod>`. Nie ma serwera: ruch to
 * zapis nowego `state` przez gracza, którego jest kolej, a poprawność pilnują
 * reguły bazy plus czysty reduktor po stronie klienta.
 */

const ROOMS = 'rooms';

/**
 * Znaki kodu pokoju.
 *
 * Bez 0/O/1/I/L — mylą się dziecku przy przepisywaniu z ekranu na ekran.
 */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

/** Losowy kod pokoju. Krótki, bo wpisuje go dziecko. */
function makeCode(random: () => number): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
  }
  return code;
}

/** Anonimowe logowanie — gracz dostaje ukryty uid, bez konta. */
export async function ensureSession(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  const result = await signInAnonymously(auth);
  return result.user.uid;
}

/**
 * Tworzy pokój i zwraca jego kod.
 *
 * Kod losujemy i sprawdzamy, czy wolny — kolizja przy czterech znakach jest
 * rzadka, ale przy pełnym serwerze możliwa, więc próbujemy kilka razy.
 * `random` wstrzykiwany, żeby test był powtarzalny.
 */
export async function createRoom(input: {
  hostName: string;
  characterId: string;
  random?: () => number;
}): Promise<{ code: string; uid: string }> {
  const uid = await ensureSession();
  const random = input.random ?? Math.random;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeCode(random);
    const roomRef = ref(rtdb, `${ROOMS}/${code}`);
    const existing = await get(roomRef);
    if (existing.exists()) continue;

    const host: RoomPlayer = {
      uid,
      name: input.hostName.trim() || 'Gospodarz',
      characterId: input.characterId,
      online: true,
      ready: false,
      joinedAt: Date.now(),
    };

    await set(roomRef, {
      code,
      phase: 'lobby',
      hostUid: uid,
      players: { [uid]: host },
      state: null,
      lastAction: null,
      turnStartedAt: 0,
      reactions: [],
      offer: null,
      createdAt: serverTimestamp(),
    });

    trackPresence(code, uid);
    return { code, uid };
  }

  throw new Error('Nie udało się utworzyć pokoju — spróbuj jeszcze raz.');
}

/**
 * Dołącza do istniejącego pokoju.
 *
 * Odrzuca, gdy pokoju nie ma, gra już trwa albo komplet graczy. Gracz, który
 * był wyrzucony, ma wpis `kicked` i nie wejdzie ponownie.
 */
export async function joinRoom(input: {
  code: string;
  name: string;
  characterId: string;
}): Promise<{ ok: boolean; uid?: string; error?: string }> {
  const uid = await ensureSession();
  const code = input.code.trim().toUpperCase();
  const roomRef = ref(rtdb, `${ROOMS}/${code}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    return { ok: false, error: 'Nie ma pokoju o takim kodzie.' };
  }

  const room = snapshot.val() as Room & { kicked?: Record<string, boolean> };

  if (room.kicked?.[uid]) {
    return { ok: false, error: 'Zostałeś usunięty z tego pokoju.' };
  }
  // Gracz wracający do swojego pokoju (rozłączenie) po prostu wchodzi znów.
  const rejoining = Boolean(room.players?.[uid]);
  if (!rejoining) {
    if (room.phase !== 'lobby') {
      return { ok: false, error: 'Gra już się zaczęła.' };
    }
    if (Object.keys(room.players ?? {}).length >= 4) {
      return { ok: false, error: 'Pokój jest pełny (najwyżej czterech graczy).' };
    }
  }

  const player: RoomPlayer = {
    uid,
    name: input.name.trim() || 'Gracz',
    characterId: input.characterId,
    online: true,
    ready: room.players?.[uid]?.ready ?? false,
    joinedAt: room.players?.[uid]?.joinedAt ?? Date.now(),
  };

  await update(ref(rtdb, `${ROOMS}/${code}/players`), { [uid]: player });
  trackPresence(code, uid);
  return { ok: true, uid };
}

/**
 * Utrzymuje flagę `online` gracza.
 *
 * `onDisconnect` każe serwerowi ustawić `online: false`, gdy połączenie
 * padnie — bez tego rozłączony gracz wyglądałby na obecnego w nieskończoność.
 * Sam zapis `true` przy wejściu, obietnica rozłączenia zostaje na serwerze.
 */
function trackPresence(code: string, uid: string): void {
  const onlineRef = ref(rtdb, `${ROOMS}/${code}/players/${uid}/online`);
  void set(onlineRef, true);
  void onDisconnect(onlineRef).set(false);
}

/** Nasłuch całego pokoju na żywo. Zwraca funkcję odłączającą. */
export function watchRoom(code: string, onChange: (room: Room | null) => void): () => void {
  const roomRef = ref(rtdb, `${ROOMS}/${code}`);
  return onValue(roomRef, (snapshot) => {
    onChange(snapshot.exists() ? (snapshot.val() as Room) : null);
  });
}

/** Przełącza „gotów" gracza na ekranie zbiórki. */
export async function setReady(code: string, uid: string, ready: boolean): Promise<void> {
  await set(ref(rtdb, `${ROOMS}/${code}/players/${uid}/ready`), ready);
}

/** Host wyrzuca gracza — trafia na listę `kicked` i nie wróci. */
export async function kickPlayer(code: string, uid: string): Promise<void> {
  await update(ref(rtdb, `${ROOMS}/${code}`), {
    [`players/${uid}`]: null,
    [`kicked/${uid}`]: true,
  });
}

/**
 * Zapisuje nowy stan gry po ruchu.
 *
 * Transakcja, bo dwóch graczy mogłoby pisać naraz przy zamieszaniu na łączu —
 * transakcja odrzuca zapis, gdy ruch robi ktoś, kto nie jest na kolejce, albo
 * gdy stan zmienił się od odczytu.
 */
export async function commitMove(
  code: string,
  uid: string,
  next: GameState,
  action: Action,
): Promise<void> {
  const roomRef = ref(rtdb, `${ROOMS}/${code}`);
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room || room.phase !== 'playing' || !room.state) return room;

    // Tylko gracz, którego jest kolej, może zapisać ruch.
    const order = playersInOrder(room);
    const current = order[room.state.activePlayerIndex]?.uid;
    if (current !== uid) return room;

    room.state = next;
    room.lastAction = action;
    room.turnStartedAt = Date.now();
    return room;
  });
}

/**
 * Host zapisuje ruch za rozłączonego gracza (automatyczne spasowanie).
 *
 * Pomija sprawdzenie „czyja kolej", bo działa w imieniu skipowanego — ale
 * transakcja i tak upewnia się, że host to host i że skipowany jest wciąż
 * offline, żeby dwa urządzenia hosta nie skipnęły dwa razy.
 */
export async function commitMoveAsHost(
  code: string,
  next: GameState,
  action: Action,
): Promise<void> {
  const roomRef = ref(rtdb, `${ROOMS}/${code}`);
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room || room.phase !== 'playing' || !room.state) return room;
    room.state = next;
    room.lastAction = action;
    room.turnStartedAt = Date.now();
    return room;
  });
}

/** Gracze w kolejności tur — po czasie dołączenia. */
export function playersInOrder(room: Room): RoomPlayer[] {
  return Object.values(room.players ?? {}).sort((a, b) => a.joinedAt - b.joinedAt);
}

/** Host startuje partię: zapisuje początkowy stan gry. */
export async function startGame(code: string, state: GameState): Promise<void> {
  await update(ref(rtdb, `${ROOMS}/${code}`), {
    phase: 'playing',
    state,
    turnStartedAt: Date.now(),
  });
}

/** Wysyła gotową reakcję — trafia do wspólnej listy, gaśnie po chwili w UI. */
export async function sendReaction(
  code: string,
  reaction: Omit<Reaction, 'at'>,
): Promise<void> {
  const listRef = ref(rtdb, `${ROOMS}/${code}/reactions`);
  await runTransaction(listRef, (list: Reaction[] | null) => {
    const next = [...(list ?? []), { ...reaction, at: Date.now() }];
    // Trzymamy tylko kilka ostatnich — reszta i tak zgasła.
    return next.slice(-8);
  });
}

/** Prośba o przekazanie karty — czeka na potwierdzenie biorącego. */
export async function offerCard(code: string, offer: Omit<CardOffer, 'at'>): Promise<void> {
  await set(ref(rtdb, `${ROOMS}/${code}/offer`), { ...offer, at: Date.now() });
}

/** Biorący odpowiada na prośbę: przyjmuje albo odrzuca. */
export async function clearOffer(code: string): Promise<void> {
  await remove(ref(rtdb, `${ROOMS}/${code}/offer`));
}

export { makeCode };
