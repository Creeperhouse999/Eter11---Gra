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
    'Wieści dotarły do roku 2111 tej samej nocy. ETER11 patrzy na to, co zrobiliście, i pierwszy raz od bardzo dawna coś w nim się rozjaśnia. Nie wygraliście w pojedynkę: ktoś słuchał, ktoś sprawdzał fakty, ktoś nie dawał się zniechęcić, gdy szło źle — a wszystkie te kawałki złożyły się w rozwiązanie, którego żadne z Was nie znalazłoby samo. Miasto znów ma prąd, plotka, która krążyła po sieci, w końcu ucichła, a ludzie zaczynają sobie znowu ufać. To, czego się dziś nauczyliście — cierpliwości, sprawdzania źródeł, pytania „a co, jeśli się mylę?" — zostaje z Wami długo po tym, jak odłożycie karty. ETER11 nie znika: wraca, gdy będziecie gotowi na kolejny problem, bo w 2111 roku wciąż jest ich sporo do rozwiązania. Na razie jednak zasłużyliście na chwilę, żeby się cieszyć z tego, co się właśnie udało.',
  finaleEpilogueLost:
    'ETER11 nie znika, kiedy coś się nie uda — zostaje, bo wie, że najwięcej uczą właśnie porażki, którym się dobrze przyjrzy. Problem, którego nie rozwiązaliście, nie zniknął ze świata roku 2111 — czeka dalej, tak jak czekał, zanim się o nim dowiedzieliście. Ale coś się zmieniło: teraz wiecie więcej o tym, czego mu trzeba, i o tym, gdzie Waszej drużynie zabrakło jednego, konkretnego kawałka układanki. Może to była kompetencja, której nikt nie miał akurat pod ręką. Może zabrakło chwili, żeby się zatrzymać i zapytać kogoś o zdanie, zanim czas rundy się skończył. Dobra wiadomość jest taka, że w tej grze porażka nigdy nie jest ostateczna — każdy, kto dziś grał, i tak wraca z czymś nowym na swojej karcie postaci. ETER11 wróci z tym samym problemem później, w kolejnej misji, a Wy będziecie mądrzejsi o dzisiejszą rundę. Możecie przegrać bitwę, ale nie wojnę — najlepsze drużyny to te, które próbują drugi raz.',
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
