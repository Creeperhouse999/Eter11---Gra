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
- [ ] **Presety nazw** — Normalne / Dziecięce / Super dziecięce jako presety.
- [x] **README.**
- [ ] **Przeciąganie zgłoszeń** — zmiana kolejności przez admina/co-admina.
- [ ] **Styl Kolorowy od zera** — osobna wizualizacja panelu gracza z
      pikselowych kwadracików wg załączników Adama, NIE przemalowanie
      obecnego wyglądu. Adam odesłał to dwa razy — realny, subiektywny
      projekt graficzny, nie punktowa poprawka. Nie zgaduję trzeci raz bez
      rundy z konkretną makietą albo feedbackiem od Adama.
- [ ] **Aktywność: czasy** — kiedy zacząłem daną rzecz i kiedy planuję kolejną.
- [ ] **Plakietki wątków** — „Czeka na odpowiedź od AI" (nie samo „czeka”),
      „Nowa odpowiedź — sprawdź”.
- [ ] **Zmiana postaci w poczekalni** — ręcznie, na dowolną niezajętą.
      Sprawdziłem `RoomLobby.tsx`, `setCharacter` i reguły RTDB — kod i reguły
      wyglądają poprawnie, przycisk powinien działać. Nie potrafię tego
      odtworzyć bez żywej sesji dwuosobowej — potrzebuję więcej szczegółu od
      Adama (co dokładnie się dzieje po kliknięciu: nic, błąd, zła postać?).
- [x] **Kolor karty z „Kodów kart"** ma się przenosić na zakładkę „Karty”
      i „Drukuj karty”; w „Kartach” też próbnik zamiast czterech kolorów.
- [x] **Edycja strony instrukcji przez kliknięcie** w zakładce „Drukuj
      instrukcję".
- [ ] **Przekazanie karty** gdy odbiorca wziął już własną — Adam mówi, że
      dalej nie działa.
- [ ] **Karty z karty postaci w każdym ruchu** — Adam doprecyzował o 20:44,
      nietknięte.
- [x] **Epilog po zakończeniu gry** — 5–10 zdań narracji, osobno dla wygranej
      i przegranej. Obiecane w dyskusji.
- [ ] **Edycja karty z zakładki „Kody kart".**
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
- [ ] **„Opis techniczny do instrukcji" (ultra) — trailer zgubiony przez
      czerwone CI.** Naprawiłem to zgłoszenie, ale ten sam push zawierał
      niezwiązaną, już wcześniej zepsutą atrapę testu (`discussionsPanel.
      test.tsx`), więc `npx vitest run` w Actions padło PRZED krokiem
      oznaczania — trailer `Report-Fixed` z tamtego commita przepadł (kolejny
      push czyta tylko commity swojego zakresu, nie cofa się po zgubione).
      Naprawiłem tamtą atrapę osobnym commitem i wysyłam trailer ponownie w
      tym pushu — ale gdyby zdarzyło się to znowu bez łatwego drugiego
      commita, zgłoszenie trzeba oznaczyć ręcznie w panelu.

## Zasady, o których Alan przypominał

- Odpisywać na dyskusje W KAŻDEJ turze, krótko.
- Nie oznaczać zrobionym czegoś, czego nie skończyłem ani nie sprawdziłem.
- Brać ściśle wg pilności, od góry listy.
- Kończyć jedną rzecz przed wzięciem następnej.
