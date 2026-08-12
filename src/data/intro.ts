/**
 * Wstęp do gry: historia, zasady i osobna wersja dla dorosłych.
 *
 * Trzy różne teksty do trzech różnych celów, bo trafiają do trzech
 * różnych odbiorców w trzech różnych momentach:
 *
 * - `STORY` czyta dziecko, zanim cokolwiek kliknie. Ma wciągnąć, nie
 *   pouczać — dlatego jest napisany scenami, jak zwiastun filmu.
 * - `RULES` czyta ten sam gracz minutę później, gdy chce już grać.
 *   Krótkie punkty, każdy o jednej rzeczy, żadnej fabuły.
 * - `FOR_ADULTS` czyta rodzic albo nauczyciel, często zanim kupi grę.
 *   Mówi wprost, co gra ćwiczy i skąd się to bierze.
 *
 * Teksty są danymi, nie JSX-em: zespół merytoryczny zmienia je z panelu
 * administracyjnego bez wdrożenia.
 */

export interface IntroScene {
  /** Nagłówek sceny — jedno zdanie, które zostaje w głowie. */
  heading: string;
  /** Treść sceny. Akapity rozdzielone pustą linią. */
  body: string;
  /** Ikona sceny, nazwa z Icon.tsx. */
  icon: string;
}

/**
 * Wstęp narracyjny dla graczy 8–13 lat.
 *
 * Pisany drugą osobą i w czasie teraźniejszym — dziecko ma być w środku
 * historii, nie słuchać opowieści o kimś innym. Zdania krótkie, bez
 * przymiotników na siłę. Żadnego morału na końcu: gra ma go pokazać,
 * a nie zapowiedzieć.
 */
/**
 * Wstęp w trzech częściach, tak jak widzi go gracz.
 *
 * Trzymamy je razem, bo w panelu redakcyjnym edytuje się je jako jedną
 * całość, a do gry trafiają jednym zapisem.
 */
export interface IntroContent {
  /** Wstęp narracyjny — wprowadza w historię. */
  story: IntroScene[];
  /** Wstęp techniczny — uczy zasad. */
  rules: IntroScene[];
  /** Część dla dorosłych — po co ta gra powstała. */
  adults: IntroScene[];
}

export const INTRO_STORY: IntroScene[] = [
  {
    icon: 'earth',
    heading: 'Rok 2111. Świat jest cichy.',
    body:
      'Miasta stoją, ale nikt w nich nie mieszka. Ekrany świecą, choć nikt na nie nie patrzy. Coś poszło nie tak — i nie stało się to nagle.\n\nStało się powoli, przez sto lat. Problem po problemie, których nikt nie rozwiązał.',
  },
  {
    icon: 'spark',
    heading: 'Ktoś jednak został.',
    body:
      'Nazywa się ETER11. Wie o tym świecie wszystko: co go zepsuło, kiedy i dlaczego.\n\nWie też coś jeszcze. Że jest dokładnie jeden moment, w którym da się to odkręcić. Nie w 2111. Sto lat wcześniej. Dzisiaj.',
  },
  {
    icon: 'clash',
    heading: 'Dlatego przybywa do Was.',
    body:
      'ETER11 nie przynosi broni ani maszyn. Przynosi listę problemów — tych samych, które zniszczyły jego świat. Klimat. Samotność. Kłamstwa w sieci. Strach przed byciem sobą.\n\nKażdy z nich wygląda na za duży. I każdy z nich da się rozwiązać.',
  },
  {
    icon: 'handshake',
    heading: 'Ale nie w pojedynkę.',
    body:
      'Żaden problem w tej grze nie ma jednego rozwiązania. Każdy ma pięć ścianek, a jedna osoba nie zamknie ich wszystkich.\n\nPotrzeba kogoś, kto rozumie ludzi. Kogoś, kto ogarnia technologię. Kogoś odważnego. I kogoś dorosłego, kto już to przeżył — rodzica, nauczyciela, trenera.',
  },
  {
    icon: 'star',
    heading: 'Twoja karta postaci jest pusta.',
    body:
      'Na początku nie masz nic. Po każdej rozwiązanej misji zabierasz na nią jedną kartę — coś, czego się właśnie nauczyłeś.\n\nPo kilku misjach zobaczysz na niej coś ciekawego: obraz tego, w czym naprawdę jesteś dobry. Tego nie da się wybrać na starcie. To trzeba odkryć, grając.',
  },
  {
    icon: 'globe',
    heading: 'ETER11 czeka.',
    body:
      'Ma sto lat opóźnienia i jedną szansę.\n\nZaczynamy?',
  },
];

/**
 * Wstęp techniczny — zasady w kolejności, w jakiej stają się potrzebne.
 *
 * Świadomie nie opisuje wszystkiego: pominięte są Czarne Łabędzie i
 * zawody przyszłości, bo gracz spotka je dopiero w trakcie i wtedy gra
 * wyjaśni je sama. Wstęp, który tłumaczy wszystko, nie tłumaczy nic.
 */
export const INTRO_RULES: IntroScene[] = [
  {
    icon: 'clash',
    heading: 'Problem to Wasz przeciwnik',
    body:
      'Na środku stołu leży karta problemu. Wokół niej jest pięć ścianek — pięć rzeczy, których trzeba, żeby go rozwiązać.\n\nGracie przeciwko problemowi, nie przeciwko sobie. Wygrywacie razem albo wcale.',
  },
  {
    icon: 'palette',
    heading: 'Kolor do koloru',
    body:
      'Każda ścianka ma kategorię i kolor. Karta zamknie ściankę tylko wtedy, gdy zgadzają się oba.\n\nCzerwona karta społeczna nie zamknie niebieskiej ścianki społecznej. To najważniejsza zasada w całej grze.',
  },
  {
    icon: 'hand',
    heading: 'Jeden ruch na turę',
    body:
      'W swojej turze robisz jedną rzecz: kładziesz kartę na ściankę albo wymieniasz karty, których nie chcesz.\n\nWymiana też jest ruchem. Zamieniasz tyle kart, ile zaznaczysz, i dostajesz tyle samo nowych.',
  },
  {
    icon: 'medal',
    heading: 'Po misji zabierasz kartę',
    body:
      'Rozwiązany problem to nie koniec. Każdy, kto wyłożył kartę, zabiera jedną na swoją kartę postaci — zostaje z Wami do końca gry.\n\nMożesz też oddać ją innemu graczowi. Dostajesz wtedy punkt doświadczenia, bo uczenie innych też się liczy.',
  },
  {
    icon: 'sprout',
    heading: 'Przegrana to też ruch do przodu',
    body:
      'Jeśli nie zdążycie w wyznaczonych rundach, problem trafia na stos nierozwiązanych. Wrócicie do niego później — z lepszymi kartami.\n\nPorozmawiajcie wtedy, czego zabrakło. To pytanie jest częścią gry.',
  },
];

/**
 * Wstęp dla dorosłych.
 *
 * Inny odbiorca, więc inny rejestr: bez zwrotów do gracza, bez fabuły,
 * bez wykrzykników. Rodzic chce wiedzieć, co dziecko z tego wyniesie i
 * czy to nie jest kolejna gra, która „rozwija" w folderze reklamowym.
 * Dlatego mówi konkretnie, które mechaniki co ćwiczą.
 */
export const INTRO_FOR_ADULTS: IntroScene[] = [
  {
    icon: 'bulb',
    heading: 'Po co ta gra powstała',
    body:
      'Dzieci uczą się dziś rzeczy, które za dziesięć lat mogą być nieaktualne. Nie zdezaktualizują się natomiast kompetencje: umiejętność współpracy, krytycznego myślenia, radzenia sobie z porażką i proszenia o pomoc.\n\nETER11 ćwiczy je wprost — nie przy okazji, tylko jako mechanikę gry.',
  },
  {
    icon: 'handshake',
    heading: 'Współpraca zamiast rywalizacji',
    body:
      'Nie ma tu zwycięzcy przy stole. Problem ma pięć ścianek w różnych kategoriach i jedna osoba fizycznie nie ma kart, żeby zamknąć wszystkie.\n\nDziecko nie musi być uczone dzielenia się — gra ustawia sytuację tak, że dzielenie się jest jedyną drogą do wygranej.',
  },
  {
    icon: 'brain',
    heading: 'Trzy obszary kompetencji',
    body:
      'Karty dzielą się na psychologiczne (odporność, cierpliwość, odwaga), cyfrowe (analiza danych, bezpieczeństwo w sieci, krytyczne myślenie) i społeczne (słuchanie, współpraca, rozwiązywanie konfliktów).\n\nDo tego talenty i mentorzy — bo część problemów da się rozwiązać tylko wtedy, gdy ktoś dorosły podzieli się doświadczeniem.',
  },
  {
    icon: 'star',
    heading: 'Karta postaci jako lustro',
    body:
      'Gracz zaczyna z pustą kartą postaci i zapełnia ją tym, czego użył. Po kilku misjach powstaje obraz jego mocnych stron — zbudowany z realnych wyborów, nie z testu osobowości.\n\nTo najlepszy moment na rozmowę: „zauważyłem, że najczęściej sięgasz po karty społeczne — lubisz to?".',
  },
  {
    icon: 'sprout',
    heading: 'Porażka bez kary',
    body:
      'Nierozwiązany problem nie kończy gry ani nikogo nie eliminuje. Wraca po dwóch misjach, gdy drużyna ma lepsze karty.\n\nKażdy, kto wyłożył kartę, i tak zabiera jedną na swoją postać — także po przegranej. Komunikat jest jasny: próbowanie się liczy, a porażka jest etapem, nie wyrokiem.',
  },
  {
    icon: 'peace',
    heading: 'Dla kogo i na jak długo',
    body:
      'Wiek 8–13 lat, od dwóch do czterech osób, jedna misja to około piętnastu minut. Gra jest zaprojektowana dla mieszanych drużyn: dziecko z rodzicem, klasa z nauczycielem.\n\nRola dorosłego nie jest tu dekoracją — karty mentorów działają wyłącznie wtedy, gdy ktoś naprawdę usiądzie do stołu.',
  },
];

/** Komplet wstępu zaszyty w kodzie — punkt wyjścia dla panelu. */
export const DEFAULT_INTRO: IntroContent = {
  story: INTRO_STORY,
  rules: INTRO_RULES,
  adults: INTRO_FOR_ADULTS,
};
