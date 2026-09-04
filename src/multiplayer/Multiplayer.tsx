import { useEffect, useState } from 'react';
import { createGame, DEFAULT_CONFIG, reduce } from '../engine/reducer';
import { playableProblems } from '../data/problems';
import { buildDeck, playableCards } from '../data/cards';
import type { GameContent } from '../firebase/validate';
import { LobbyScreen } from './LobbyScreen';
import { RoomLobby } from './RoomLobby';
import { OnlineGame } from './OnlineGame';
import { leaveRoom, playersInOrder, startGame } from './room';
import { useRoom } from './useRoom';
import { useToast } from '../ui/controls/Toast';

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
  const toast = useToast();

  const {
    room,
    connected,
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
  //
  // WARUNEK `connected`: tuż po utworzeniu pokoju `room` jest jeszcze `null`,
  // bo pierwszy snapshot z bazy nie doszedł. Na wolnej sieci (telefon) ta
  // chwila trwa na tyle długo, że efekt zdążał zresetować ekran do lobby —
  // gracz klikał „Załóż pokój", widział „Łączę…" i wracał, jakby nic nie
  // utworzył. Resetujemy dopiero, gdy nasłuch RAZ się połączył i mimo to
  // pokoju nie ma — czyli naprawdę zniknął, a nie „jeszcze się nie wczytał".
  useEffect(() => {
    if (code && connected && room === null) {
      setCode(null);
      setUid(null);
    }
  }, [code, connected, room]);

  // Nas wyrzucono z pokoju — nasz wpis zniknął, choć pokój trwa.
  useEffect(() => {
    if (room && uid && !room.players?.[uid]) {
      setCode(null);
      setUid(null);
    }
  }, [room, uid]);

  const leave = () => {
    // Zwolnij wpis w bazie ZANIM zerwiemy lokalne dowiązanie do pokoju: w
    // poczekalni kasuje wpis (wolne miejsce/postać), w grze oznacza offline,
    // żeby koordynator spasował turę wychodzącego. Bez tego partia drugiego
    // gracza we dwoje wisiała na graczu, który już wyszedł. Najlepsze staranie
    // — błąd sieci nie może zablokować powrotu do lobby.
    if (code && uid) void leaveRoom(code, uid, room);
    setCode(null);
    setUid(null);
  };

  const acceptOffer = async (): Promise<string | null> => {
    const offer = room?.offer;
    if (!offer || !room?.state) return null;
    // Biorący zatwierdza — wysyłamy właściwy ruch przekazania. Że to jego
    // kolej decydować, pilnuje faza podsumowania w silniku. Powód odrzucenia
    // (np. biorący zabrał już kartę w tej misji) oddajemy w górę, żeby okno
    // pokazało go zamiast po cichu zniknąć bez przeniesienia karty.
    const rejection = await dispatch({
      type: 'SHARE_CARD',
      fromPlayerId: offer.fromUid,
      toPlayerId: offer.toUid,
      cardId: offer.cardId,
    });
    await resolveOffer();
    return rejection;
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

    const fresh = createGame({
      players,
      // Wersje robocze (`draft`) nie trafiają do gry, a zwykłe karty wchodzą w
      // dwóch egzemplarzach (karty specjalne w jednym) — tak samo jak przy
      // stole i w grze solo (`useGame.ts`). Bez `buildDeck()` talia online
      // miała o połowę mniej zwykłych kart przy tej samej liczbie kart
      // specjalnych, więc te same 2 karty ETER11 stanowiły dwa razy większy
      // odsetek talii i krążyły dwa razy częściej niż przy stole — zgłoszony
      // bug „jeden gracz dostał ETER11 cztery razy, drugi ani razu".
      deck: buildDeck(playableCards(content.cards)),
      problems: playableProblems(content.problems),
      // Ziarno z kodu pokoju — ta sama partia u wszystkich, powtarzalna.
      seed: [...code].reduce((sum, ch) => sum + ch.charCodeAt(0), 0),
      config: content.rules ?? DEFAULT_CONFIG,
    });

    // `createGame` zostawia stan w fazie `setup` z `mission: null` — przy
    // stole gracz odkrywa problem klikając „Odkryj problem" (START_MISSION).
    // Online nikt tego nie klika: pokój od razu wchodzi w `playing`, więc bez
    // tego kroku wszyscy dostawali pusty ekran (MissionScreen bez `mission`
    // rysuje nic). Odpalamy START_MISSION tu, żeby zapisać stan już z misją.
    const started = reduce(fresh, { type: 'START_MISSION' });
    try {
      await startGame(code, started.rejected ? fresh : started.state);
    } catch (e) {
      // `startGame` zapisuje do RTDB (reguły, sieć) — bez tego przechwycenia
      // odrzucony zapis kończył się niezłapanym odrzuceniem obietnicy: przycisk
      // „Zaczynamy" nic nie robił, bez żadnego komunikatu. Surowy błąd do
      // konsoli (dla programisty), a graczowi czytelny toast zamiast ciszy.
      console.error('Rozpoczęcie gry nie powiodło się:', e);
      toast('Nie udało się rozpocząć gry. Spróbuj ponownie.', 'danger');
    }
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
      onAcceptOffer={() => acceptOffer()}
      onDeclineOffer={declineOffer}
      onLeave={leave}
    />
  );
}
