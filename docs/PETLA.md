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

**Najpierw `git pull --rebase origin master`** — zanim cokolwiek przeczytasz
w kodzie. W tym repo pracuje też cloud routine: potrafi dodać całą zakładkę
albo naprawić coś po Tobie, a bez pulla szukasz w drzewie, którego już nie ma
(raz orzekłem, że funkcji nie ma — była, od kilkunastu commitów). Po pullu
zerknij na `git log --oneline <stary-HEAD>..HEAD`, żeby wiedzieć, co doszło.

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

## Dyskusje to nie dziennik zmian

Wątek zakładasz, gdy potrzebujesz **decyzji** albo opinii zespołu — nie po to,
żeby zrelacjonować naprawy. Te zostają w commitach.

Zespół czyta dyskusje, żeby coś rozstrzygnąć. Zalew relacji sprawia, że
przewijają wszystko, w tym pytania, na które czekasz. Gdy poprawka zmienia coś,
co zobaczą na ekranie — wystarczy dwa zdania.

## Polowanie na błędy

Odtwórz → znajdź przyczynę → napraw u źródła → test regresji **z break-testem**
(zepsuj zabezpieczenie, zobacz, że test pada, przywróć). Fałszywe alarmy odrzucaj
głośno, z uzasadnieniem.

Gdy obszar przestaje przynosić znaleziska, **zmień oś, nie tylko moduł**:
równoległość, sprzątanie po sobie, brak sieci, uszkodzone i stare dane, dwa konta
naraz, uprawnienia, nieświeże dokumenty.

Jedna z osi, która się opłaciła: **czy tekst zgadza się z mechaniką**. Weź
zdania z `uiText.ts`, `intro.ts`, `tutorial.ts` i sprawdź w silniku, czy gra
naprawdę tak działa. W jednym przebiegu wyszły cztery rozjazdy — m.in. wstęp dla
rodziców obiecywał doświadczenie za przegraną misję i mechanikę zależną od tego,
kto siedzi przy stole. Żadnego z nich nie złapałby test jednostkowy: kod działał
poprawnie, kłamał opis.

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
- Zaostrzając **wzorzec** (regex w regule), sprawdź go na PRAWDZIWYCH danych
  z bazy, nie na wymyślonym przykładzie. Wzorzec linku przepuszczał
  `?open=abc` z mojego testu, a realne identyfikatory wątków to znaczniki czasu
  z dwukropkami — więc każde powiadomienie o odpowiedzi w dyskusji odbijało się
  o 403, cicho, bo panel wysyła je w tle.
- Po **zaostrzeniu reguły** przejdź po wszystkich miejscach w kodzie, które tej
  operacji używają — i sprawdź je kontem o NAJNIŻSZEJ roli, która ma tam
  sięgać. Zaostrzenie kasowania `contentHistory` do admina wywaliło ciche
  przycinanie historii u redaktorów (coworker), bo `recordVersion` woła
  `deleteDoc` przy każdym zapisie treści. Bot ma rolę `programmer`, którą
  `jestAdmin()` obejmuje — więc test botem NICZEGO tu nie udowadnia.
- Zielone testy nie dowodzą, że coś wygląda dobrze — przy zmianach wizualnych
  **popatrz na render**, nie na liczby.
- Ale zrzut z `chrome --headless --window-size=390,844` **kłamie na telefonie**:
  renderuje w stałej szerokości, więc wszystko wygląda na ucięte, choć na
  prawdziwym telefonie jest dobrze. Zamiast patrzeć na taki obrazek —
  `node scripts/check-overflow.mjs http://localhost:PORT` (ustawia prawdziwy
  tryb urządzenia i MIERZY, czy strona wychodzi poza ekran).
- Cloud agent nie ma sekretów: nie wdraża i nie oznacza zgłoszeń sam (robi to
  Actions), nie odpala Monitora ani nie planuje kolejnych biegów.
- `line-clamp` **nie działa obok `sm:block`** (ani `md:`/`lg:`). Obie klasy mają
  równą specyficzność, a responsywna wypada w zbudowanym CSS później i nadpisuje
  `display:-webkit-box`, którego `line-clamp` potrzebuje. Tekst ucina się wtedy
  w połowie wiersza, bez wielokropka — i nie widać tego w kodzie, tylko
  w arkuszu. Poprawnie: samo `sm:line-clamp-N`. Trafiło się dwa razy, pilnuje
  tego `src/ui/components/matCardClamp.test.tsx`.
- `Report-Fixed:` w commicie szuka **wyłącznie w zgłoszeniach**. Wskazanie
  wątku dyskusji nie zadziała — fragment tytułu nie pasuje do niczego i krok
  oznaczania kończy się błędem (od teraz tylko ostrzeżeniem). Odpowiedź
  w wątku pisz przez `scripts/discuss.mjs reply`.
- Fragment w `Report-Fixed:` musi pasować do **jednego** zgłoszenia. Zdarza się,
  że ten sam problem zgłoszono dwa razy (raz zamknięte, raz nowe) — wtedy krótki
  fragment trafia w oba, skrypt odmawia i zgłoszenie zostaje otwarte mimo
  „success" w Actions. Podawaj tyle tytułu, żeby był jednoznaczny, i po deployu
  sprawdź, czy status faktycznie się zmienił.
- **Zanim napiszesz nowy plik testowy — sprawdź, czy nie istnieje.** `Write`
  nadpisuje bez ostrzeżenia. Raz skasowałem tak cały test regresji do zgłoszenia
  Adama; wyszło dopiero z tego, że liczba plików w przebiegu się nie zmieniła.
  Po dodaniu testu porównaj `Test Files` przed i po.
- **Po podagencie zawsze `git diff` na kodzie produkcyjnym.** Podagent proszony
  wyłącznie o testy potrafi zostawić w źródłach własny break-test
  (`// MUTACJA TESTOWA` zamiast sprawdzenia) albo „naprawić" kod pod test —
  raz wyciął sortowanie przypiętych ogłoszeń, czyli funkcję zamówioną przez
  Alana. Zielony wynik u podagenta nie znaczy, że nie zepsuł produkcji.
- `migrate()` (content.ts) domyka mapy typu `families`/`categories` PŁYTKIM
  spreadem po kluczu kategorii — uzupełnia tylko kategorię, której W OGÓLE
  brakuje. Wartość obecną, ale złego kształtu (obiekt/tekst zamiast tablicy —
  dokładnie to, co zostawia ręczna edycja dokumentu w konsoli Firestore)
  przepuszcza bez zmian, a `validateContent` mogła w ogóle nie sprawdzać
  danej sekcji. Efekt: nie błąd panelu, tylko `TypeError` w prawdziwej
  rozgrywce (funkcje jak `familyLabel` robią `.find`/`.map` bez `?.` na
  wartości, o której typ obiecuje, że to tablica). Przy KAŻDYM nowym polu
  `GameContent` sprawdzaj kształt osobno w `validate.ts` (tak jak już mają
  `customIcons`/`cardImages` przez `Array.isArray`, `theme`/`themeLight`
  przez `checkTheme`) — sam fakt, że pole nie jest `undefined`, niczego nie
  gwarantuje.
