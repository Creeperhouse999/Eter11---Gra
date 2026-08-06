import { useState } from 'react';
import { MissionScreen } from '../ui/screens/MissionScreen';
import { SummaryScreen } from '../ui/screens/SummaryScreen';
import { FinaleScreen } from '../ui/screens/FinaleScreen';
import { ALL_CHARACTERS } from '../data/characters';
import { DEFAULT_UI_TEXT } from '../data/uiText';
import type { Action, GameState } from '../engine/types';
import type { Game } from '../ui/useGame';
import type { Room } from './types';
import { ReactionBar } from './ReactionBar';
import { WaitingOverlay } from './WaitingOverlay';
import { DisconnectBanner } from './DisconnectBanner';
import { CardOfferModal } from './CardOfferModal';
import { revealerUid } from './room';

interface OnlineGameProps {
  room: Room;
  uid: string;
  myTurn: boolean;
  activeUid?: string;
  dispatch: (action: Action) => Promise<string | null>;
  /** Proponuje przekazanie karty; zwraca powód odrzucenia albo `null` przy sukcesie. */
  propose: (offer: { toUid: string; cardId: string }) => Promise<string | null>;
  react: (kind: import('./types').ReactionKind, target?: string) => Promise<void>;
  reactions: import('./types').Reaction[];
  /** Biorący przyjmuje ofertę; zwraca powód odrzucenia albo `null` przy sukcesie. */
  onAcceptOffer: () => Promise<string | null>;
  onDeclineOffer: () => void;
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
  propose,
  react,
  reactions,
  onAcceptOffer,
  onDeclineOffer,
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
      // Przekazanie karty online nie jest natychmiastowe — biorący musi
      // przyjąć. Zamiast wysyłać ruch, tworzymy ofertę; właściwy SHARE_CARD
      // poleci dopiero po akceptacji (patrz Multiplayer.acceptOffer). Gdy
      // ktoś inny w tej samej chwili już coś proponuje (jeden wspólny slot
      // oferty w pokoju), zapis jest odrzucony — pokazujemy powód zamiast po
      // cichu gubić propozycję bez śladu.
      if (action.type === 'SHARE_CARD') {
        void propose({ toUid: action.toPlayerId, cardId: action.cardId }).then((error) => {
          if (error) setRejection(error);
        });
        return;
      }
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

  // Przyjęcie oferty: gdy reduktor odrzuci przekazanie (biorący zabrał już
  // kartę w tej misji, karta jest już na czyjejś macie, dający ją oddał),
  // pokazujemy powód zamiast po cichu zamknąć okno bez żadnej zmiany.
  const handleAcceptOffer = () => {
    void onAcceptOffer().then((error) => {
      if (error) setRejection(error);
    });
  };

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
        <SummaryScreen game={game} viewerId={uid} />
        {/* Przekazanie karty odbywa się właśnie w podsumowaniu: dający
            proponuje, biorący przyjmuje w tym oknie. Bez niego tutaj biorący
            nie miał czego kliknąć i uczenie (warunek spełnienia) było online
            nieosiągalne. */}
        <CardOfferModal
          offer={room.offer ?? null}
          room={room}
          uid={uid}
          onAccept={handleAcceptOffer}
          onDecline={onDeclineOffer}
        />
        <ReactionBar reactions={reactions} players={room.players} onReact={react} uid={uid} />
      </>
    );
  }

  // Między misjami silnik wraca do fazy `setup` (mission: null). Przy stole
  // kolejny problem odkrywa się klikając „Odkryj problem" (START_MISSION);
  // w grze online tego przycisku nie było nigdzie poza pierwszym startem,
  // więc po każdym podsumowaniu partia zawieszała się na pustym ekranie.
  // Odkrywa wyznaczony rewelator — pierwszy ONLINE gracz w kolejności (zwykle
  // host, a gdy host padł tuż po podsumowaniu, przejmuje kolejny obecny, żeby
  // pokój nie wisiał). Reszta czeka, żeby dwa równoległe START_MISSION nie
  // ścigały się o zapis.
  if (state.phase === 'setup') {
    const text = DEFAULT_UI_TEXT;
    const revealer = revealerUid(room);
    const canReveal = Boolean(revealer && revealer === uid);
    const revealerName = room.players[revealer ?? '']?.name ?? activeName;
    return (
      <>
        <main className="relative mx-auto max-w-2xl px-4 py-16 text-center">
          <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />
          <div className="relative">
            <span className="eter-label">Misja {state.missionNumber + 1}</span>
            <h1 className="font-display text-3xl font-bold text-accent">
              {text.missionNextHeading}
            </h1>
            <p className="mt-3 font-mono text-sm text-ink-dim">
              Rozwiązane: {state.solvedProblems.length} · W talii: {state.problemPile.length}
              {state.unsolvedProblems.length > 0 &&
                ` · Odłożone: ${state.unsolvedProblems.length}`}
            </p>
            {canReveal ? (
              <button
                type="button"
                onClick={() => game.dispatch({ type: 'START_MISSION' })}
                className="mt-8 rounded-lg bg-accent px-8 py-4 font-display text-lg font-bold text-bg"
              >
                {text.missionRevealButton}
              </button>
            ) : (
              <p className="mt-8 text-sm text-ink-dim">
                Czekaj, aż {revealerName} odkryje kolejny problem…
              </p>
            )}
          </div>
        </main>
        <ReactionBar reactions={reactions} players={room.players} onReact={react} uid={uid} />
      </>
    );
  }

  // Rozłączony gracz, na którego czekamy — banner z odliczaniem.
  const offlineActive =
    activeUid && room.players[activeUid] && !room.players[activeUid].online
      ? room.players[activeUid]
      : null;

  return (
    <>
      {/* Moja tura → ręka odkryta od razu: online każdy gra na swoim
          urządzeniu, więc chowanie własnych kart przed sobą to zbędny klik.
          Nie moja tura → zostaje zakryta (i tak to cudza ręka aktywnego
          gracza, której nie powinienem widzieć). */}
      <MissionScreen
        game={game}
        characters={characters}
        onQuit={onLeave}
        alwaysRevealed={myTurn}
      />

      {/* Gdy gra ktoś inny — delikatna nakładka, plansza wciąż widoczna. */}
      {!myTurn && !offlineActive && <WaitingOverlay activeName={activeName} />}

      {offlineActive && (
        <DisconnectBanner
          name={offlineActive.name}
          turnStartedAt={room.turnStartedAt}
        />
      )}

      <CardOfferModal
        offer={room.offer ?? null}
        room={room}
        uid={uid}
        onAccept={handleAcceptOffer}
        onDecline={onDeclineOffer}
      />

      <ReactionBar reactions={reactions} players={room.players} onReact={react} uid={uid} />
    </>
  );
}
