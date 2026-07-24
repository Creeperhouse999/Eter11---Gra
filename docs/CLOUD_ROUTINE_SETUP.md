# Cloud routine — auto-obsługa zgłoszeń bez lokalnej sesji

Cel: agent w chmurze Claude (na Twoim planie Max x5, bez osobnego klucza API) co godzinę sprawdza kolekcję `reports`, naprawia nowe zgłoszenia i wdraża — działa gdy Twój komputer jest wyłączony.

**Stan teraz:** nie da się jeszcze uruchomić. Brakuje trzech rzeczy (poniżej). Zrób je po kolei, potem wróć do Claude i powiedz „ustaw cloud routine".

---

## Dlaczego jeszcze nie działa

Cloud agent startuje w czystym środowisku w chmurze — **nie ma** Twojego dysku, `.env`, ani zalogowanego Firebase. Musi dostać wszystko z zewnątrz:

1. **Kod** — klonuje z GitHub (repo jest teraz tylko lokalne, bez remote).
2. **Sekrety** — hasło konta bota (`claude@code.com`) do skryptu zgłoszeń oraz sposób wdrożenia na Firebase.
3. **Uprawnienia** — możliwość `firebase deploy` z chmury.

Minimalny interwał crona to **1 godzina** (nie 30 min — API tego nie przyjmie).

---

## Krok 1 — Wypchnij repo na GitHub

W domu, w katalogu projektu:

```bash
# 1. Załóż PRYWATNE repo na github.com (np. eter11-gra). NIE publiczne —
#    w historii są klucze API Firebase (publiczne z założenia, ale lepiej prywatnie).
# 2. Podłącz i wypchnij:
git remote add origin https://github.com/<twoj-login>/eter11-gra.git
git branch -M main
git push -u origin main
```

Sprawdź, że `.env` NIE trafił do repo (jest w `.gitignore`, ale zweryfikuj):

```bash
git ls-files .env    # nie może nic wypisać
```

---

## Krok 2 — Wdrożenie z chmury (Firebase)

Cloud agent nie zaloguje się `firebase login` interaktywnie. Potrzebuje **service account** albo tokenu CI:

**Wariant A (zalecany) — service account:**
1. Firebase Console → Ustawienia projektu → Konta usługi → „Wygeneruj nowy klucz prywatny" → pobierze się plik JSON.
2. Ten JSON trzeba udostępnić agentowi jako sekret (zmienna `GOOGLE_APPLICATION_CREDENTIALS` wskazująca na plik, albo zawartość w zmiennej). Agent użyje `firebase deploy --only hosting --project savetheworld-eter11` z tym kontem.

**Wariant B — token CI (prostszy, ale przestarzały):**
```bash
npx firebase login:ci     # w domu, jednorazowo — wypisze token
```
Token podajesz agentowi jako `FIREBASE_TOKEN`, a deploy woła `firebase deploy --token $FIREBASE_TOKEN --project savetheworld-eter11`.

> Service account nie wygasa i jest bezpieczniejszy — wybierz A, jeśli dasz radę.

---

## Krok 3 — Sekrety dla skryptu zgłoszeń

Skrypt `scripts/mark-report.mjs` loguje się kontem bota, żeby zapisać odpowiedź na zgłoszeniu. Potrzebuje w środowisku chmury:

```
BOT_EMAIL=claude@code.com
BOT_PASSWORD=<hasło konta bota>
```

(To te same wartości, co masz lokalnie w `.env`.)

Gdzie je wstawić: w konfiguracji środowiska cloud routine jako zmienne środowiskowe / sekrety. Gdy będziesz gotów, powiedz Claude, a on pokaże, gdzie w `job_config` trafiają — albo skonfiguruje środowisko przez panel routines.

---

## Krok 4 — Powiedz Claude „ustaw cloud routine"

Gdy Kroki 1–3 są gotowe, podaj Claude:
- URL repo na GitHub,
- sposób wdrożenia (service account / token),
- że sekrety bota są w środowisku.

Wtedy utworzy routine mniej więcej taki:

- **Harmonogram:** co godzinę (`0 * * * *` UTC).
- **Model:** claude-sonnet-5 (wystarczy do obsługi zgłoszeń; można podnieść).
- **Repo:** Twój GitHub.
- **Prompt (samowystarczalny, bo agent startuje bez kontekstu):**

  > Jesteś agentem utrzymania gry ETER11. Repo sklonowane. Przeczytaj CLAUDE.md i działaj wg pętli: sprawdź kolekcję `reports` w Firestore (projekt savetheworld-eter11) — REST GET jak w CLAUDE.md. Dla każdego nowego zgłoszenia (status `new`/`pending`/`reopened`): znajdź przyczynę, napraw (root cause, test najpierw), zweryfikuj (tsc, `npx vitest run`, build), wdróż (`firebase deploy` kontem z sekretu, zawsze `--project savetheworld-eter11`), zacommituj, oznacz zgłoszenie `fixed` skryptem `node scripts/mark-report.mjs` z REALNĄ datą (uruchom `date`), NIGDY nie kasuj rekordu zgłoszenia. Brak nowych zgłoszeń → zakończ turę (nie fabrykuj zmian). Nie pushuj na main bez przejścia testów.

---

## Ważne pułapki (z CLAUDE.md, żeby agent w chmurze ich nie powtórzył)

- **Data odpowiedzi:** zawsze `date`, nigdy zgadywana — stara data chowa odpowiedź w dzwonku powiadomień.
- **Nie kasować rekordu zgłoszenia** — odpowiedź w dzwonku jest z niego czytana na żywo.
- **Reguły RTDB/Firestore/Storage wdraża się osobno** (`--only database` / `--only firestore:rules` / `--only storage`), nie samym `--only hosting`.
- **Deploy zawsze z `--project savetheworld-eter11`.**
