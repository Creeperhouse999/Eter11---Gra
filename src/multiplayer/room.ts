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
import { makeCode, normalizeCode } from './roomCode';
import { pierwszaWolnaPostac } from './freeCharacter';
import { ALL_CHARACTERS } from '../data/characters';
import { hydrateRoom, hydrateState } from './hydrate';
import { reduce } from '../engine/reducer';

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

    // Obecność pilnuje `useRoom` przez cały pobyt w pokoju (nasłuch
    // `.info/connected` z odpięciem przy wyjściu) — początkowe `online: true`
    // jest już w zapisie wyżej.
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
}): Promise<{ ok: boolean; uid?: string; code?: string; error?: string }> {
  const uid = await ensureSession();

  // Najpierw szukamy DOKŁADNIE tego, co gracz wpisał, a dopiero potem wersji
  // po poprawieniu literówek. Kolejność ma znaczenie: w bazie leżą pokoje
  // założone starszym zestawem znaków (`UA6E` z szóstką), a sama normalizacja
  // zamieniłaby je na kod, którego nie ma — i dołączenie do istniejącego
  // pokoju padałoby z „nie ma pokoju o takim kodzie".
  const wpisany = input.code.trim().toUpperCase().replace(/\s+/g, '');
  const poprawiony = normalizeCode(input.code);

  let code = wpisany;
  let existing = await get(ref(rtdb, `${ROOMS}/${wpisany}`));
  if (!existing.exists() && poprawiony !== wpisany) {
    // Wpisany kod nie istnieje — może to literówka przy przepisywaniu
    // z drugiego ekranu (6 zamiast G, 5 zamiast S).
    const drugaSzansa = await get(ref(rtdb, `${ROOMS}/${poprawiony}`));
    if (drugaSzansa.exists()) {
      code = poprawiony;
      existing = drugaSzansa;
    }
  }

  // Pokoju nie ma pod żadną wersją kodu — wpisanym ani poprawionym.
  if (!existing.exists()) {
    return { ok: false, error: 'Nie ma pokoju o takim kodzie.' };
  }

  // Sprawdzenia liczymy na danych z `get()` wyżej, a gracza zapisujemy
  // BEZPOŚREDNIO pod swoim węzłem — nie transakcją na całym pokoju.
  //
  // Transakcja była tu trzecim nieudanym podejściem: SDK woła jej funkcję
  // z `null` przy pierwszym przebiegu (zgaduje z pustego lokalnego cache),
  // więc dołączenie przerywało się bez zapisu, a gracz dostawał „nie ma
  // pokoju o takim kodzie" przy pokoju, który był w bazie. Ani wcześniejszy
  // `get()` (miał ogrzać cache), ani `applyLocally: false` tego nie zmieniły —
  // sprawdzone na żywej bazie trzy razy z rzędu.
  //
  // Reguły bazy pozwalają pisać własny węzeł gracza (`$uid === auth.uid`),
  // więc zapis nie potrzebuje transakcji na całości. Wyścig o ostatnie
  // miejsce zostaje wyłapany zaraz po zapisie: jeśli graczy jest za dużo,
  // wycofujemy własny wpis. To rzadki przypadek (czterech chętnych w tej
  // samej sekundzie), a cena jest niska — w przeciwieństwie do dołączania,
  // które nie działa nigdy.
  const pokoj = hydrateRoom(existing.val() as Room);

  if ((pokoj as Room & { kicked?: Record<string, boolean> }).kicked?.[uid]) {
    return { ok: false, error: 'Zostałeś usunięty z tego pokoju.' };
  }

  const gracze = pokoj.players ?? {};
  const wraca = Boolean(gracze[uid]);
  if (!wraca) {
    if (pokoj.phase !== 'lobby') {
      return { ok: false, error: 'Gra już się zaczęła.' };
    }
    if (Object.keys(gracze).length >= 4) {
      return { ok: false, error: 'Pokój jest pełny (najwyżej czterech graczy).' };
    }
  }

  const player: RoomPlayer = {
    uid,
    name: input.name.trim() || 'Gracz',
    // Postać wybieramy TUTAJ, a nie na ekranie dołączania: dopiero tu widać,
    // kto już siedzi w pokoju. Adam zgłosił, że obaj gracze dostawali tę samą
    // postać i partia stała, zanim się zaczęła — start słusznie nie
    // przepuszcza duplikatu, a zmiana w poczekalni wymagała wiedzy, że w ogóle
    // trzeba ją zrobić.
    characterId: pierwszaWolnaPostac(gracze, ALL_CHARACTERS, uid),
    online: true,
    ready: gracze[uid]?.ready ?? false,
    joinedAt: gracze[uid]?.joinedAt ?? Date.now(),
  };

  try {
    await set(ref(rtdb, `${ROOMS}/${code}/players/${uid}`), player);
  } catch (error) {
    const wiadomosc = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: wiadomosc.includes('permission')
        ? 'Nie udało się dołączyć — brak uprawnień do tego pokoju.'
        : 'Nie udało się dołączyć. Sprawdź połączenie i spróbuj jeszcze raz.',
    };
  }

  // Wyścig o ostatnie miejsce: dwóch graczy mogło zapisać się jednocześnie.
  // Sprawdzamy po fakcie i wycofujemy własny wpis, jeśli przekroczyliśmy limit.
  if (!wraca) {
    const poZapisie = await get(ref(rtdb, `${ROOMS}/${code}/players`));
    const wszyscy = hydrateRoom({ players: poZapisie.val() } as Room).players;

    if (Object.keys(wszyscy).length > 4) {
      // Wycofuje się TYLKO nadmiarowy, nie każdy, kto zobaczy tłok. Gdyby
      // wycofywali się wszyscy przekroczeni, przy dwóch chętnych na jedno
      // miejsce nie wszedłby nikt — a miejsce jest przecież wolne.
      //
      // Kolejność liczą wszyscy tak samo (czas dołączenia, przy remisie
      // identyfikator), więc każdy dochodzi do tego samego wniosku, kto ma
      // ustąpić — bez uzgadniania między sobą.
      const kolejka = Object.values(wszyscy).sort(
        (a, b) => a.joinedAt - b.joinedAt || a.uid.localeCompare(b.uid),
      );
      const mojeMiejsce = kolejka.findIndex((p) => p.uid === uid);

      if (mojeMiejsce >= 4) {
        await remove(ref(rtdb, `${ROOMS}/${code}/players/${uid}`));
        return { ok: false, error: 'Pokój jest pełny (najwyżej czterech graczy).' };
      }
    }
  }

  // Obecność (nasłuch `.info/connected`) pilnuje `useRoom` — patrz trackPresence.
  //
  // Zwracamy KOD, którego naprawdę użyliśmy. Ekran lobby odtwarzał go
  // wcześniej sam (`code.trim().toUpperCase()`), więc po poprawieniu
  // literówki wchodził do pokoju o nazwie sprzed poprawki — dołączenie
  // się udawało, a zaraz potem gra mówiła „nie ma pokoju o takim kodzie".
  return { ok: true, uid, code };
}

/**
 * Utrzymuje flagę `online` gracza przez cały pobyt w pokoju.
 *
 * Sama obietnica `onDisconnect` NIE wystarcza. Gdy telefon na moment traci
 * sieć (norma na komórce) i Firebase łączy się z powrotem, serwer zdążył już
 * wykonać `onDisconnect` — ustawił `online: false` i „zużył" obietnicę. Zapis
 * `true` tylko raz przy wejściu nie wracał: gracz zostawał „poza grą" na
 * zawsze, a po minucie koordynator spasowywał jego turę i wyrzucał go z partii,
 * mimo że siedział połączony. Dokładnie to psuło grę we dwoje na komórkach.
 *
 * Dlatego nasłuchujemy `.info/connected` i przy KAŻDYM (ponownym) połączeniu
 * najpierw zbroimy świeżą obietnicę rozłączenia, a potem zapisujemy
 * `online: true`. Zwrócona funkcja tylko ODPINA nasłuch przy wyjściu z pokoju —
 * obietnicy rozłączenia świadomie nie zdejmujemy (jak było wcześniej: rozłączenie
 * i tak oznaczy gracza offline), a `online: false` też nie zapisujemy tu ręcznie,
 * bo dla wyrzuconego gracza (jego węzeł `kickPlayer` właśnie skasował) taki zapis
 * odtworzyłby wpis-widmo. Flaga `disposed` zamyka wyścig, w którym reconnect
 * domknąłby się już po wyjściu i „wskrzesił" obecność w opuszczonym pokoju.
 */
function trackPresence(code: string, uid: string): () => void {
  const onlineRef = ref(rtdb, `${ROOMS}/${code}/players/${uid}/online`);
  const connectedRef = ref(rtdb, '.info/connected');
  let disposed = false;

  const stop = onValue(connectedRef, (snapshot) => {
    if (disposed || snapshot.val() !== true) return;
    // Zbroimy obietnicę PRZED zapisem `true`: gdyby łącze padło w tej samej
    // chwili, rozłączenie i tak ustawi `false`.
    void onDisconnect(onlineRef)
      .set(false)
      .then(() => {
        if (!disposed) void set(onlineRef, true);
      });
  });

  return () => {
    disposed = true;
    stop();
  };
}

/** Nasłuch całego pokoju na żywo. Zwraca funkcję odłączającą. */
export function watchRoom(code: string, onChange: (room: Room | null) => void): () => void {
  const roomRef = ref(rtdb, `${ROOMS}/${code}`);
  return onValue(roomRef, (snapshot) => {
    // `hydrateRoom`: RTDB gubi puste tablice/obiekty, a widok i silnik ich
    // oczekują — bez tego pierwszy `.some` na wyciętym `played` wysypywał grę.
    onChange(snapshot.exists() ? hydrateRoom(snapshot.val() as Room) : null);
  });
}

/** Przełącza „gotów" gracza na ekranie zbiórki. */
export async function setReady(code: string, uid: string, ready: boolean): Promise<void> {
  await set(ref(rtdb, `${ROOMS}/${code}/players/${uid}/ready`), ready);
}

/**
 * Zmiana postaci w poczekalni.
 *
 * Transakcja, bo dwóch graczy mogłoby sięgnąć po tę samą postać w tej samej
 * chwili — sprawdzamy, że nikt inny jej już nie ma, i odrzucamy, gdy zajęta.
 */
export async function setCharacter(
  code: string,
  uid: string,
  characterId: string,
): Promise<boolean> {
  const roomRef = ref(rtdb, `${ROOMS}/${code}`);
  let taken = false;
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room?.players) return room;
    const clash = Object.values(room.players).some(
      (p) => p.uid !== uid && p.characterId === characterId,
    );
    if (clash) {
      taken = true;
      return room; // Bez zmiany — postać zajęta.
    }
    if (room.players[uid]) room.players[uid].characterId = characterId;
    return room;
  });
  return !taken;
}

/** Host wyrzuca gracza — trafia na listę `kicked` i nie wróci. */
export async function kickPlayer(code: string, uid: string): Promise<void> {
  await update(ref(rtdb, `${ROOMS}/${code}`), {
    [`players/${uid}`]: null,
    [`kicked/${uid}`]: true,
  });
}

/**
 * Co zrobić z wpisem gracza przy DOBROWOLNYM wyjściu z pokoju, zależnie od fazy.
 *
 * - `none` — gracza i tak nie ma w pokoju (nic do zrobienia).
 * - `remove` — w poczekalni gra nie zbudowała jeszcze kolejności ze stanu, więc
 *   wpis kasujemy w całości: zwalnia miejsce i wybraną postać.
 * - `offline` — w trakcie gry (i po jej końcu) wpisu NIE wolno usuwać: kolejność
 *   tur mapuje `state.players` po indeksie z `playersInOrder(room)`, więc
 *   skasowanie wpisu rozjechałoby ten indeks u wszystkich. Zostawiamy wpis, ale
 *   `online: false`, żeby koordynator spasował turę wychodzącego (warunek
 *   `!online`) i partia toczyła się dalej.
 *
 * Czysta decyzja, bez sieci — testowalna. Sam zapis robi `leaveRoom`.
 */
export function leaveActionFor(
  room: Room | null,
  uid: string,
): 'none' | 'remove' | 'offline' {
  if (!room?.players?.[uid]) return 'none';
  return room.phase === 'lobby' ? 'remove' : 'offline';
}

/**
 * Czy po wyjściu tego gracza pokój zostaje pusty.
 *
 * Rozpoczęta partia nie kasowała się NIGDY: wychodzący szedł tylko na
 * `online: false`, a węzeł pokoju zostawał w bazie z pełnym stanem (talia,
 * ręce, log — kilkadziesiąt KB) na zawsze. Przy każdej partii dochodził
 * kolejny. Kod pokoju ma tylko cztery znaki, więc uzbierane śmieci zaczęłyby
 * z czasem zjadać pulę kodów: `createRoom` trafiałby w zajęte, a ktoś
 * wpisujący kod na chybił trafił wchodziłby do martwej partii.
 *
 * Kasujemy więc pokój, gdy wychodzi z niego OSTATNI obecny gracz. Czysta
 * funkcja, bez sieci — testowalna sama, ale `leaveRoom` jej NIE używa do
 * decyzji o zapisie: ten widok bywa nieaktualny (patrz komentarz w
 * `leaveRoom`), więc o skasowaniu pokoju decyduje wyłącznie świeży odczyt
 * wewnątrz jego własnej transakcji.
 */
export function roomBecomesEmpty(room: Room | null, uid: string): boolean {
  if (!room?.players?.[uid]) return false;
  return !Object.values(room.players).some(
    (player) => player?.uid !== uid && player?.online,
  );
}

/**
 * Dobrowolne wyjście z pokoju.
 *
 * Wcześniej `leave()` tylko czyścił stan lokalny (kod/uid), a wpisu gracza w
 * bazie nie ruszał. Wpis zostawał z `online: true` (połączenie SPA żyje dalej,
 * więc `onDisconnect` nie odpalał), przez co w grze we dwoje koordynator NIGDY
 * nie spasował tury wychodzącego — partia drugiego gracza wisiała na stałe.
 *
 * Rozbrajamy przy okazji obietnicę rozłączenia tego połączenia: po świadomym
 * wyjściu nie chcemy, by późniejsze zerwanie sieci odtworzyło wpis-widmo.
 */
export async function leaveRoom(
  code: string,
  uid: string,
  room: Room | null,
): Promise<void> {
  const action = leaveActionFor(room, uid);
  if (action === 'none') return;

  const onlineRef = ref(rtdb, `${ROOMS}/${code}/players/${uid}/online`);
  try {
    await onDisconnect(onlineRef).cancel();
  } catch {
    // Rozbrojenie obietnicy jest najlepszym staraniem — brak sieci nie może
    // zablokować wyjścia z pokoju.
  }

  // Decyzja „czy pokój zostaje pusty" liczy się WYŁĄCZNIE na świeżym stanie z
  // transakcji, nigdy na przekazanym `room` — ten bywa nieaktualny (dwóch
  // graczy wychodzących niemal jednocześnie: każdy w swoim lokalnym stanie
  // wciąż widzi TEGO DRUGIEGO jako online, bo jego `watchRoom` nie zdążył się
  // jeszcze odświeżyć). Poleganie na takim widoku jako bramce przed
  // transakcją gubiło kasowanie: oboje trafiali w gałąź „ktoś jeszcze gra" i
  // pokój z pełnym stanem partii zostawał w bazie na zawsze. Transakcja sama
  // odczytuje bazę w chwili zapisu, więc to ona — i tylko ona — decyduje.
  await runTransaction(ref(rtdb, `${ROOMS}/${code}`), (current: Room | null) => {
    if (!current?.players?.[uid]) return current;

    const others = Object.values(current.players ?? {}).filter(
      (player) => player?.uid !== uid && player?.online,
    );
    if (others.length === 0) return null; // Ostatni obecny — kasujemy węzeł.

    if (current.phase === 'lobby') {
      delete current.players[uid];
    } else {
      current.players[uid].online = false;
    }
    return current;
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

    // Tylko gracz, którego jest kolej, może zapisać ruch. Kolejność liczymy
    // z ODSIANEGO od widm `room` (patrz hydrate.ts) — transakcja dostaje
    // SUROWĄ wartość z bazy, nie tę, co przeszła przez `watchRoom`. Widmo
    // (wpis bez `uid`, patrz `realPlayers`) zajmowałoby slot w kolejności,
    // więc indeks aktywnego gracza wskazywałby na nie zamiast na
    // prawdziwego gracza — jego ruch byłby odrzucany na stałe.
    const order = playersInOrder(hydrateRoom(room));
    const current = order[room.state.activePlayerIndex]?.uid;
    if (current !== uid) return room;

    room.state = next;
    room.lastAction = action;
    room.turnStartedAt = Date.now();
    return room;
  });
}

/**
 * Ruch na podsumowaniu misji — bez tury, liczony WEWNĄTRZ transakcji.
 *
 * Na podsumowaniu wielu graczy działa naraz (każdy zabiera swoją kartę na
 * matę albo ją przekazuje). Gdyby liczyć nowy stan z góry i tylko go zapisać,
 * dwa równoległe zabrania nadpisałyby się — drugie zapisałoby stan policzony
 * ze starej wersji i pierwsza karta by zniknęła. Dlatego reduktor biegnie tu
 * na stanie z transakcji: przy konflikcie RTDB ponawia z aktualnym stanem, a
 * ruch dokłada się do już zapisanych, nie zamiast nich.
 */
export async function commitSummaryMove(
  code: string,
  uid: string,
  action: Action,
): Promise<string | null> {
  let rejection: string | null = null;
  const roomRef = ref(rtdb, `${ROOMS}/${code}`);
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room || !room.state) return room;
    // Piszący musi być w pokoju; reguła RTDB pilnuje tego samego.
    if (!room.players?.[uid]) return room;

    // Zamknięcie podsumowania kończy je WSZYSTKIM naraz: niezabrane karty lecą
    // na stos odrzuconych, a wisząca oferta przekazania znika. Dopóki mógł to
    // zrobić dowolny gracz, najszybciej klikające dziecko ucinało reszcie
    // zabieranie karty na matę — jedyną nagrodę z misji. Decyduje więc ten sam
    // wyznaczony gracz co przy odkrywaniu problemu (`commitReveal`): pierwszy
    // online w kolejności, żeby partia nie stanęła, gdy host padnie.
    // Pozostałe ruchy w tej fazie (zabranie własnej karty) zostają wolne.
    if (action.type === 'END_MISSION_SUMMARY' && revealerUid(room) !== uid) {
      rejection = 'Czekaj, aż podsumowanie zamknie wyznaczony gracz.';
      return room;
    }

    // SHARE_CARD idzie z klienta biorącego z ofertą przeczytaną WCZEŚNIEJ
    // (patrz Multiplayer.acceptOffer) — transakcja musi ją zweryfikować na
    // świeżo. `clearOffer` (Anuluj propozycję) to zwykłe `remove()`, nie
    // transakcja: gdy dający anulował tuż przed kliknięciem „Przyjmij" przez
    // biorącego, oferta w bazie już nie istniała, a reduktor i tak przepuszczał
    // przekazanie — sprawdza tylko właściciela karty i fazę misji, nic nie wie
    // o `room.offer`. Karta przechodziła mimo anulowania.
    if (
      action.type === 'SHARE_CARD' &&
      (!room.offer ||
        room.offer.fromUid !== action.fromPlayerId ||
        room.offer.toUid !== action.toPlayerId ||
        room.offer.cardId !== action.cardId)
    ) {
      rejection = 'Ta propozycja już nie obowiązuje.';
      return room;
    }

    // Stan z RTDB bywa okrojony (puste tablice wycięte) — dopełniamy przed
    // reduktorem, inaczej `.some`/`.filter` w silniku by się wysypały.
    const result = reduce(hydrateState(room.state), action);
    if (result.rejected) {
      rejection = result.rejected;
      return room; // Bez zmian — odrzucony ruch nie idzie do sieci.
    }
    room.state = result.state;
    room.lastAction = action;
    // Wyjście z podsumowania (END_MISSION_SUMMARY → następna misja albo finał)
    // unieważnia wiszącą ofertę przekazania: dotyczyła kart tej misji. Bez tego
    // niezaakceptowana oferta zostawała w `room.offer` i wyskakiwała w kolejnej
    // misji jako okno „Dostajesz kartę!", a przyjęcie dispatchowało SHARE_CARD
    // poza fazą `missionSummary` — reduktor i tak by je odrzucił. Czyścimy ją
    // przy zmianie fazy.
    if (result.state.phase !== 'missionSummary') {
      room.offer = null;
    }
    return room;
  });
  return rejection;
}

/**
 * Automatyczne spasowanie za rozłączonego gracza.
 *
 * Pisze to WYZNACZONY KOORDYNATOR — pierwszy obecny gracz w kolejności
 * (`revealerUid`), a NIE host. Wcześniej autoryzował tylko host (`hostUid`),
 * przez co gdy to host był rozłączonym aktywnym graczem, nie było komu spasować
 * jego turę: partia zawieszała się na stałe (a po odejściu hosta żadnego
 * rozłączonego gracza nie dało się już pominąć). Rewelator jest zawsze obecny z
 * definicji i jednoznaczny (jeden najstarszy online gracz), więc dwóch gości nie
 * spasuje naraz — dokładnie ten sam wybór koordynatora co przy `commitReveal`.
 *
 * Ruch PRZELICZA WEWNĄTRZ transakcji na aktualnym stanie (jak `commitSummaryMove`)
 * i zapisuje TYLKO gdy:
 *  - piszący jest aktualnym rewelatorem (koordynatorem), ORAZ
 *  - skipowany gracz WCIĄŻ jest tym aktywnym i WCIĄŻ jest offline.
 *
 * Ten drugi warunek zamyka wyścig: gracz offline potrafi wrócić i zagrać tuż
 * przed upływem minuty (commitMove przesuwa wtedy turę), a strzelający w tej
 * samej chwili timer koordynatora liczył PASS ze starego stanu i bezwarunkowo go
 * zapisywał — kasując dopiero co wykonany ruch i cofając turę. Teraz transakcja
 * widzi aktualny pokój: jeśli tura już przeszła albo gracz jest online, nic
 * nie pisze.
 */
export async function commitMoveAsHost(
  code: string,
  byUid: string,
  skippedUid: string,
  action: Action,
): Promise<void> {
  const roomRef = ref(rtdb, `${ROOMS}/${code}`);
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room || room.phase !== 'playing' || !room.state) return room;
    if (revealerUid(room) !== byUid) return room;

    // Skip liczy się tylko, gdy w chwili zapisu wciąż czekamy właśnie na TEGO
    // gracza i wciąż jest offline. Inaczej jego własny ruch (albo cudzy) już
    // ruszył grę dalej i nadpisanie go spasowaniem byłoby cofnięciem.
    //
    // `hydrateRoom` odsiewa widma (patrz `commitMove` wyżej) — bez tego
    // widmo mogłoby zająć slot pominiętego gracza w kolejności i skip
    // nigdy by się nie zgadzał.
    const order = playersInOrder(hydrateRoom(room));
    if (order[room.state.activePlayerIndex]?.uid !== skippedUid) return room;
    if (room.players?.[skippedUid]?.online) return room;

    // Stan z RTDB bywa okrojony (puste tablice wycięte) — dopełniamy przed
    // reduktorem, tak samo jak w `commitSummaryMove`.
    const result = reduce(hydrateState(room.state), action);
    if (result.rejected) return room;

    room.state = result.state;
    room.lastAction = action;
    room.turnStartedAt = Date.now();
    return room;
  });
}

/** Gracze w kolejności tur — po czasie dołączenia. */
export function playersInOrder(room: Room): RoomPlayer[] {
  return Object.values(room.players ?? {}).sort((a, b) => a.joinedAt - b.joinedAt);
}

/**
 * Kto odkrywa kolejny problem między misjami (faza `setup`).
 *
 * Przy stole robi to każdy po kolei, ale online w fazie `setup`
 * `activePlayerIndex` stoi na 0, więc „turę" ma wyłącznie pierwszy gracz
 * w kolejności — zwykle host. Gdy host rozłączy się właśnie między misjami,
 * nikt inny nie ma tury: START_MISSION przechodzi tylko dla order[0], a
 * automatyczny skip liczy sam host (którego nie ma) i dotyczy tylko fazy
 * `playing`. Pokój wisiał wtedy na „Czekaj, aż host odkryje problem" bez
 * ratunku.
 *
 * Rewelatorem jest więc PIERWSZY ONLINE gracz w kolejności: gdy host jest,
 * to on; gdy padł, przejmuje kolejny obecny. Wybór jest jednoznaczny (jeden
 * najstarszy online gracz), więc dwóch gości nie odkryje problemu naraz.
 */
export function revealerUid(room: Room): string | undefined {
  return playersInOrder(room).find((p) => p.online)?.uid;
}

/**
 * Odkrycie kolejnego problemu (START_MISSION) w fazie `setup`.
 *
 * Osobna ścieżka od `commitMove`, bo między misjami nikt nie ma zwykłej tury —
 * autoryzujemy wyznaczonego rewelatora (pierwszy online gracz), a nie
 * `order[activePlayerIndex]`. Dzięki temu partia rusza dalej także wtedy, gdy
 * host padł tuż po podsumowaniu. Ruch PRZELICZAMY w transakcji (jak
 * `commitSummaryMove`), więc dwa równoległe kliknięcia nie nadpiszą się:
 * pierwsze przenosi grę do fazy `mission`, a drugie trafia już na stan, w
 * którym reduktor odrzuca START_MISSION.
 */
export async function commitReveal(code: string, uid: string): Promise<string | null> {
  let rejection: string | null = null;
  const roomRef = ref(rtdb, `${ROOMS}/${code}`);
  await runTransaction(roomRef, (room: Room | null) => {
    if (!room || room.phase !== 'playing' || !room.state) return room;
    if (!room.players?.[uid]) return room;
    // Odkryć może tylko wyznaczony rewelator — inaczej dwóch obecnych graczy
    // (gdy host padł) ścigałoby się o zapis.
    if (revealerUid(room) !== uid) return room;

    const result = reduce(hydrateState(room.state), { type: 'START_MISSION' });
    if (result.rejected) {
      rejection = result.rejected;
      return room;
    }
    room.state = result.state;
    room.lastAction = { type: 'START_MISSION' };
    room.turnStartedAt = Date.now();
    return room;
  });
  return rejection;
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

/**
 * Prośba o przekazanie karty — czeka na potwierdzenie biorącego.
 *
 * Transakcja, nie zwykły `set`: na podsumowaniu misji wielu graczy działa
 * naraz (patrz `commitSummaryMove`), więc dwie osoby mogły zaproponować
 * przekazanie w tej samej chwili — który zapis wygrał, po prostu kasował
 * ofertę tamtego bez śladu i bez komunikatu (jego okno „Czekasz na
 * odpowiedź" po prostu znikało). Zapisujemy tylko, gdy slot jest wolny;
 * inaczej odrzucamy z powodem, tak jak `commitSummaryMove`.
 */
export async function offerCard(
  code: string,
  offer: Omit<CardOffer, 'at'>,
): Promise<string | null> {
  let rejection: string | null = null;
  const offerRef = ref(rtdb, `${ROOMS}/${code}/offer`);
  await runTransaction(offerRef, (current: CardOffer | null) => {
    if (current) {
      rejection = 'Ktoś inny już proponuje przekazanie karty — poczekaj na odpowiedź.';
      return current; // Bez zmian — cudza oferta zostaje.
    }
    return { ...offer, at: Date.now() };
  });
  return rejection;
}

/** Biorący odpowiada na prośbę: przyjmuje albo odrzuca. */
export async function clearOffer(code: string): Promise<void> {
  await remove(ref(rtdb, `${ROOMS}/${code}/offer`));
}

export { makeCode, trackPresence };
