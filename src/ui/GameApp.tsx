import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ALL_CHARACTERS } from '../data/characters';
import { DEFAULT_UI_TEXT, type UiText } from '../data/uiText';
import type { Card, Character, Problem, RulesConfig } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/reducer';
import { FinaleScreen } from './screens/FinaleScreen';
import { MissionScreen } from './screens/MissionScreen';
import { ReportButton } from './components/ReportButton';
import { IntroScreen } from './screens/IntroScreen';
import { SetupScreen } from './screens/SetupScreen';
// Multiplayer leniwie: ściąga RTDB i cały pakiet online tylko wtedy, gdy
// gracz klika „Zagraj przez internet" — gra przy stole go nie pobiera.
const Multiplayer = lazy(() =>
  import('../multiplayer/Multiplayer').then((m) => ({ default: m.Multiplayer })),
);
import { SummaryScreen } from './screens/SummaryScreen';
import {
  TUTORIAL_DECK,
  TUTORIAL_HAND,
  TUTORIAL_PLAYER,
  TUTORIAL_PROBLEM,
} from '../data/tutorial';
import { TutorialDone } from './tutorial/TutorialDone';
import { TutorialLayer } from './tutorial/TutorialLayer';
import { useTutorial, type TutorialContext } from './tutorial/useTutorial';
import { useConfirm } from './controls/useConfirm';
import { savedSeed } from './savedGame';
import { useScreenTitle } from './useScreenTitle';
import { useGame, type PlayerSetup } from './useGame';

import type { IntroContent } from '../data/intro';
import type { TutorialStep } from '../data/tutorial';

export interface GameAppContent {
  cards?: Card[];
  problems?: Problem[];
  characters?: Character[];
  rules?: RulesConfig;
  text?: UiText;
  /** Wstęp z panelu. Brak = wersja wbudowana w kod. */
  intro?: IntroContent;
  /** Kroki samouczka z panelu. Brak = wersja wbudowana. */
  tutorial?: TutorialStep[];
}

interface GameAppProps {
  content?: GameAppContent;
  /** Komunikat o trybie offline — wyświetlany nad grą. */
  notice?: string | null;
}

/** Rozgrywka w toku. Wydzielona, bo useGame potrzebuje graczy przy montowaniu. */
function RunningGame({
  players,
  seed,
  content,
  tutorial,
  onRestart,
}: {
  players: PlayerSetup[];
  seed: number;
  content: GameAppContent;
  tutorial: boolean;
  onRestart: () => void;
}) {
  const { confirm, dialog } = useConfirm();
  const text = content.text ?? DEFAULT_UI_TEXT;
  // Samouczek gra na własnym scenariuszu: jeden gracz, ustawiona ręka
  // i talia, więc przebieg jest identyczny za każdym razem.
  const game = useGame(
    tutorial ? [TUTORIAL_PLAYER] : players,
    seed,
    content.rules ?? DEFAULT_CONFIG,
    tutorial
      ? {
          problems: [TUTORIAL_PROBLEM],
          fixedHand: TUTORIAL_HAND,
          orderedDeck: TUTORIAL_DECK,
        }
      : { cards: content.cards, problems: content.problems },
    // Samouczek zaczyna się od zera przy każdym uruchomieniu — wznawianie
    // ćwiczenia w połowie kroku tylko myliłoby.
    !tutorial,
  );
  const { state, dispatch } = game;
  const titleRef = useScreenTitle();

  /** Porzucenie partii jest nieodwracalne — pytamy, zanim skasujemy zapis. */
  const quit = async () => {
    const confirmed = await confirm({
      title: 'Zakończyć grę?',
      message:
        'Wrócicie do menu, a rozpoczęta partia przepadnie — nie da się do niej wrócić.',
      confirmLabel: 'Zakończ',
      tone: 'danger',
    });
    if (confirmed) {
      // Zapis znika dopiero przy odmontowaniu ekranu gry — inaczej ostatni
      // render zdążyłby go przywrócić.
      game.abandon();
      onRestart();
    }
  };

  // Samouczek nie ma po co pytać „czy zaczynamy" — startuje od razu.
  useEffect(() => {
    if (tutorial && state.phase === 'setup' && state.missionNumber === 0) {
      dispatch({ type: 'START_MISSION' });
    }
  }, [tutorial, state.phase, state.missionNumber, dispatch]);

  /**
   * Samouczek dobiegł końca. Osobny stan, bo flaga `tutorial` gaśnie
   * w momencie kliknięcia „Zaczynamy grę" — warunek oparty na niej nigdy
   * by nie zadziałał.
   */
  const [tutorialDone, setTutorialDone] = useState(false);

  const [tourContext, setTourContext] = useState<TutorialContext>({
    handRevealed: false,
    cardSelected: false,
    swapMode: false,
    swapSelected: 0,
    targetSlot: null,
    swapCount: 0,
  });

  const tour = useTutorial(
    tutorial,
    state,
    tourContext,
    () => setTutorialDone(true),
    content.tutorial,
  );

  /**
   * Zliczenie zakończonej partii — raz, przy wejściu na ekran końcowy.
   *
   * Ref, nie stan: ponowne wejście w ten sam finał (przerysowanie, zmiana
   * rozmiaru okna) nie może liczyć partii drugi raz, a zmiana stanu wywołałaby
   * kolejny render bez żadnego skutku na ekranie.
   *
   * Import dynamiczny, bo cały pakiet Firestore waży więcej niż reszta gry —
   * partia rozegrana bez sieci ma się skończyć tak samo, tylko bez wpisu.
   */
  const counted = useRef(false);
  useEffect(() => {
    if (state.phase !== 'finale' || counted.current || tutorial) return;
    counted.current = true;

    // `.catch` na imporcie: offline pakiet Firestore się nie wczyta, a bez
    // tego odrzucenie importu byłoby nieobsłużone. Statystyka to ciekawostka —
    // partia kończy się tak samo, tylko bez wpisu.
    void import('../firebase/playStats')
      .then(({ recordFinishedGame }) =>
        recordFinishedGame({
          // Wygrana wymaga progu ORAZ choć jednego rozwiązanego problemu.
          // Sam próg nie wystarcza: redaktor mógł ustawić go na 0 w zasadach,
          // a wtedy nawet partia bez ani jednego rozwiązania liczyłaby się jako
          // wygrana — statystyka wygranych skłamałaby.
          won:
            state.solvedProblems.length > 0 &&
            state.solvedProblems.length >= state.config.teamWinThreshold,
          missionsSolved: state.solvedProblems.length,
        }),
      )
      .catch(() => {});
  }, [state.phase, state.solvedProblems.length, state.config.teamWinThreshold, tutorial]);

  // Samouczek liczymy osobno: mówi, ile osób w ogóle nauczyło się grać.
  const countedTutorial = useRef(false);
  useEffect(() => {
    if (!tutorialDone || countedTutorial.current) return;
    countedTutorial.current = true;

    void import('../firebase/playStats')
      .then(({ recordFinishedTutorial }) => recordFinishedTutorial())
      .catch(() => {});
  }, [tutorialDone]);

  if (state.phase === 'finale') {
    return (
      <FinaleScreen
        game={game}
        text={text}
        characters={content.characters ?? ALL_CHARACTERS}
        onRestart={onRestart}
      />
    );
  }

  if (tutorialDone) {
    return <TutorialDone onBack={onRestart} />;
  }

  if (state.phase === 'missionSummary') {
    return (
      <>
        {/* W samouczku dalej prowadzi ETER11, nie własny „Dalej" ekranu —
            inaczej dziecko wychodziło poza scenariusz na pustą „Misję 2". */}
        <SummaryScreen game={game} text={text} hideAdvance={tutorial} />
        <TutorialLayer tutorial={tour} />
      </>
    );
  }
  if (state.phase === 'mission') {
    return (
      <>
        <MissionScreen
          game={game}
          text={text}
          characters={content.characters ?? ALL_CHARACTERS}
          onContext={setTourContext}
          allows={tour.active ? tour.allows : undefined}
          alwaysRevealed={tutorial}
          // Samouczek ma własne „Pomiń", więc drugie wyjście tylko myliłoby.
          onQuit={tutorial ? undefined : () => void quit()}
        />
        <TutorialLayer tutorial={tour} />
        {/* Zgłaszanie z gry tylko w normalnej rozgrywce — w samouczku dziecko
            się uczy, a nie zgłasza. */}
        {!tutorial && <ReportButton />}
        {dialog}
      </>
    );
  }

  const first = state.missionNumber === 0;

  return (
    <>
    <main className="relative mx-auto max-w-2xl px-4 py-16 text-center">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />
      <div className="relative">
        <span className="eter-label">
          {first ? 'Start' : `Misja ${state.missionNumber + 1}`}
        </span>
        <h1 ref={titleRef} className="font-display text-3xl font-bold text-accent outline-none">
          {first ? text.missionFirstHeading : text.missionNextHeading}
        </h1>
        <p className="mt-3 font-mono text-sm text-ink-dim">
          Rozwiązane: {state.solvedProblems.length} · W talii: {state.problemPile.length}
          {state.unsolvedProblems.length > 0 &&
            ` · Odłożone: ${state.unsolvedProblems.length}`}
        </p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'START_MISSION' })}
          disabled={state.problemPile.length === 0}
          className="mt-8 rounded-lg bg-accent px-8 py-4 font-display text-lg font-bold text-bg disabled:opacity-40"
        >
          {text.missionRevealButton}
        </button>
        {state.problemPile.length === 0 && (
          <>
            <p className="mt-3 text-sm text-ink-dim">
              Talia problemów jest pusta. Odłożone problemy wracają po dwóch
              misjach — tutaj nie ma już czego odkryć.
            </p>
            {/* Bez tego ekran jest ślepym zaułkiem: przycisk wyłączony,
                a gracz nie ma jak wrócić do menu. */}
            <button
              type="button"
              onClick={onRestart}
              className="mt-4 rounded-lg border border-edge px-5 py-2.5 text-sm transition hover:border-accent hover:text-accent"
            >
              Wróć do menu
            </button>
          </>
        )}
      </div>
    </main>
    {/* Gdyby samouczek jakąkolwiek drogą dobił tu, jego dymek musi zostać —
        bez niego ekran bywa ślepym zaułkiem (pusta talia, „Dalej" wyłączony). */}
    <TutorialLayer tutorial={tour} />
    </>
  );
}

/** Klucz w localStorage: wstęp pokazujemy raz, nie przy każdym wejściu. */
const INTRO_SEEN_KEY = 'eter11:intro-seen';

export function GameApp({ content = {}, notice }: GameAppProps) {
  const [session, setSession] = useState<{
    players: PlayerSetup[];
    seed: number;
    tutorial: boolean;
  } | null>(null);

  /**
   * Ziarno rozpoczętej partii — albo `null`, gdy nie ma czego wznawiać.
   *
   * Świadomie NIE wznawiamy automatycznie. Automat zabierał drogę do
   * samouczka i do nowej gry: ekran ustawień w ogóle się nie pokazywał,
   * a jedynym wyjściem było porzucenie partii. Menu pyta, zamiast decydować.
   *
   * Sprawdzane po każdym powrocie do menu, nie raz na starcie: po zakończeniu
   * partii zapis znika, a nieodświeżona wartość zostawiała przycisk „Wróć do
   * gry", który prowadziłby do gry bez graczy.
   *
   * W efekcie, a nie w trakcie renderu, bo zapis kasuje sprzątanie ekranu
   * gry — przy odczycie w renderze menu zdążyłoby zobaczyć jeszcze stary stan.
   */
  const [resumable, setResumable] = useState<number | null>(() => savedSeed());
  /** Tryb gry przez internet — osobny od gry przy stole. */
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (session === null) setResumable(savedSeed());
  }, [session]);

  /**
   * Wstęp widzi tylko ten, kto go jeszcze nie oglądał.
   *
   * Czytane raz przy starcie: gracz wracający do gry chce grać, a nie
   * przeklikiwać historię, którą już zna. Z menu można go otworzyć
   * ponownie.
   */
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return localStorage.getItem(INTRO_SEEN_KEY) === null;
    } catch {
      // Tryb prywatny bez localStorage — wstęp po prostu się pokaże.
      return true;
    }
  });

  const closeIntro = () => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // Brak zapisu nic nie psuje: wstęp pojawi się następnym razem.
    }
    setShowIntro(false);
  };

  return (
    <>
      {notice && (
        <p className="bg-raised px-4 py-1.5 text-center font-mono text-xs text-ink-dim">
          {notice}
        </p>
      )}
      {showIntro ? (
        <IntroScreen onDone={closeIntro} onSkip={closeIntro} intro={content.intro} />
      ) : session ? (
        <RunningGame
          key={session.seed}
          players={session.players}
          seed={session.seed}
          content={content}
          tutorial={session.tutorial}
          // Powrót do menu kończy partię — inaczej „Nowa gra" wznawiałaby
          // tę samą rozgrywkę, którą gracz właśnie zostawił. Zapis kasuje
          // `useGame` przy odmontowaniu, żeby ostatni render nie zdążył go
          // przywrócić.
          onRestart={() => setSession(null)}
        />
      ) : online ? (
        <Suspense
          fallback={
            <main className="flex min-h-screen items-center justify-center p-8">
              <p className="font-display text-sm text-ink-dim">Wczytuję grę online…</p>
            </main>
          }
        >
        <Multiplayer
          content={{
            cards: content.cards,
            problems: content.problems,
            rules: content.rules,
            text: content.text,
            characters: content.characters,
          } as never}
          onExit={() => setOnline(false)}
        />
        </Suspense>
      ) : (
        <SetupScreen
          text={content.text ?? DEFAULT_UI_TEXT}
          characters={content.characters ?? ALL_CHARACTERS}
          onPlayOnline={() => setOnline(true)}
          // Ziarno z zegara — każda rozgrywka tasuje talię inaczej.
          onStart={(players, tutorial) =>
            setSession({ players, seed: Date.now(), tutorial })
          }
          onShowIntro={() => setShowIntro(true)}
          // Rozpoczęta partia czeka w menu zamiast wznawiać się sama —
          // gracz może do niej wrócić albo zacząć coś innego.
          onResume={
            resumable === null
              ? undefined
              : () => setSession({ players: [], seed: resumable, tutorial: false })
          }
        />
      )}
    </>
  );
}
