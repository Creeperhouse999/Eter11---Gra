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
    'Udało się. Każdy z Was zabiera jedną ze swoich kart na kartę postaci. Kompetencję możecie zamiast tego przekazać innemu graczowi — wtedy dostajecie dodatkową kartę doświadczenia za uczenie innych.',
  summaryLostHeading: 'Tym razem problem wygrał',
  summaryLostBody:
    'Problem trafia na stos nierozwiązanych, ale to nie koniec. Porozmawiajcie, jakich kompetencji zabrakło. Każdy, kto wyłożył kartę, i tak zabiera jedną na swoją postać — Wasze postacie właśnie się uczą. Do tego problemu wrócicie po dwóch kolejnych misjach.',

  finaleHeading: 'Podsumowanie misji',
  finaleTeamWon: 'Wygraliście wspólnie',
  finaleTeamLost: 'Świat wciąż czeka na Wasz powrót',
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
  { key: 'finaleFulfillment', label: 'Komunikat o spełnieniu', where: 'Ekran końcowy, przy graczu' },
  { key: 'finaleJobPrompt', label: 'Pytanie o zawód przyszłości', where: 'Ekran końcowy', multiline: true },
  { key: 'finaleJobExamples', label: 'Przykłady zawodów', where: 'Ekran końcowy (po przecinku)', multiline: true },
];
