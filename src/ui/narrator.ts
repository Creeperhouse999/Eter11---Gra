import type { GameState } from '../engine/types';
import { isSlotFilled } from '../engine/rules';
import { slotLabel } from './components/categoryStyles';

/**
 * Głos ETER11 — narrator, który mówi, co się dzieje i co teraz zrobić.
 *
 * Adam poprosił o okienko, w którym „ETER komentuje na bieżąco, co się dzieje
 * w grze, zarówno narracyjnie niczym narrator filmu (…) plus aby był komentarz,
 * co teraz kto musi zrobić".
 *
 * Sedno: to NIE jest model językowy. Alan przy tym zgłoszeniu napisał tylko
 * „Koszty… i jeszcze raz koszty…", a płatne wywołanie przy każdym ruchu
 * w grze dla dzieci to koszt bez końca. Wszystko, co narrator mówi, wynika
 * ze stanu gry, który silnik i tak zna: czyja tura, ile ścianek zostało, która
 * runda, co się właśnie stało. Zdania są napisane raz, a składane z tego stanu —
 * jak w grze planszowej, gdzie instrukcja mówi „teraz gracz po lewej".
 */

export interface Komentarz {
  /** Zdanie narracyjne — o świecie, nastroju, stawce. */
  narracja: string;
  /** Zdanie praktyczne — co teraz zrobić i kto. */
  wskazowka: string;
}

/** Ile ścianek problemu wciąż czeka na kartę. */
function brakujeScianek(state: GameState): number {
  const mission = state.mission;
  if (!mission) return 0;
  return mission.problems.reduce(
    (suma, problem) =>
      suma +
      problem.slots.filter((slot) => !isSlotFilled(mission, problem.id, slot.key)).length,
    0,
  );
}

/** Pierwsza niezapełniona ścianka — od niej zaczyna się podpowiedź. */
function pierwszaWolna(state: GameState): string | null {
  const mission = state.mission;
  if (!mission) return null;
  for (const problem of mission.problems) {
    for (const slot of problem.slots) {
      if (!isSlotFilled(mission, problem.id, slot.key)) return slotLabel(slot.key);
    }
  }
  return null;
}

/**
 * Komentarz do bieżącej chwili gry.
 *
 * `widzId` to gracz, który patrzy — dzięki temu narrator mówi „Twój ruch",
 * a nie „ruch gracza Adam", gdy to właśnie on ma turę. Pomijany przy grze
 * przy jednym stole, gdzie urządzenie wędruje między graczami.
 */
export function komentarz(state: GameState, widzId?: string): Komentarz {
  const aktywny = state.players[state.activePlayerIndex];
  const mojaTura = Boolean(widzId && aktywny?.id === widzId);
  const kto = mojaTura ? 'Ty' : (aktywny?.name ?? 'następny gracz');

  if (state.phase === 'finale') {
    const wygrana = state.solvedProblems.length > state.unsolvedProblems.length;
    const razem = state.solvedProblems.length + state.unsolvedProblems.length;
    return wygrana
      ? {
          narracja: 'Rok 2111 wygląda inaczej, niż miał wyglądać. Ktoś sto lat wcześniej nie odpuścił.',
          wskazowka: `Rozwiązaliście ${state.solvedProblems.length} z ${razem} problemów.`,
        }
      : {
          narracja: 'Ekrany świecą dalej, ale nikt na nie nie patrzy. Kilka spraw zostało bez odpowiedzi.',
          wskazowka: `Bez odpowiedzi zostało: ${state.unsolvedProblems.length}. Następnym razem pójdzie lepiej.`,
        };
  }

  if (state.phase === 'setup') {
    return {
      narracja:
        state.missionNumber === 0
          ? 'Sygnał z 2111 jest słaby, ale wyraźny. Ktoś prosi o pomoc — sto lat wcześniej.'
          : 'Świat na chwilę odetchnął. Ale kolejna sprawa już czeka.',
      wskazowka: 'Odkryjcie problem, żeby zobaczyć, czego potrzebuje.',
    };
  }

  if (state.phase === 'missionSummary') {
    const ostatni = state.solvedProblems[state.solvedProblems.length - 1];
    return {
      narracja: ostatni
        ? `„${ostatni.name}" — udało się. W 2111 właśnie zapaliło się jedno światło.`
        : 'Ten problem został bez odpowiedzi. Świat nie zawsze daje drugą szansę od razu.',
      wskazowka: 'Każdy może teraz zabrać jedną kartę na swoją postać albo oddać ją koledze.',
    };
  }

  const mission = state.mission;
  if (!mission) {
    return {
      narracja: 'Cisza przed kolejnym zgłoszeniem.',
      wskazowka: 'Poczekajcie chwilę.',
    };
  }

  const zostalo = brakujeScianek(state);
  const wolna = pierwszaWolna(state);
  const ostatniaRunda = mission.round >= state.config.roundsPerMission;

  // Zdanie narracyjne zależy od tego, jak blisko rozwiązania jesteście —
  // narrator ma budować napięcie, a nie recytować statystyki.
  const narracja =
    zostalo === 0
      ? 'Wszystko na swoim miejscu. Problem właśnie przestaje być problemem.'
      : zostalo === 1
        ? 'Brakuje jednej rzeczy. Dosłownie jednej.'
        : ostatniaRunda
          ? 'To ostatnia runda. Potem sprawa zostaje taka, jaka jest.'
          : mission.round === 1
            ? 'Problem leży na stole i patrzy na was.'
            : 'Coś już się układa, ale to jeszcze nie koniec.';

  const wskazowka =
    zostalo === 0
      ? 'Nie trzeba już nic dokładać.'
      : wolna
        ? `${kto} ${mojaTura ? 'masz' : 'ma'} ruch — brakuje: ${wolna}.`
        : `${kto} ${mojaTura ? 'masz' : 'ma'} ruch.`;

  return { narracja, wskazowka };
}

/**
 * Odpowiedzi na pytania o zasady.
 *
 * Adam chciał, żeby „gracz mógł zadać pytanie do ETER o zasady gry". Zamiast
 * modelu językowego: lista pytań, które dzieci naprawdę zadają przy stole,
 * i odpowiedzi napisane raz. Dopasowanie po słowach kluczowych, żeby działało
 * także wtedy, gdy ktoś pyta własnymi słowami, a nie klika gotowe.
 */
export interface OdpowiedzNaPytanie {
  pytanie: string;
  odpowiedz: string;
  /** Słowa, po których poznajemy pytanie zadane własnymi słowami. */
  slowa: string[];
}

export const ZASADY: OdpowiedzNaPytanie[] = [
  {
    pytanie: 'Jak zagrać kartę?',
    odpowiedz:
      'Przeciągnij kartę z ręki na pasującą ściankę problemu albo kliknij ją dwa razy. Karta pasuje, gdy ma ten sam kolor co ścianka.',
    slowa: ['zagrać', 'zagrac', 'położyć', 'polozyc', 'dołożyć', 'dolozyc', 'jak grać'],
  },
  {
    pytanie: 'Dlaczego moja karta nie pasuje?',
    odpowiedz:
      'Ścianka przyjmuje tylko karty w swoim kolorze. Jeśli kolor się zgadza, a karta i tak nie wchodzi, ścianka jest już zapełniona.',
    slowa: ['nie pasuje', 'nie wchodzi', 'nie mogę', 'nie moge', 'kolor'],
  },
  {
    pytanie: 'Co robi karta ETER11?',
    odpowiedz:
      'ETER11 pasuje do każdej ścianki — to koło ratunkowe, gdy nikomu nie zostało nic w odpowiednim kolorze.',
    slowa: ['eter', 'joker'],
  },
  {
    pytanie: 'Co to Czarny Łabędź?',
    odpowiedz:
      'Niespodziewane utrudnienie — zmienia zasady w trakcie misji, tak jak w prawdziwym życiu coś potrafi wywrócić plany.',
    slowa: ['łabędź', 'labedz', 'czarny'],
  },
  {
    pytanie: 'Po co zabierać kartę na swoją postać?',
    odpowiedz:
      'Karta na postaci to Twoje doświadczenie — możesz jej użyć w kolejnych misjach, raz na misję.',
    slowa: ['postać', 'postac', 'mata', 'doświadczenie', 'doswiadczenie', 'zabrać'],
  },
  {
    pytanie: 'Kiedy kończy się misja?',
    odpowiedz:
      'Gdy zapełnicie wszystkie ścianki problemu albo skończą się rundy. Bez kompletu problem zostaje nierozwiązany.',
    slowa: ['koniec', 'kończy', 'konczy', 'runda', 'rundy'],
  },
  {
    pytanie: 'Jak wygrać?',
    odpowiedz:
      'Rozwiążcie więcej problemów, niż zostawicie bez odpowiedzi. Gracie razem — albo wygrywacie wszyscy, albo nikt.',
    slowa: ['wygrać', 'wygrac', 'wygrana', 'punkty', 'cel'],
  },
  {
    pytanie: 'Czy mogę oddać kartę koledze?',
    odpowiedz:
      'Tak, na podsumowaniu misji. Zamiast brać kartę dla siebie, możesz dać ją komuś innemu — to się liczy jako uczenie.',
    slowa: ['oddać', 'oddac', 'przekazać', 'przekazac', 'koledze', 'dać', 'dac'],
  },
];

/**
 * Znajduje odpowiedź na pytanie zadane własnymi słowami.
 *
 * Bez dopasowania zwraca `null` — wtedy okno pokazuje listę pytań, zamiast
 * udawać, że zrozumiało. Lepiej powiedzieć „wybierz z listy" niż odpowiedzieć
 * na inne pytanie, niż zadano.
 */
export function odpowiedzNa(pytanie: string): OdpowiedzNaPytanie | null {
  const tekst = pytanie.toLowerCase().trim();
  if (!tekst) return null;

  return (
    ZASADY.find((z) => z.pytanie.toLowerCase() === tekst) ??
    ZASADY.find((z) => z.slowa.some((slowo) => tekst.includes(slowo))) ??
    null
  );
}
