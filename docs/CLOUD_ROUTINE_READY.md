# Cloud routine — GOTOWY config (czeka tylko na Twój token)

Repo na GitHub jest ✅ (`Creeperhouse999/Eter11---Gra`, w sync z lokalnym).
Skrypt zgłoszeń, `CLAUDE.md`, `firebase.json` — wszystko sklonuje się w chmurze.
`.env` NIE poszedł do repo (sekrety bezpieczne).

## Zostały DWIE rzeczy — tylko Ty możesz je zrobić

### 1. Firebase token (żeby chmura mogła wdrażać)
W domu, raz:
```bash
npx firebase login:ci --project savetheworld-eter11
```
Wypisze długi token (`1//...`). Skopiuj go.

### 2. Wpisz sekrety w środowisku cloud routine
Do środowiska chmury (panel routines albo powiesz mi, wstawię w `job_config`):
```
FIREBASE_TOKEN=<token z kroku 1>
BOT_EMAIL=claude@code.com
BOT_PASSWORD=<to samo hasło co masz w .env lokalnie>
```

## Potem powiedz „ustaw cloud routine" — utworzę to:

- **Harmonogram:** `0 * * * *` (co godzinę, UTC — minimum API to 1h)
- **Model:** claude-sonnet-5
- **Środowisko:** Default (`env_01FJf5UsjqemjsP1bZQvtGFG`)
- **Repo:** `https://github.com/Creeperhouse999/Eter11---Gra`
- **Prompt (samowystarczalny):**

> Jesteś agentem utrzymania gry ETER11 (Firebase: savetheworld-eter11). Repo jest sklonowane.
> Przeczytaj CLAUDE.md i działaj ściśle wg jego pętli.
> 1. Pobierz kolekcję `reports` z Firestore REST-em (jak w CLAUDE.md).
> 2. Dla KAŻDEGO zgłoszenia o statusie innym niż `fixed`/`done`/`dismissed`/`closed`: przeczytaj pełną treść i załączniki, znajdź przyczynę (root cause), napisz najpierw test który łapie błąd, napraw minimalnie, zweryfikuj: `npx tsc --noEmit`, `npx vitest run`, `npm run build` — wszystko musi być zielone.
> 3. Wdróż: `firebase deploy --token $FIREBASE_TOKEN --project savetheworld-eter11` (reguły osobno gdy zmienione: `--only firestore:rules` / `--only database` / `--only storage`).
> 4. Zacommituj z opisem PRZYCZYNY i wypchnij na master.
> 5. Oznacz zgłoszenie: `node scripts/mark-report.mjs "<fragment tytułu>" fixed "<komentarz>"` — status `fixed`, NIGDY `done`. Uruchom `date` i użyj REALNEJ daty. NIGDY nie kasuj rekordu zgłoszenia.
> 6. Brak nowych zgłoszeń → zakończ turę bez fabrykowania zmian.
> Sekrety masz w env: FIREBASE_TOKEN, BOT_EMAIL, BOT_PASSWORD.

## Uwaga o interwale
Cron min. 1h. Gdy Twój komputer jest włączony, lokalna sesja + Monitor łapią zgłoszenia w ~45s.
Cloud routine to zabezpieczenie na czas gdy komputer śpi.
