# ETER11 — Save the World

Webowa wersja karcianej gry edukacyjnej dla dzieci 8–12 lat i rodziców.

**Gra:** https://savetheworld-eter11.web.app
**Panel redakcyjny:** https://savetheworld-eter11.web.app/admin

---

## Zanim panel zacznie działać

Panel jest wdrożony, ale zapis do bazy jest jeszcze zablokowany. Dwa kroki
do wykonania w przeglądarce — jednorazowo.

### 1. Konto administracyjne

1. [Firebase Console → Authentication](https://console.firebase.google.com/project/savetheworld-eter11/authentication/users)
2. Zakładka **Sign-in method** → włącz **Email/Password**
3. Zakładka **Users** → **Add user** → `info@eter11.pl` + hasło
4. Skopiuj **User UID** z listy (długi ciąg znaków)

Hasła nie wpisujemy do repozytorium ani do kodu — przekaż je zespołowi
prywatnie. Zmiana hasła później to jedno kliknięcie w konsoli, bez wdrożenia.

### 2. Reguły bazy

W pliku [`firestore.rules`](firestore.rules) zastąp `WSTAW_TUTAJ_UID_KONTA_ADMIN`
skopiowanym UID, a potem:

```bash
npx firebase-tools deploy --only firestore:rules --project savetheworld-eter11
```

Do czasu wykonania tych kroków panel się otworzy, ale zapis zwróci błąd —
i to jest zachowanie zamierzone: baza nie przyjmuje zapisu od nikogo,
dopóki nie wskażesz konkretnego konta.

---

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Gra: http://localhost:5173 · Panel: http://localhost:5173/admin

## Testy

```bash
npm test          # jednorazowo
npm run test:watch
```

## Wdrożenie

```bash
npm run deploy
```

Reguły bazy wdrażane osobno:

```bash
# Firestore (zawartość gry, zgłoszenia, dyskusje, role)
npx firebase-tools deploy --only firestore:rules --project savetheworld-eter11
# Realtime Database (pokoje gry wieloosobowej)
npx firebase-tools deploy --only database --project savetheworld-eter11
```

**Zawsze podawaj `--project savetheworld-eter11`.** Na tym koncie jest więcej
projektów Firebase, a bez jawnego wskazania CLI potrafi wdrożyć do niewłaściwego.

### Pułapka reguł Realtime Database

Reguły RTDB są **permisywne kaskadowo**: reguła `.write` na węźle otwiera CAŁE
poddrzewo, a reguła na dziecku NIE może tego zawęzić — jeśli którakolwiek reguła
na ścieżce daje `true`, zapis przechodzi. Dlatego w `database.rules.json` reguła
na `rooms/$code` pozwala pisać tylko przy TWORZENIU pokoju (`!data.exists()`), a
każde pole ma własną, węższą regułę (`phase` = tylko host, `state` = każdy gracz
w pokoju itd.). Gdyby węzeł pokoju dawał szeroki `.write` członkom, dowolny gracz
nadpisałby `phase`, `hostUid` czy cudzy wpis — reguła-dziecko by tego nie
powstrzymała. Po każdej zmianie tych reguł warto zweryfikować REST-em, że
nie-host NIE zmieni `phase`/`hostUid` (test host-vs-gość).

RTDB dodatkowo **usuwa puste tablice, puste obiekty i pola `null`** — stan gry z
bazy wraca okrojony, więc przed użyciem przechodzi przez `hydrateState`
(`src/multiplayer/hydrate.ts`), które dokłada je z powrotem. Bez tego pierwsze
`.some`/`.filter` na wyciętym polu wysypuje grę.

---

## Panel redakcyjny

Osiem sekcji, wszystkie zmiany zapisywane do Firestore:

| Sekcja | Co edytuje |
|---|---|
| **Przegląd** | Statystyki talii, ostrzeżenia o balansie, lista treści do weryfikacji |
| **Problemy** | Historia, przeciwnik, cel, typ, cztery ścianki z podpowiedziami i kartami bonusowymi |
| **Karty** | Kompetencje, talenty, mentorzy, ETER11, Czarne Łabędzie |
| **Postacie** | Nazwy, typy i cechy postaci do wyboru przez graczy |
| **Zasady** | Rundy na misję, karty na ręce, liczba misji, próg zwycięstwa, punktacja |
| **Teksty** | Wszystkie napisy w grze — nagłówki, przyciski, komunikaty |
| **Kolory** | Paleta z podglądem na żywo i sprawdzaniem kontrastu |
| **Tryb testowy** | Rozgrywka na edytowanych kartach, cofanie ruchów, ręczny Czarny Łabędź |

Zapis jest blokowany, dopóki zawartość ma błędy — panel wypisuje je nad treścią.
Chroni to graczy przed wersją gry, w której czegoś brakuje.

Karty i problemy oznaczone **„do weryfikacji"** zostały dopisane technicznie
i czekają na sprawdzenie przez zespół merytoryczny. Dotyczy to problemów
9, 11, 12 i 13 — instrukcja nie zawierała dla nich kompletnych wymagań.

---

## Struktura

```
src/engine/   silnik gry — czysty TypeScript, bez React i bez sieci
src/data/     karty, teksty i motyw wbudowane (zapas, gdy baza niedostępna)
src/ui/       interfejs gry
src/ui/icons/ zestaw ~70 ikon SVG rysowanych inline
src/admin/    panel redakcyjny
src/firebase/ klient bazy, walidacja, odczyt i zapis zawartości
```

Silnik jest niezależny od React i Firebase — cała logika zasad testowana bez
przeglądarki. Dzięki temu multiplayer w fazie 2 będzie tylko przesyłał akcje
między klientami, bez przepisywania zasad.

Gra działa offline: gdy baza jest niedostępna, ładują się dane wbudowane
i pojawia się komunikat o trybie offline.

## Stan projektu

**Faza 1 (gotowa):** rozgrywka na jednym urządzeniu, panel redakcyjny.
**Faza 2 (planowana):** multiplayer online z kodem pokoju, każdy gracz na
własnym telefonie.

Dokumentacja projektowa: [`docs/superpowers/`](docs/superpowers/)
