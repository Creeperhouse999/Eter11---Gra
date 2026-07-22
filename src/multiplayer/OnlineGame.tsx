import { useState } from 'react';
import { MissionScreen } from '../ui/screens/MissionScreen';
import { SummaryScreen } from '../ui/screens/SummaryScreen';
import { FinaleScreen } from '../ui/screens/FinaleScreen';
import { ALL_CHARACTERS } from '../data/characters';
import type { Action, GameState } from '../engine/types';
import type { Game } from '../ui/useGame';
import type { Room } from './types';
import { ReactionBar } from './ReactionBar';
import { WaitingOverlay } from './WaitingOverlay';

interface OnlineGameProps {
  room: Room;
  uid: string;
  myTurn: boolean;
  activeUid?: string;
  dispatch: (action: Action) => Promise<string | null>;
  react: (kind: import('./types').ReactionKind, target?: string) => Promise<void>;
  reactions: import('./types').Reaction[];
  onLeave: () => void;
}

/**
 * Rozgrywka online — istniejący ekran misji na wspólnym stanie z pokoju.
 *
 * Silnik i widok zostają te same. Różnica: `dispatch` idzie do sieci i działa
 * tylko w naszej turze, a gdy gra ktoś inny, nakładka mówi „czekaj na swój
 * ruch" — bez odbierania widoku planszy, żeby dziecko śledziło grę.
 */
export function OnlineGame({
  room,
  uid,
  myTurn,
  activeUid,
  dispatch,
  react,
  reactions,
  onLeave,
}: OnlineGameProps) {
  const [rejection, setRejection] = useState<string | null>(null);
  const state = room.state as GameState;

  // Adapter do `MissionScreen`, który oczekuje kształtu `Game`. Ruch tłumaczymy
  // na zapis sieciowy; historia i cofanie w grze online nie mają sensu (stan
  // jest wspólny), więc są puste.
  const game: Game = {
    state,
    dispatch: (action: Action) => {
      void dispatch(action).then((error) => setRejection(error));
    },
    rejection,
    dismissRejection: () => setRejection(null),
    history: [],
    undo: () => {},
    overrideState: () => {},
    abandon: () => {},
  };

  const characters = ALL_CHARACTERS;
  const activeName =
    room.players[activeUid ?? '']?.name ?? 'inny gracz';

  if (state.phase === 'finale') {
    return (
      <FinaleScreen
        game={game}
        characters={characters}
        onRestart={onLeave}
      />
    );
  }

  if (state.phase === 'missionSummary') {
    return (
      <>
        <SummaryScreen game={game} />
        <ReactionBar reactions={reactions} players={room.players} onReact={react} uid={uid} />
      </>
    );
  }

  return (
    <>
      <MissionScreen game={game} characters={characters} onQuit={onLeave} />

      {/* Gdy gra ktoś inny — delikatna nakładka, plansza wciąż widoczna. */}
      {!myTurn && <WaitingOverlay activeName={activeName} />}

      <ReactionBar reactions={reactions} players={room.players} onReact={react} uid={uid} />
    </>
  );
}
