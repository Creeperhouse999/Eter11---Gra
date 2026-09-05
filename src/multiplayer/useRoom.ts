import { useCallback, useEffect, useRef, useState } from 'react';
import { reduce } from '../engine/reducer';
import type { Action } from '../engine/types';
import {
  clearOffer,
  commitMove,
  commitMoveAsHost,
  commitReveal,
  commitSummaryMove,
  kickPlayer,
  offerCard,
  playersInOrder,
  revealerUid,
  sendReaction,
  setReady,
  startGame,
  trackPresence,
  watchRoom,
} from './room';
import type { CardOffer, Reaction, ReactionKind, Room } from './types';
import { aktywnyUid } from './turnOwner';

/**
 * Podłączenie do pokoju: nasłuch na żywo plus akcje gracza.
 *
 * Gra działa na wspólnym stanie z bazy. Gdy przychodzi tura tego gracza,
 * jego ruch liczy się lokalnie czystym reduktorem i zapisuje jako nowy stan —
 * reszta pokoju widzi zmianę przez nasłuch. Nikt nie jest serwerem.
 */
export function useRoom(code: string | null, uid: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Nowy pokój (albo powrót do lobby) zaczyna jako „jeszcze niepołączony".
    // Bez tego resetu `connected` zostałby `true` z poprzedniego pokoju, a
    // wołający nie odróżniłby „ładuję" od „pokój zniknął".
    setRoom(null);
    setConnected(false);
    if (!code) return;
    const stop = watchRoom(code, (next) => {
      setRoom(next);
      setConnected(true);
    });
    return stop;
  }, [code]);

  // Obecność gracza (`online`) przez cały pobyt w pokoju. Osobno od nasłuchu
  // stanu, bo zależy też od `uid` i musi się posprzątać przy wyjściu — inaczej
  // nasłuch `.info/connected` zostawałby po opuszczeniu pokoju i przy powrocie
  // sieci wpisywał obecność do pokoju, z którego gracz już wyszedł.
  useEffect(() => {
    if (!code || !uid) return;
    return trackPresence(code, uid);
  }, [code, uid]);

  // Gracze w kolejności dołączenia — do wyświetlenia listy w poczekalni i przy
  // stole, NIE do liczenia tury (patrz `activeUid` niżej).
  const order = room ? playersInOrder(room) : [];
  // Aktywny gracz wg `state.players` — to samo źródło, z którego `MissionScreen`
  // bierze aktywnego gracza i czyją rękę pokazuje (patrz `aktywnyUid`). Wcześniej
  // liczyliśmy to z kolejności POKOJU (`playersInOrder`), która rozjeżdża się od
  // `state.players`, gdy ktoś opuści pokój w trakcie gry — ekran misji poprawnie
  // odblokowywał kartę aktywnemu graczowi, a zapis tutaj i tak odrzucał ruch
  // „To nie Twoja kolej", bo liczył turę z INNEJ listy.
  const activeUid = aktywnyUid(room?.state);
  const myTurn = Boolean(uid && activeUid === uid);

  /**
   * Wykonanie ruchu.
   *
   * Liczymy nowy stan lokalnie i zapisujemy — ale tylko, gdy naprawdę nasza
   * kolej i reduktor ruchu nie odrzucił. Odrzucony ruch (zła karta, nie ta
   * faza) nie idzie do sieci; wołający dostaje komunikat.
   */
  const dispatch = useCallback(
    async (action: Action): Promise<string | null> => {
      if (!code || !uid || !room?.state) return 'Pokój nie jest gotowy.';

      // Odkrycie kolejnego problemu między misjami (faza `setup`) nie ma
      // zwykłej tury — autoryzuje je wyznaczony rewelator (pierwszy online
      // gracz), więc partia rusza dalej także wtedy, gdy host padł tuż po
      // podsumowaniu. Bez tego pokój wisiał na pustym ekranie startu misji.
      if (action.type === 'START_MISSION') {
        return commitReveal(code, uid);
      }

      // Zamknięcie okna Czarnego Łabędzia nie jest ruchem tury: karta weszła
      // sama w chwili dobrania (niezależnie od tego, czyja kolej), a komunikat
      // `pendingSwanEvents` to stan WSPÓŁDZIELONY — blokujące okno widzą wszyscy
      // klienci. Gdyby zamknąć mógł tylko aktywny gracz, ten kto dobrał Łabędzia
      // (często NIE na kolejce) utykał z oknem, którego przycisk „Rozumiem"
      // dawał ciche „nie Twoja kolej", dopóki aktywny gracz nie zamknął go za
      // niego. Czyszczenie kolejki jest idempotentne i niezależne od tury, więc
      // liczymy je w transakcji (jak ruch podsumowania): dowolny gracz w pokoju
      // może zamknąć okno, a równoległe zamknięcia się nie nadpisują.
      if (action.type === 'DISMISS_SWAN_EVENTS') {
        return commitSummaryMove(code, uid, action);
      }

      // Podsumowanie misji nie ma tury: każdy gracz zabiera własną kartę na
      // matę albo przekazuje ją innym, niezależnie. Poza podsumowaniem ruch
      // robi tylko gracz, którego jest kolej. Bez tego rozróżnienia w grze
      // online tylko „aktywny" gracz mógł cokolwiek zrobić na podsumowaniu —
      // reszta utykała, nie mogąc zabrać karty ani przyjąć przekazania.
      if (room.state.phase === 'missionSummary') {
        // Gracz działa tylko we własnym imieniu — reduktor i tak sprawdza
        // właściciela karty, tu pilnujemy, że nie gra za kogoś innego.
        //
        // Przekazanie jest dwustronne: ofertę tworzy DAJĄCY, ale `SHARE_CARD`
        // wysyła BIORĄCY, klikając „Przyjmij" (przycisk widzi tylko odbiorca —
        // patrz CardOfferModal, Multiplayer.acceptOffer). Aktorem jest więc
        // `toPlayerId`. Wcześniej braliśmy tu `fromPlayerId` (dającego), przez
        // co akceptacja u odbiorcy zawsze leciała jako „nie Twoja karta", a
        // przekazanie — jedyne źródło doświadczenia za uczenie, warunku
        // spełnienia — nie działało online w ogóle.
        const actor =
          action.type === 'SHARE_CARD'
            ? action.toPlayerId
            : 'playerId' in action
              ? action.playerId
              : undefined;
        if (actor !== undefined && actor !== uid) return 'To nie Twoja karta.';
        // Ruch liczony w transakcji — dwa równoległe zabrania nie nadpiszą się.
        return commitSummaryMove(code, uid, action);
      }

      if (!myTurn) return 'To nie Twoja kolej.';

      const result = reduce(room.state, action);
      if (result.rejected) return result.rejected;

      await commitMove(code, uid, result.state, action);
      return null;
    },
    [code, uid, room?.state, myTurn],
  );

  const ready = useCallback(
    (value: boolean) => (code && uid ? setReady(code, uid, value) : Promise.resolve()),
    [code, uid],
  );

  const kick = useCallback(
    (target: string) => (code ? kickPlayer(code, target) : Promise.resolve()),
    [code],
  );

  const react = useCallback(
    (kind: ReactionKind, target?: string) =>
      code && uid ? sendReaction(code, { from: uid, kind, target }) : Promise.resolve(),
    [code, uid],
  );

  const propose = useCallback(
    (offer: Omit<CardOffer, 'at' | 'fromUid'>) =>
      code && uid ? offerCard(code, { ...offer, fromUid: uid }) : Promise.resolve(null),
    [code, uid],
  );

  const resolveOffer = useCallback(
    () => (code ? clearOffer(code) : Promise.resolve()),
    [code],
  );

  const begin = useCallback(
    () => (code && room?.state ? startGame(code, room.state) : Promise.resolve()),
    [code, room?.state],
  );

  // Skipnięcie tury rozłączonego gracza po minucie.
  //
  // Robi to WYŁĄCZNIE koordynator — pierwszy obecny gracz w kolejności
  // (`revealerUid`), a nie host. Gdyby liczył każdy, tura skipnęłaby się kilka
  // razy naraz; gdyby liczył tylko host, a to host byłby rozłączonym aktywnym
  // graczem, nie byłoby komu spasować jego turę i partia zawisłaby na stałe.
  // Koordynator jest zawsze obecny (online) i jednoznaczny. Gracz na kolejce,
  // który jest offline dłużej niż minutę od początku swojej tury, dostaje
  // automatyczne „pasuję" i wypada z gry.
  const isSkipCoordinator = Boolean(uid && room && revealerUid(room) === uid);
  useEffect(() => {
    if (!isSkipCoordinator || !code || !room?.state || room.phase !== 'playing') return;
    // `room.phase` to faza POKOJU (trwa 'playing' przez całą partię) — tura
    // istnieje tylko w fazie STANU GRY 'mission'. W 'setup'/'missionSummary'
    // `activePlayerIndex` to resztka z poprzedniej misji: bez tego warunku
    // koordynator odpalał zbędną transakcję PASS za każdym razem, gdy ten
    // przestarzały „aktywny" gracz był offline — reduktor i tak by ją
    // odrzucił (poza fazą 'mission' nie ma czyjej kolei), ale to niepotrzebny
    // zapis przy każdym wejściu na ekran poczekalni/podsumowania.
    if (room.state.phase !== 'mission') return;
    if (!activeUid) return;

    const active = room.players[activeUid];
    if (!active || active.online) return;

    const deadline = room.turnStartedAt + 60_000;
    const skippedUid = activeUid;
    const fire = () => {
      // Automatyczne spasowanie za rozłączonego — silnik przesuwa turę dalej.
      // `skippedUid` przypięty do tego przebiegu efektu; zmiana tury restartuje
      // efekt (jest w zależnościach) i czyści ten timer. Ruch PRZELICZA i
      // zabezpiecza transakcja w `commitMoveAsHost` (host? wciąż jego tura?
      // wciąż offline?), więc nie liczymy tu nic ze stanu, który mógł się już
      // zmienić — inaczej PASS ze starego stanu nadpisałby ruch gracza, który
      // zdążył wrócić tuż przed deadline. `uid` to hostUid.
      if (uid) {
        void commitMoveAsHost(code, uid, skippedUid, { type: 'PASS', playerId: skippedUid });
      }
    };

    const wait = deadline - Date.now();
    if (wait <= 0) {
      fire();
      return;
    }
    const timer = window.setTimeout(fire, wait);
    return () => window.clearTimeout(timer);
  }, [isSkipCoordinator, code, room?.state, room?.turnStartedAt, activeUid, room?.players, room?.phase]);

  return {
    room,
    connected,
    order,
    activeUid,
    myTurn,
    isHost: Boolean(uid && room?.hostUid === uid),
    dispatch,
    ready,
    kick,
    react,
    propose,
    resolveOffer,
    begin,
  };
}

/**
 * Świeże reakcje — te z ostatnich paru sekund, do pokazania jako dymki.
 *
 * Lista w bazie trzyma kilka ostatnich; tutaj odsiewamy te, które już zgasły,
 * i odświeżamy widok, żeby dymek zniknął sam.
 */
export function useFreshReactions(reactions: Reaction[] | undefined, ttlMs = 4000) {
  const [, tick] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    // Odświeżenie co sekundę, żeby wygaszać dymki bez czekania na kolejną
    // reakcję z sieci.
    timer.current = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const now = Date.now();
  return (reactions ?? []).filter((r) => now - r.at < ttlMs);
}
