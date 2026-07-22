import { useCallback, useEffect, useRef, useState } from 'react';
import { reduce } from '../engine/reducer';
import type { Action } from '../engine/types';
import {
  clearOffer,
  commitMove,
  kickPlayer,
  offerCard,
  playersInOrder,
  sendReaction,
  setReady,
  startGame,
  watchRoom,
} from './room';
import type { CardOffer, Reaction, ReactionKind, Room } from './types';

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
    if (!code) return;
    const stop = watchRoom(code, (next) => {
      setRoom(next);
      setConnected(true);
    });
    return stop;
  }, [code]);

  // Gracze w kolejności tur — indeks aktywnego z tej listy wskazuje, czyj ruch.
  const order = room ? playersInOrder(room) : [];
  const activeUid = room?.state ? order[room.state.activePlayerIndex]?.uid : undefined;
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
      code && uid ? offerCard(code, { ...offer, fromUid: uid }) : Promise.resolve(),
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
