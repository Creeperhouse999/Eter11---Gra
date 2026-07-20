# ETER11 — Save the World: wersja web

Data: 2026-07-20
Status: do akceptacji

## 1. Cel

Przeniesienie karcianej gry edukacyjnej ETER11 — Save the World do przeglądarki.
Grupa docelowa: dzieci 8–12 lat i rodzice. Gra kooperacyjna: gracze wspólnie
rozwiązują problemy świata (ekologia, hejt, AI, dezinformacja), jednocześnie
rozwijając własną postać.

Trzy poziomy zwycięstwa z instrukcji zostają zachowane:
1. Zwycięstwo drużynowe — 5–7 rozwiązanych problemów.
2. Sukces indywidualny — liczba zebranych kart doświadczenia.
3. Spełnienie — komplet kart rozwoju na karcie postaci.

## 2. Zakres

**Faza 1 (ten spec, do implementacji teraz)**
- Silnik gry (czysty TypeScript).
- UI rozgrywki hot-seat: jedno urządzenie, gracze podają je sobie.
- Panel administracyjny do edycji kart i zasad, zapis do Firestore.
- Deploy na Firebase Hosting.

**Faza 2 (osobny spec, nie teraz)**
- Multiplayer online: kod pokoju, każdy gracz na własnym urządzeniu.
- Firebase Anonymous Auth dla graczy.
- Synchronizacja stanu przez Firestore.

Rozdzielenie faz jest celowe: zasady gry mają luki (patrz §8), tańiej je poprawiać
zanim powstanie warstwa sieciowa.

## 3. Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- Vitest (testy silnika)
- Firebase: Firestore (dane kart), Auth (admin), Hosting

Projekt Firebase: `savetheworld-eter11` (config dostarczony, publiczny z założenia —
klucz Firebase identyfikuje projekt, nie autoryzuje dostępu; bezpieczeństwo
zapewniają reguły Firestore).

## 4. Architektura

```
src/
  engine/              # czysty TS, ZERO importów React
    types.ts           # Card, Problem, Player, GameState, Action
    deck.ts            # budowa talii, tasowanie (seeded RNG)
    rules.ts           # walidacja ruchu, warunki zwycięstwa
    reducer.ts         # (state, action) => state
    scoring.ts         # punktacja końcowa, tytuły
  data/
    problems.ts        # 13 kart problemów
    cards.ts           # kompetencje, talenty, mentorzy, ETER11, Czarny Łabędź
    characters.ts      # karty postaci
    rules-config.ts    # parametry liczbowe (rundy, ręka, misje)
  ui/                  # React, wyłącznie rendering
    screens/           # Setup, Mission, Summary, Finale
    components/        # Card, ProblemBoard, PlayerMat, Hand
  admin/               # panel administracyjny
  firebase/
    client.ts          # init SDK
    content.ts         # odczyt/zapis kart i zasad
```

**Kluczowa decyzja: silnik jako czysty reducer `(state, action) => newState`,
bez zależności od React i bez dostępu do sieci.**

Uzasadnienie: w fazie 2 Firebase przesyła wyłącznie obiekty `Action` między
klientami i zapisuje `GameState`. Logika gry nie wymaga wtedy żadnej zmiany.
RNG jest deterministyczny (ziarno przechowywane w stanie), więc wszyscy klienci
tasują talię identycznie.

Testowalność: silnik testowany bez przeglądarki i bez Firebase — wejściem jest
stan i akcja, wyjściem nowy stan.

## 5. Model wymagań problemu

Instrukcja zawiera dwa sprzeczne modele: "4 ścianki" (użyty w kartach 1–8, 10)
oraz "1 postać + 2 kompetencje" (z przykładu wstępnego). Wybrany model — hybryda
oparta na 4 ściankach:

Każdy problem ma 4 sloty:
- 🧠 psychologiczny
- 💻 cyfrowy
- 🤝 społeczny
- ⭐ mentor / talent

Slot przyjmuje dowolną kartę odpowiadającej kategorii. Karta wymieniona wprost
w opisie problemu (np. „Detektyw Danych" w problemie 13) daje **bonus**:
dodatkową kartę doświadczenia dla gracza, który ją zagrał.

Uzasadnienie: zgodne z tym, co zespół już rozpisał w kartach 1–8 i 10; czytelne
dla dziecka (4 puste pola do zapełnienia); nie blokuje rozgrywki, gdy konkretnej
karty nie ma w talii, a mimo to nagradza dopasowanie tematyczne.

## 6. Zasady zaimplementowane

- Talia problemów: 13 kart.
- Wspólna talia: kompetencje (psychologiczne, cyfrowe, poznawczo-społeczne),
  talenty, mentorzy, ETER11, Czarny Łabędź.
- Każdy gracz: 1 karta postaci na całą grę + 5 kart na ręce.
- Runda: każdy gracz dokłada maksymalnie 1 kartę (talent **lub** kompetencja
  **lub** mentor). Zamiast dokładania może wymienić karty z ręki na nowe z talii.
- Gracz może użyć maksymalnie 1 karty ze swojej karty postaci na misję.
- Limit 7 rund na misję (parametr konfigurowalny).
- Po nierozwiązanej rundzie każdy gracz dobiera 1 kartę.

**Rozwiązanie problemu:**
1. Każdy gracz, który dołożył ≥1 kartę, zabiera 1 użytą kartę na swoją postać.
2. Gracz, który zagrał kompetencję, może przekazać ją innemu graczowi —
   przekazujący dostaje dodatkową kartę doświadczenia.
3. Każdy gracz dostaje kartę doświadczenia.
4. Gracze dobierają do 5 kart na ręce.

**Porażka z problemem (7 rund bez rozwiązania):**
- Problem trafia na stos nierozwiązanych.
- Każdy gracz, który wyłożył kartę, mimo to zabiera 1 użytą kartę na postać.
- Ekran podsumowania: dyskusja, jakich kompetencji zabrakło.
- Po dwóch kolejnych misjach problem można podjąć ponownie.

**Karty specjalne:**
- ETER11 — zastępuje dowolną kartę potrzebną do rozwiązania problemu.
- Czarny Łabędź, 3 warianty:
  1. **Dodatkowy problem** — obok bieżącego problemu wykładany jest drugi,
     z osobnymi 4 slotami. Obie karty muszą zostać rozwiązane w pozostałych
     rundach misji, aby misja liczyła się jako sukces. Rozwiązanie tylko jednej
     = misja przegrana, ale gracze zabierają karty na postać (zasada porażki
     obowiązuje normalnie).
  2. **Podwojenie wymagań** — każdy slot bieżącego problemu wymaga 2 kart
     zamiast 1. Dotyczy tylko slotów jeszcze niezapełnionych; karty już
     wyłożone zostają zaliczone.
  3. **Wymiana rąk** — gracze przekazują całe ręce zgodnie z ruchem wskazówek
     zegara. Karty leżące na kartach postaci nie są wymieniane.

**Zwycięstwo indywidualne (spełnienie)** — komplet na karcie postaci:
- 1 kompetencja psychologiczna,
- 1 kompetencja cyfrowa,
- 1 kompetencja poznawczo-społeczna,
- 1 talent,
- 1 mentor,
- ≥1 kompetencja otrzymana od innego gracza,
- ≥1 kompetencja przekazana innemu graczowi,
- ≥1 karta doświadczenia za rozwiązanie problemu **oraz** ≥1 karta doświadczenia
  za przekazanie kompetencji.

Ostatni warunek dotyczy **dwóch różnych typów** karty doświadczenia, nie ich
łącznej liczby. Sama liczba nie różnicowałaby graczy: kartę za rozwiązanie
problemu dostają wszyscy przy każdej udanej misji, więc po 7 misjach każdy miałby
ich kilka. Karta za przekazanie kompetencji wymaga świadomego podzielenia się —
i to ona jest właściwym testem współpracy.

Karty doświadczenia mają zatem pole `kind: 'solve' | 'share'`.

**Koniec gry:** po ustalonej liczbie misji (domyślnie 7).
- Drużynowo: 5–7 rozwiązanych problemów = wygrana wspólna.
- Indywidualnie: 1 pkt za kartę doświadczenia, 2 pkt za kartę spełnienia.
- Tytuły: Mistrz Doświadczenia, Mistrz Rozwoju, Mistrz Współpracy,
  Architekt Przyszłości.
- Finał kreatywny: każdy gracz wymyśla nazwę zawodu przyszłości, łącząc talent,
  kompetencję i problem, który go zaciekawił. Ekran z polem tekstowym
  i przykładami (RoboOgrodnik, Projektant Emocji AI, Strażnik Danych).

## 7. Panel administracyjny

Dostęp: `/admin`, ukryty przed graczami (brak linku w UI gry).

**Uwierzytelnianie:** Firebase Auth, email + hasło. Jedno konto administracyjne
zakładane ręcznie w Firebase Console przez właściciela projektu. Dane logowania
przekazywane zespołowi prywatnie — **nigdy w kodzie ani w repozytorium**.

Odrzucono wariant z hasłem `ETER11ADMIN` zapisanym w kodzie: kod frontendu trafia
do przeglądarki w całości, więc hasło byłoby jawne dla każdego, a reguły Firestore
musiałyby dopuszczać zapis od dowolnego klienta — w praktyce publiczny endpoint
do nadpisania wszystkich kart. Firebase Auth kosztuje ~30 dodatkowych linii kodu
i nie zmienia wygody pracy zespołu (okno logowania zamiast okna z hasłem).

**Konfiguracja jednorazowa (do wykonania przed wdrożeniem panelu):**
1. Firebase Console → Authentication → włącz metodę Email/Password.
2. Dodaj użytkownika `info@eter11.pl` z wybranym hasłem.
3. Skopiuj wygenerowany UID z listy użytkowników.
4. Wklej UID do reguł Firestore poniżej i wdróż reguły.

Hasło przekazywane zespołowi kanałem prywatnym. Zmiana hasła później: jedno
kliknięcie w konsoli, bez ponownego wdrożenia aplikacji.

**Znane ryzyko (zaakceptowane):** hasło konta administracyjnego jest krótkie
i przewidywalne (nazwa marki + „admin"). Uwierzytelnianie Firebase działa
z dowolnej przeglądarki, więc fizyczna kontrola nad komputerem nie stanowi tu
zabezpieczenia — wystarczy trafić hasło na ekranie logowania panelu.

Ryzyko przyjęte świadomie, ponieważ: ścieżka `/admin` nie jest nigdzie
linkowana, zawartość ogranicza się do kart gry (brak danych osobowych
i płatności), a eksport JSON pozwala odtworzyć stan po ewentualnym nadpisaniu.

Warunek ponownej oceny: przed wdrożeniem fazy 2. Pokoje graczy wprowadzają dane
sesji i uczestników, przy których ta kalkulacja przestaje obowiązywać.

**Reguły Firestore:**
```
match /content/{doc} {
  allow read: if true;
  allow write: if request.auth != null
               && request.auth.uid == 'UID_Z_KROKU_3';
}
match /{document=**} {
  allow read, write: if false;
}
```

Druga reguła zamyka wszystkie pozostałe ścieżki. Bez niej kolekcje dodane
w przyszłości (np. pokoje gier w fazie 2) mogłyby domyślnie pozostać otwarte.

**Funkcje panelu:**

*Edycja kart problemów* — nazwa, historia, przeciwnik, konsekwencja porażki, typ
(kolor), 4 ścianki z wymaganiami, karty bonusowe, emoji/grafika.

*Edycja pozostałych kart* — kompetencje (3 kategorie), talenty, mentorzy, postacie,
Czarne Łabędzie. Dodawanie, edycja, usuwanie.

*Edycja parametrów zasad* — liczba rund na misję (domyślnie 7), kart na ręce
(5), misji w rozgrywce (7), próg zwycięstwa drużynowego (5), limit kart z postaci
na misję (1), punktacja końcowa.

*Tryb testowy* — rozgrywka z podglądem dla balansowania:
- podgląd całej talii i kolejności kart,
- wymuszenie konkretnej karty do dobrania,
- cofnięcie rundy (undo — możliwe dzięki historii akcji w reducerze),
- ręczne wywołanie Czarnego Łabędzia lub ETER11,
- podgląd stanu gry jako JSON.

*Eksport / import JSON* — zrzut całej zawartości do pliku i wczytanie z pliku.
Kopia zapasowa oraz ścieżka wersjonowania zawartości w repozytorium.

**Model danych Firestore:**
```
content/problems    -> { version, updatedAt, items: Problem[] }
content/cards       -> { version, updatedAt, items: Card[] }
content/characters  -> { version, updatedAt, items: Character[] }
content/rules       -> { version, updatedAt, config: RulesConfig }
```

Gra czyta zawartość przy starcie. Fallback: jeśli Firestore niedostępny, ładowane
są dane wbudowane z `src/data/` — gra działa offline.

## 8. Dane kart — stan wyjściowy

13 problemów z instrukcji. Problemy 9, 11, 12 i 13 mają niekompletne wymagania
mechaniczne (brakujące ścianki). Zostaną uzupełnione w duchu istniejących kart
i oznaczone flagą `draft: true`, widoczną w panelu administracyjnym jako etykieta
„do weryfikacji" — zespół merytoryczny wie wtedy, co jest propozycją techniczną,
a co ich oryginalną treścią.

Karty kompetencji, talentów i mentorów: na podstawie list z instrukcji, uzupełnione
o postacie nazwane w opisach problemów (Detektyw Danych, Strażnik Prawdy, Mistrz
Współpracy, Wielki Wynalazca i pozostałe).

## 9. Wygląd

Ciemny motyw sci-fi, spójny z nazwą ETER11 i tematyką AI/przyszłości.

Branding zespołu (Instagram @eter11z2111) nie był możliwy do pobrania — Instagram
renderuje treść JavaScriptem i blokuje odczyt automatyczny. Kolory zdefiniowane
jako zmienne CSS w jednym pliku (`src/styles/theme.css`), więc podmiana na
oficjalną paletę po jej otrzymaniu nie wymaga zmian w komponentach.

Kolory typów problemów zachowane z instrukcji: 🟥 działanie, 🟦 myślenie,
🟨 współpraca, 🟩 zmiana w sobie.

Grafiki kart: emoji na gradiencie jako placeholder. Każda karta ma pole `art`,
więc podmiana na docelowe ilustracje nie wymaga zmian w komponencie karty.

Czytelność ma pierwszeństwo przed efektami: duża typografia, wyraźny kontrast,
przyciski w rozmiarze wygodnym pod dotyk — odbiorcą jest ośmiolatek.

## 10. Obsługa błędów

- Firestore niedostępny → dane wbudowane, komunikat „tryb offline".
- Niepoprawny zapis w panelu → walidacja przed zapisem, czytelny komunikat.
- Nieprawidłowy ruch gracza → reducer zwraca stan bez zmian + powód odrzucenia.
- Uszkodzony import JSON → walidacja schematu, odrzucenie z listą błędów.

## 11. Testy

Silnik (Vitest, bez przeglądarki):
- rozwiązanie problemu przy komplecie slotów,
- brak rozwiązania przy niepełnych slotach,
- limit 1 karty na gracza na rundę,
- limit 1 karty z postaci na misję,
- porażka po 7 rundach i zabranie karty mimo porażki,
- ETER11 zastępuje dowolny slot,
- każdy z 3 wariantów Czarnego Łabędzia,
- warunek spełnienia (komplet kart),
- punktacja końcowa,
- determinizm: identyczne ziarno RNG daje identyczną talię.

UI: testy manualne w fazie 1.

## 12. Poza zakresem (YAGNI)

- Konta graczy i profile trwałe.
- Ranking globalny.
- Tryb single-player z botami.
- Animacje kart ponad proste przejścia.
- Wersja mobilna natywna (PWA wystarczy).
- Tłumaczenia (tylko polski).
