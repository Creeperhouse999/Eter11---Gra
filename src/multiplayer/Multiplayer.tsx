import { useEffect, useState } from 'react';
import { createGame, DEFAULT_CONFIG } from '../engine/reducer';
import { ALL_PROBLEMS } from '../data/problems';
import { ALL_CARDS } from '../data/cards';
import type { GameContent } from '../firebase/validate';
import { LobbyScreen } from './LobbyScreen';
import { RoomLobby } from './RoomLobby';
import { OnlineGame } from './OnlineGame';
import { playersInOrder, startGame } from './room';
import { useRoom } from './useRoom';

interface MultiplayerProps {
  /** Treść gry (karty, problemy) — ta sama co w grze jednoosobowej. */
  content: GameContent;
  onExit: () => void;
}

/**
 * Gra wieloosobowa: lobby → poczekalnia → rozgrywka na wspólnym stanie.
 *
 * Kod pokoju i uid trzymamy tu; `useRoom` daje stan na żywo i akcje. Host
 * startuje partię, budując `GameState` z graczy zebranych w poczekalni —
 * dokładnie tym samym `createGame`, co gra przy stole.
 */
export function Multiplayer({ content, onExit }: MultiplayerProps) {
  const [code, setCode] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  const {
    room,
    activeUid,
    myTurn,
    isHost,
    dispatch,
    kick,
    react,
    propose,
    resolveOffer,
    begin,
  } = useRoom(code, uid);

  // Pokój zniknął (host zamknął, albo nas wyrzucono) — wracamy do lobby.
  useEffect(() => {
    if (code && room === null) {
      setCode(null);
      setUid(null);
    }
  }, [code, room]);

  // Nas wyrzucono z pokoju — nasz wpis zniknął, choć pokój trwa.
  useEffect(() => {
    if (room && uid && !room.players?.[uid]) {
      setCode(null);
      setUid(null);
    }
  }, [room, uid]);

  const leave = () => {
    setCode(null);
    setUid(null);
  };

  const acceptOffer = async () => {
    const offer = room?.offer;
    if (!offer || !room?.state) return;
    // Biorący zatwierdza — wysyłamy właściwy ruch przekazania. Że to jego
    // kolej decydować, pilnuje faza podsumowania w silniku.
    await dispatch({
      type: 'SHARE_CARD',
      fromPlayerId: offer.fromUid,
      toPlayerId: offer.toUid,
      cardId: offer.cardId,
    });
    await resolveOffer();
  };

  const declineOffer = () => {
    void resolveOffer();
  };

  /** Host zaczyna: buduje stan gry z zebranych graczy i zapisuje do pokoju. */
  const start = async () => {
    if (!room || !code) return;
    const players = playersInOrder(room).map((p) => ({
      id: p.uid,
      name: p.name,
      characterId: p.characterId,
    }));

    const state = createGame({
      players,
      deck: content.cards ?? ALL_CARDS,
      problems: content.problems ?? ALL_PROBLEMS,
      // Ziarno z kodu pokoju — ta sama partia u wszystkich, powtarzalna.
      seed: [...code].reduce((sum, ch) => sum + ch.charCodeAt(0), 0),
      config: content.rules ?? DEFAULT_CONFIG,
    });

    await startGame(code, state);
  };

  if (!code || !uid) {
    return (
      <LobbyScreen
        onEnter={(newCode, newUid) => {
          setCode(newCode);
          setUid(newUid);
        }}
        onBack={onExit}
      />
    );
  }

  if (!room) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="eter-fade-in font-display text-sm text-ink-dim">Łączę z pokojem…</p>
      </main>
    );
  }

  if (room.phase === 'lobby') {
    return (
      <RoomLobby
        room={room}
        uid={uid}
        isHost={isHost}
        onKick={kick}
        onStart={() => void (isHost ? start() : begin())}
        onLeave={leave}
      />
    );
  }

  return (
    <OnlineGame
      room={room}
      uid={uid}
      myTurn={myTurn}
      activeUid={activeUid}
      dispatch={dispatch}
      propose={propose}
      react={react}
      reactions={room.reactions ?? []}
      onAcceptOffer={() => void acceptOffer()}
      onDeclineOffer={declineOffer}
      onLeave={leave}
    />
  );
}
