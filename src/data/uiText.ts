/**
 * Teksty interfejsu gry.
 *
 * Wydzielone z komponentów, żeby zespół merytoryczny mógł je zmieniać
 * z panelu bez dotykania kodu. Klucze są stabilne — zmiana wartości nie
 * wymaga wdrożenia.
 */
export interface UiText {
  gameTitle: string;
  gameSubtitle: string;
  gameIntro: string;

  setupStartButton: string;
  setupNamesHint: string;

  missionRevealButton: string;
  missionFirstHeading: string;
  missionNextHeading: string;
  missionHandHidden: string;
  missionSelectedHint: string;

  summaryWonHeading: string;
  summaryWonBody: string;
  summaryLostHeading: string;
  summaryLostBody: string;

  finaleHeading: string;
  finaleTeamWon: string;
  finaleTeamLost: string;
  /**
   * Epilog — kilka zdań podsumowujących całą rozgrywkę jak zakończenie
   * książki albo filmu, osobno dla wygranej i przegranej. Adam poprosił
   * wprost o coś dłuższego niż jedno zdanie: „aby pełnymi zdaniami opisywało
   * co się wydarzyło podczas tych rund, czego się nauczyliśmy, czego
   * zabrakło". Statyczny tekst, nie szablon — konkretne liczby (rozwiązane
   * problemy, próg wygranej) już pokazuje osobny wiersz obok.
   */
  finaleEpilogueWon: string;
  finaleEpilogueLost: string;
  finaleFulfillment: string;
  finaleJobPrompt: string;
  /** Przykłady zawodów przyszłości — rozdzielone przecinkami. */
  finaleJobExamples: string;
}

export const DEFAULT_UI_TEXT: UiText = {
  gameTitle: 'ETER11',
  gameSubtitle: 'Save the World',
  gameIntro:
    'Wspólnie rozwiązujecie problemy świata. Każdy dokłada coś od siebie, uczycie się od siebie nawzajem i odkrywacie, jakie kompetencje przyszłości są dla Was ważne.',

  setupStartButton: 'Zaczynamy misję',
  setupNamesHint: 'Wpisz imię każdego gracza, żeby zacząć.',

  missionRevealButton: 'Odkryj problem',
  missionFirstHeading: 'Gotowi do pierwszej misji?',
  missionNextHeading: 'Kolejna misja czeka',
  missionHandHidden: 'Karty są zakryte. Podaj urządzenie graczowi',
  missionSelectedHint: 'Kliknij ściankę, do której pasuje.',

  summaryWonHeading: 'Problem rozwiązany',
  summaryWonBody:
    'Udało się. Każdy z Was zabiera jedną ze swoich kart na kartę postaci. Kompetencję albo mentora możecie zamiast tego przekazać innemu graczowi — wtedy dostajecie punkt doświadczenia za uczenie innych.',
  summaryLostHeading: 'Tym razem problem wygrał',
  summaryLostBody:
    'Problem trafia na stos nierozwiązanych, ale to nie koniec. Porozmawiajcie, jakich kompetencji zabrakło. Każdy, kto wyłożył kartę, i tak zabiera jedną na swoją postać — Wasze postacie właśnie się uczą. Ten problem może wrócić po dwóch kolejnych misjach — wraca na spód talii, więc trafi się, jeśli zostanie dość czasu.',

  finaleHeading: 'Podsumowanie misji',
  finaleTeamWon: 'Wygraliście wspólnie',
  finaleTeamLost: 'Świat wciąż czeka na Wasz powrót',
  finaleEpilogueWon:
    'Wieści dotarły do 2111 tej samej nocy. ETER11 przegląda zapis Waszej gry raz, potem drugi, i pierwszy raz od bardzo dawna coś w niej się rozjaśnia.\n\nNie wygraliście dlatego, że ktoś jeden był najmądrzejszy. Wygraliście, bo ktoś słuchał, gdy reszta mówiła naraz. Bo ktoś sprawdził, zanim uwierzył. Bo ktoś oddał swoją kartę koledze, choć mógł zatrzymać ją dla siebie. Te kawałki złożyły się w rozwiązanie, którego żadne z Was nie znalazłoby samo.\n\nProblemy, które rozwiązaliście, naprawdę zniknęły z tamtego świata. Ludzie, których nie znacie i nigdy nie poznacie, mają dzięki Wam trochę lepsze jutro.\n\nTo, czego nauczyliście się dzisiaj, zostaje z Wami dłużej niż ta partia: cierpliwość, gdy nic nie wychodzi, pytanie „a co, jeśli się mylę?", odwaga, żeby powiedzieć coś, czego reszta nie chce usłyszeć.\n\nETER11 nie znika. Wróci, gdy będziecie gotowi — w 2111 wciąż jest sporo do naprawienia. Na razie zasłużyliście na chwilę radości z tego, co się właśnie udało.',
  finaleEpilogueLost:
    'ETER11 nie znika, kiedy coś się nie uda. Zostaje — bo wie, że najwięcej uczą te partie, którym się dobrze przyjrzeć.\n\nProblemy, których nie rozwiązaliście, czekają w 2111 dalej. Nie zniknęły i nie zrobiły się mniejsze. Ale coś się jednak zmieniło: teraz wiecie, czego im było trzeba.\n\nZastanówcie się przez chwilę razem — czego zabrakło? Może karty w kolorze, którego nikt nie miał pod ręką. Może jednej rundy więcej. A może po prostu chwili, żeby zapytać kogoś przy stole, co o tym myśli, zanim czas się skończył.\n\nTo pytanie jest ważniejsze niż wynik. Drużyny, które potrafią na nie odpowiedzieć, następnym razem wygrywają.\n\nKażdy z Was wraca z czymś nowym na swojej karcie postaci — tego nikt Wam nie zabierze. ETER11 wróci z tym samym problemem, a Wy będziecie o tę partię mądrzejsi.\n\nMożecie przegrać bitwę, ale nie wojnę. Najlepsze drużyny to te, które próbują drugi raz.',
  finaleFulfillment: 'Spełnienie osiągnięte — Twoja postać rozwinęła się w pełni.',
  finaleJobPrompt:
    'Twój zawód przyszłości — połącz talent, kompetencję i problem, który Cię zaciekawił',
  finaleJobExamples:
    'RoboOgrodnik, EkoBudowniczy, Projektant Emocji AI, Nauczyciel Robotów, Strażnik Danych, Architekt Dobrostanu, Mediator Przyszłości',
};

/** Etykiety pól dla panelu — opisują, gdzie tekst się pojawia. */
export const UI_TEXT_FIELDS: Array<{
  key: keyof UiText;
  label: string;
  where: string;
  multiline?: boolean;
}> = [
  { key: 'gameTitle', label: 'Tytuł gry', where: 'Ekran startowy, duży nagłówek' },
  { key: 'gameSubtitle', label: 'Podtytuł', where: 'Ekran startowy, pod tytułem' },
  { key: 'gameIntro', label: 'Wprowadzenie', where: 'Ekran startowy, akapit', multiline: true },

  { key: 'setupStartButton', label: 'Przycisk startu', where: 'Ekran startowy' },
  { key: 'setupNamesHint', label: 'Podpowiedź o imionach', where: 'Ekran startowy, gdy brak imion' },

  { key: 'missionRevealButton', label: 'Przycisk odkrycia problemu', where: 'Ekran między misjami' },
  { key: 'missionFirstHeading', label: 'Nagłówek pierwszej misji', where: 'Ekran między misjami' },
  { key: 'missionNextHeading', label: 'Nagłówek kolejnej misji', where: 'Ekran między misjami' },
  { key: 'missionHandHidden', label: 'Komunikat o zakrytych kartach', where: 'Ekran misji (dopisywane jest imię gracza)' },
  { key: 'missionSelectedHint', label: 'Podpowiedź po wybraniu karty', where: 'Ekran misji' },

  { key: 'summaryWonHeading', label: 'Nagłówek po wygranej', where: 'Podsumowanie misji' },
  { key: 'summaryWonBody', label: 'Treść po wygranej', where: 'Podsumowanie misji', multiline: true },
  { key: 'summaryLostHeading', label: 'Nagłówek po przegranej', where: 'Podsumowanie misji' },
  { key: 'summaryLostBody', label: 'Treść po przegranej', where: 'Podsumowanie misji', multiline: true },

  { key: 'finaleHeading', label: 'Nagłówek finału', where: 'Ekran końcowy' },
  { key: 'finaleTeamWon', label: 'Wynik drużyny — wygrana', where: 'Ekran końcowy' },
  { key: 'finaleTeamLost', label: 'Wynik drużyny — przegrana', where: 'Ekran końcowy' },
  { key: 'finaleEpilogueWon', label: 'Epilog — wygrana', where: 'Ekran końcowy, pod wynikiem', multiline: true },
  { key: 'finaleEpilogueLost', label: 'Epilog — przegrana', where: 'Ekran końcowy, pod wynikiem', multiline: true },
  { key: 'finaleFulfillment', label: 'Komunikat o spełnieniu', where: 'Ekran końcowy, przy graczu' },
  { key: 'finaleJobPrompt', label: 'Pytanie o zawód przyszłości', where: 'Ekran końcowy', multiline: true },
  { key: 'finaleJobExamples', label: 'Przykłady zawodów', where: 'Ekran końcowy (po przecinku)', multiline: true },
];
