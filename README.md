# ETER11 — Save the World

Webowa wersja karcianej gry edukacyjnej dla dzieci 8–12 lat i rodziców.
Gracze rozwiązują problemy współczesnego świata, dokładając do nich karty
kompetencji, talentów i mentorów.

**Gra:** https://savetheworld-eter11.web.app

> Repozytorium jest publiczne, więc README nie podaje adresu panelu
> redakcyjnego, kont ani linków do konsoli projektu — te namiary zespół
> trzyma prywatnie. Panel jest pod ścieżką `/admin` tego samego hostingu,
> ale dostęp i tak chronią reguły bazy: bez konta zakładanego w konsoli
> żaden zapis nie przejdzie.

---

## Co gra potrafi

- **Przy stole** — jedno urządzenie wędruje między graczami, ręka zakryta
  dla wszystkich poza tym, czyja tura.
- **Online** — pokój z czteroznakowym kodem, każdy gra na swoim telefonie.
  Wspólny stan przez Realtime Database, przekazywanie kart między graczami,
  reakcje, powrót do partii po rozłączeniu.
- **Samouczek** — prowadzi przez pierwszą misję krok po kroku.
- **Wydruk** — karty i instrukcja na papier, prosto z panelu.
- **Dwa motywy** (jasny/ciemny) i dwa style (klasyczny/kolorowy).
- **Offline** — gdy baza jest niedostępna, ładują się dane wbudowane.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Gra: http://localhost:5173 (panel pod `/admin` tego samego adresu)

## Testy

```bash
npm test          # jednorazowo (~1200 testów)
npm run test:watch
npm test src/engine   # tylko wybrany katalog — dużo szybciej
```

## Wdrożenie

Push na `master` uruchamia GitHub Actions
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):
sprawdzenie typów → testy → build → `firebase deploy` (hosting) →
oznaczenie zgłoszenia. **Ręczny deploy nie jest potrzebny.**

Aby Actions oznaczył zgłoszenie jako naprawione, commit musi mieć trailer:

```
Report-Fixed: <fragment tytułu zgłoszenia> | <komentarz dla zespołu>
```

Reguły bazy **nie** wchodzą w ten workflow — wdrażasz je osobno:

```bash
# Firestore (zawartość gry, zgłoszenia, dyskusje, role, powiadomienia)
npx firebase-tools deploy --only firestore:rules --project savetheworld-eter11
# Realtime Database (pokoje gry online)
npx firebase-tools deploy --only database --project savetheworld-eter11
```

**Zawsze podawaj `--project savetheworld-eter11`.** Na tym koncie jest więcej
projektów Firebase, a bez jawnego wskazania CLI potrafi wdrożyć do cudzego.

### Pułapka reguł Realtime Database

Reguły RTDB są **permisywne kaskadowo**: reguła `.write` na węźle otwiera CAŁE
poddrzewo, a reguła na dziecku NIE może tego zawęzić — jeśli którakolwiek reguła
na ścieżce daje `true`, zapis przechodzi. Dlatego w `database.rules.json` reguła
na `rooms/$code` pozwala pisać tylko przy TWORZENIU pokoju (`!data.exists()`), a
każde pole ma własną, węższą regułę (`phase` = tylko host, `state` = każdy gracz
w pokoju itd.). Po każdej zmianie warto sprawdzić REST-em, że nie-host NIE
zmieni `phase` ani `hostUid`.

RTDB dodatkowo **usuwa puste tablice, puste obiekty i pola `null`** — stan gry
wraca z bazy okrojony, więc przed użyciem przechodzi przez `hydrateState`
([`src/multiplayer/hydrate.ts`](src/multiplayer/hydrate.ts)). Bez tego pierwsze
`.some`/`.filter` na wyciętym polu wywraca grę.

Trzecia pułapka: `runTransaction` przy zimnym cache dostaje `null` zamiast
istniejących danych i „widzi" pokój jako nieistniejący. Dlatego dołączanie do
pokoju czyta stan przez `get()` i zapisuje własny węzeł gracza wprost, bez
transakcji na całym pokoju.

---

## Panel redakcyjny

Wszystkie zmiany zapisywane do Firestore, z historią i cofaniem.

**Treść gry:** Problemy · Karty · Grafiki kart · Kody kart · Postacie ·
Zasady · Teksty · Wstęp i ETER11

**Wygląd:** Rodziny · Kategorie · Ikony · Kolory

**Narzędzia:** Tryb testowy · Drukuj karty · Drukuj instrukcję · Presety

**Zespół:** Aktywność · Zgłoszenia · Dyskusja · Pamięć · Ogłoszenia ·
Strefa Nudy

**Dane:** Statystyki · Historia · Konto · Osoby

Zapis jest blokowany, dopóki zawartość ma błędy — panel wypisuje je nad
treścią. Chroni to graczy przed wersją gry, w której czegoś brakuje.

### Obieg zgłoszeń

Zgłaszający pisze → (admin akceptuje, jeśli trzeba) → programista naprawia
i stawia **naprawione** → zgłaszający sprawdza i stawia **potwierdzone**
albo **odsyła do poprawki**.

Statusu `done` nie stawia programista — to zdanie zgłaszającego, że u niego
działa. Osobno od statusu idzie **postęp prac** („W kolejce" / „Robi się" /
„Sprawdzam" / „Zrobione"), który mówi tylko, czy ktoś już przy tym siedzi.

---

## Struktura

```
src/engine/      silnik gry — czysty TypeScript, bez React i bez sieci
src/data/        karty, teksty i motyw wbudowane (zapas, gdy baza niedostępna)
src/ui/          interfejs gry
src/ui/icons/    zestaw ~70 ikon SVG rysowanych inline
src/multiplayer/ pokoje, synchronizacja stanu, oferty kart
src/admin/       panel redakcyjny
src/firebase/    klient bazy, walidacja, odczyt i zapis zawartości
scripts/         narzędzia CLI: zgłoszenia, postęp prac, dyskusje
```

Silnik jest niezależny od React i Firebase — cała logika zasad testowana bez
przeglądarki. Gra online przesyła stan policzony tym samym silnikiem, więc
zasady istnieją w jednym miejscu.

## Praca nad projektem

Nad kodem pracuje agent (Claude) w pętli: czyta zgłoszenia, naprawia,
weryfikuje, wypycha. Zasady tej pracy opisuje [`CLAUDE.md`](CLAUDE.md),
a szczegóły pracy bez nadzoru — [`docs/PETLA.md`](docs/PETLA.md).
Bieżąca lista zadań od zespołu: [`docs/LISTA.md`](docs/LISTA.md).

Dokumentacja projektowa: [`docs/`](docs/)
