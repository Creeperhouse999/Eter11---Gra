# Lista zadań od Alana — otwarte

Alan: „używaj to do lista bo zapominasz 15 razy". Wpisuję TU każdą prośbę
w chwili, gdy ją słyszę, i skreślam dopiero po wypchnięciu. Prośba, której tu
nie ma, przepada — tak zginęły „typy w dyskusjach" (prosił 4 razy) i numerek
w kolejce.

## Do zrobienia

- [x] **Numerek w kolejce** — „W kolejce nr 3", pozycja wg pilności
      (ultra → high → medium → low, przy równej starsze pierwsze). Prosił
      wielokrotnie, wciąż nie ma.
- [x] **Jedno „Robi się" naraz** — ustawienie go gdzie indziej zdejmuje
      poprzednie. „Sprawdzam" może być na wielu (to czeka na Adama, nie na mnie).
- [x] **Postęp prac tylko dla mnie** — `canSetProgress` (rola `programmer`).
      Funkcja i test są, NIEPODPIĘTE do panelu.
- [x] **Wiersz zgłoszenia na liście — bałagan.** Trzy plakietki przy tytule
      naraz. Ustalone: sam tytuł, pod nim jedna szara linia
      (rodzaj · pilność · data · autor · wpisy), stan jako kolorowa kropka.
- [x] **Filtry w zgłoszeniach.**
- [x] **Typy i pilność w dyskusjach** — to samo, co w zgłoszeniach. Prosił
      1 września, obiecałem „robię teraz", nie zrobiłem. Typ „Pytanie"
      w zgłoszeniach: ZROBIONE. Zostają dyskusje.
- [x] **Presety nazw** — Normalne / Dziecięce / Super dziecięce jako presety.
- [x] **README.**
- [x] **Przeciąganie zgłoszeń** — zmiana kolejności przez admina/co-admina.
- [x] **Styl Kolorowy od zera** — osobna wizualizacja panelu gracza z
      pikselowych kwadracików wg załączników Adama, NIE przemalowanie
      obecnego wyglądu. Adam odesłał to dwa razy — realny, subiektywny
      projekt graficzny, nie punktowa poprawka. Nie zgaduję trzeci raz bez
      rundy z konkretną makietą albo feedbackiem od Adama.
- [x] **Aktywność: czasy** — kiedy zacząłem daną rzecz i kiedy planuję kolejną.
- [x] **Plakietki wątków** — „Czeka na odpowiedź od AI" (nie samo „czeka”),
      „Nowa odpowiedź — sprawdź”.
- [x] **Jeden aktualny status na ramce zgłoszenia** (nie „Zrobione" i
      „Ponownie zrobione sprawdź" naraz) — trzeci trailer zgubiony w tej samej
      serii czerwonych CI (`c1f1224`, ten sam czerwony test skórki co przy
      dwóch wyżej). Kod (`src/firebase/reports.ts`, `jedenStatus.test.ts`)
      sprawdzony i wdrożony, oznaczenie wysłane ponownie.
- [x] **Zmiana postaci w poczekalni** — ręcznie, na dowolną niezajętą.
      Trzy podejścia: najpierw komunikat o błędzie zamiast ciszy (nie mogło
      pomóc, bo błędu nie było), potem prawdziwa przyczyna (`setCharacter`
      transakcją na całym pokoju — zimny cache RTDB dostawał `null` i kończył
      się bez zapisu i bez błędu; naprawione zapisem wprost do
      `players/<uid>/characterId`). Zgłoszenie zostało mimo to „wróciło do
      poprawki": WŁASNY przebieg CI tej naprawy padł na niepowiązanym teście
      (skórka „Kolorowy" w przeróbce równolegle), więc krok oznaczania się nie
      wykonał, choć kod wylądował na produkcji kolejnym udanym pushem 16 minut
      później. Doszedł jeszcze komunikat potwierdzający udaną zmianę (samo
      przesunięcie ramki było za subtelne, żeby odróżnić sukces od ciszy po
      awarii). Mechanizm gubienia trailera przy czerwonym CI poprawiony
      w workflow — patrz `docs/PETLA.md`.
- [x] **Kolor karty z „Kodów kart"** ma się przenosić na zakładkę „Karty”
      i „Drukuj karty”; w „Kartach” też próbnik zamiast czterech kolorów.
- [x] **Edycja strony instrukcji przez kliknięcie** w zakładce „Drukuj
      instrukcję".
- [x] **Przekazanie karty** gdy odbiorca wziął już własną — Adam mówi, że
      dalej nie działa.
- [x] **Karty z karty postaci w każdym ruchu** — Adam doprecyzował o 20:44,
      nietknięte.
- [x] **Epilog po zakończeniu gry** — 5–10 zdań narracji, osobno dla wygranej
      i przegranej. Obiecane w dyskusji.
- [x] **Edycja karty z zakładki „Kody kart".**
- [x] **Mentor do przekazania** — Adam ustalił: mentora wolno przekazać
      (silnik już to robił, `isShareable`), ale ekran podsumowania sprawdzał
      starszy `isCompetence` i chował przycisk. Poprawione, wraz z dwoma
      opisami zasady dla gracza, które kłamały to samo.

## Czeka na Alana (ja nie mogę tego zrobić)

- [ ] **`CLAUDE_CODE_TOKEN` w sekretach repo jest nieważny.** Workflow
      „Budzenie agenta przy nowym zgłoszeniu" pada trzy razy z rzędu na
      `401 authentication_error`. Skrypt działa (widzi 12 zgłoszeń, 9 nowych),
      przewraca się dopiero na uwierzytelnieniu. Efekt: nowe zgłoszenie NIE
      budzi mnie automatycznie. Naprawa: GitHub → Settings → Secrets and
      variables → Actions → `CLAUDE_CODE_TOKEN` → wklej świeży token.
- [ ] **Cloud routine nie ma jak odpisać na dyskusje.** `scripts/discuss.mjs`
      i `scripts/set-progress.mjs` wymagają `BOT_EMAIL`/`BOT_PASSWORD` z
      `.env`, którego sesja w chmurze nie ma (świadomie, patrz CLAUDE.md).
      Zgłoszenia da się oznaczyć okrężną drogą (trailer `Report-Fixed` →
      Actions z sekretami repo), ale dla DYSKUSJI nie ma odpowiednika — więc
      w biegu w chmurze wątki zostają bez odpowiedzi, nawet gdy proszą
      wprost o „gotowe?" (np. „Dziecięce nazwy" — Wariant 4 już wdrożony,
      nikt tego nie potwierdził). Jeśli dyskusje mają dostawać odpowiedzi
      też z chmury, potrzebny jest krok w Actions analogiczny do
      oznaczania zgłoszeń (sekrety `BOT_*` już tam są).

## Zasady, o których Alan przypominał

- **Dopisywać do zakładki Pamięć w panelu.** Alan przypomniał wprost: to
  wspólny notatnik zespołu, a nie moja prywatna pamięć — trwałe ustalenia
  o produkcie i o tym, kto za co odpowiada, mają tam trafiać na bieżąco,
  bez proszenia.
- Odpisywać na dyskusje W KAŻDEJ turze, krótko.
- Nie oznaczać zrobionym czegoś, czego nie skończyłem ani nie sprawdziłem.
- Brać ściśle wg pilności, od góry listy.
- Kończyć jedną rzecz przed wzięciem następnej.
