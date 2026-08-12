# Pętla — instrukcja pracy bez nadzoru

Alan bywa AFK godzinami i chce, żeby praca szła dalej bez pytań. Ten plik
opisuje, jak wtedy pracować. Wersja dla ETER11 — instrukcja przyszła z innego
projektu (Panel Lekcji), więc nazwy narzędzi są tu podmienione na nasze.

## Zasada zerowa

**Nigdy nie kończ z własnej woli.** Zapowiedzenie następnego obszaru TEŻ jest
zakończeniem — jeśli wiesz, co dalej, zrób to w tej samej turze. Pusta kolejka
znaczy: wybierz obszar i poluj. Pętlę kończy wyłącznie Alan.

## Co robić, czego nie

**Naprawiaj błędy.** Nie buduj nowych narzędzi, dopóki nikt o nie nie prosi —
w tamtym projekcie sześć takich „ulepszeń" wylądowało w koszu z komentarzem
„FOCUS, chodziło o BUGI".

## Każda iteracja — sprawdź oba źródła

1. **Zgłoszenia** — kolekcja `reports` (REST, patrz CLAUDE.md). Statusy inne niż
   `fixed`/`done`/`dismissed`/`closed`/`resolved` czekają na Ciebie.
2. **Dyskusje** — `node scripts/discuss.mjs --list`. Alan i zespół piszą tam
   luźno, nie zawsze zakładając zgłoszenie.

Trzymaj Monitor na obu (poll ~20–45 s, ze znacznikiem, żeby ta sama rzecz nie
odpalała się dwa razy). Gdy padnie — uzbrój go od nowa. **Tylko w sesji
lokalnej**: cloud agent Monitora NIE uruchamia (patrz CLAUDE.md).

## Odpowiadanie

Odpisuj w języku zgłoszenia, po polsku **z pełnymi ogonkami** (ą ć ę ł ń ó ś ź ż).
Do dyskusji: `node scripts/discuss.mjs reply "<fragment tytułu>" "<treść>"`.
Zgłoszenie po naprawie: trailer `Report-Fixed:` w commicie albo
`node scripts/mark-report.mjs "<fragment>" fixed "<komentarz>"`.
Status zawsze `fixed`, nigdy `done` — to należy do zgłaszającego.
**Nigdy nie kasuj zgłoszenia.**

## Pisz na bieżąco

Nie milcz do końca pracy. Zostawiaj ślad w dyskusjach: co robisz, co znalazłeś,
co wdrożyłeś. Alan czyta to po powrocie i chce widzieć bieg pracy, nie sam wynik.

## Polowanie na błędy

Odtwórz → znajdź przyczynę → napraw u źródła → test regresji **z break-testem**
(zepsuj zabezpieczenie, zobacz, że test pada, przywróć). Fałszywe alarmy odrzucaj
głośno, z uzasadnieniem.

Gdy obszar przestaje przynosić znaleziska, **zmień oś, nie tylko moduł**:
równoległość, sprzątanie po sobie, brak sieci, uszkodzone i stare dane, dwa konta
naraz, uprawnienia, nieświeże dokumenty.

## Wysyłka

Po każdej partii: `npx tsc --noEmit`, `npx vitest run`, commit z opisem
**przyczyny**, push na master. Wdrożenie robi GitHub Actions — nie wołaj
`firebase deploy` ręcznie. Wyjątek: reguły Firestore/Storage/RTDB nie są
w workflow, te wdrażasz sam i **sprawdzasz na żywo**, że działają.

Nie zostawiaj commitów lokalnie.

## Pułapki (już kosztowały godziny)

- `firebase deploy --only firestore:rules` pisze „Deploy complete!" także wtedy,
  gdy nic nie wysłał — szukaj w wyjściu `released rules`, inaczej reguły NIE są
  na żywo.
- Zapytanie `where('pole','==',null)` **pomija dokumenty bez tego pola**. Kosztowało
  jeden cichy przebieg usuwania kont, który „zakończył się sukcesem", nie robiąc nic.
- Test, który powtarza logikę zamiast jej używać, sprawdza własną kopię.
- Jeśli break-test dalej przechodzi, zepsuty jest TEST, nie zabezpieczenie.
- Druga reguła `allow` w Firestore **rozluźnia** dostęp, nigdy go nie zacieśnia.
- Zielone testy nie dowodzą, że coś wygląda dobrze — przy zmianach wizualnych
  **popatrz na render**, nie na liczby.
- Ale zrzut z `chrome --headless --window-size=390,844` **kłamie na telefonie**:
  renderuje w stałej szerokości, więc wszystko wygląda na ucięte, choć na
  prawdziwym telefonie jest dobrze. Zamiast patrzeć na taki obrazek —
  `node scripts/check-overflow.mjs http://localhost:PORT` (ustawia prawdziwy
  tryb urządzenia i MIERZY, czy strona wychodzi poza ekran).
- Cloud agent nie ma sekretów: nie wdraża i nie oznacza zgłoszeń sam (robi to
  Actions), nie odpala Monitora ani nie planuje kolejnych biegów.
- **Po podagencie zawsze `git diff` na kodzie produkcyjnym.** Podagent proszony
  wyłącznie o testy potrafi zostawić w źródłach własny break-test
  (`// MUTACJA TESTOWA` zamiast sprawdzenia) albo „naprawić" kod pod test —
  raz wyciął sortowanie przypiętych ogłoszeń, czyli funkcję zamówioną przez
  Alana. Zielony wynik u podagenta nie znaczy, że nie zepsuł produkcji.
