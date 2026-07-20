# ETER11 — Plan 3/3: Panel administracyjny i Firebase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel `/admin` do edycji kart i zasad, zapis do Firestore, tryb testowy dla balansowania, wdrożenie na Firebase Hosting.

**Architecture:** Firestore trzyma zawartość w czterech dokumentach. Gra ładuje je przy starcie z zapasem w postaci danych wbudowanych. Panel chroniony logowaniem Firebase Auth — jedno konto administracyjne.

**Tech Stack:** Firebase 10 (Firestore, Auth, Hosting), React 18, TypeScript.

Wymaga ukończenia: planów 01 i 02.
Spec: `docs/superpowers/specs/2026-07-20-eter11-web-design.md`

## Global Constraints

- Konfiguracja Firebase w `src/firebase/config.ts` — wartości publiczne z założenia, mogą pozostać w repozytorium.
- **Hasło administracyjne nigdy w kodzie ani w repozytorium.** Uwierzytelnianie wyłącznie przez Firebase Auth.
- Gra musi działać przy niedostępnym Firestore — dane wbudowane jako zapas.
- Panel nie może być linkowany z interfejsu gry.
- Walidacja przed każdym zapisem — uszkodzone dane zablokują grę wszystkim.
- Projekt Firebase: `savetheworld-eter11`, konto administracyjne: `info@eter11.pl`.

---

### Task 1: Klient Firebase

**Files:**
- Create: `src/firebase/config.ts`
- Create: `src/firebase/client.ts`

**Interfaces:**
- Consumes: nic
- Produces: `app`, `db`, `auth`

- [ ] **Step 1: Konfiguracja**

```typescript
// src/firebase/config.ts

/**
 * Konfiguracja projektu Firebase.
 *
 * Te wartości są publiczne z założenia — klucz API Firebase identyfikuje
 * projekt, ale niczego nie autoryzuje. Dostęp do danych regulują wyłącznie
 * reguły Firestore (patrz firestore.rules).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAaA1OJrJSjmDU7RPo6KXv0HhzVG9OI1X0',
  authDomain: 'savetheworld-eter11.firebaseapp.com',
  projectId: 'savetheworld-eter11',
  storageBucket: 'savetheworld-eter11.firebasestorage.app',
  messagingSenderId: '488354466236',
  appId: '1:488354466236:web:c6a7e22c991220660d43b9',
  measurementId: 'G-58QQ6MJN0F',
};
```

- [ ] **Step 2: Klient**

```typescript
// src/firebase/client.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

- [ ] **Step 3: Weryfikacja**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 4: Commit**

```bash
git add src/firebase/
git commit -m "feat(firebase): add client initialization"
```

---

### Task 2: Walidacja zawartości

**Files:**
- Create: `src/firebase/validate.ts`
- Test: `src/firebase/validate.test.ts`

**Interfaces:**
- Consumes: `src/engine/types.ts`
- Produces: `validateContent(content: unknown): ValidationResult`

- [ ] **Step 1: Testy**

```typescript
// src/firebase/validate.test.ts
import { describe, it, expect } from 'vitest';
import { validateContent } from './validate';
import { ALL_CARDS } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';
import { ALL_CHARACTERS } from '../data/characters';
import { DEFAULT_CONFIG } from '../engine/reducer';

const validContent = () => ({
  cards: ALL_CARDS,
  problems: ALL_PROBLEMS,
  characters: ALL_CHARACTERS,
  rules: DEFAULT_CONFIG,
});

describe('validateContent', () => {
  it('akceptuje dane wbudowane', () => {
    const result = validateContent(validContent());
    expect(result.ok, result.errors.join('; ')).toBe(true);
  });

  it('odrzuca brak wymaganej sekcji', () => {
    const content = validContent();
    delete (content as Record<string, unknown>).cards;
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('cards');
  });

  it('odrzuca zduplikowane identyfikatory kart', () => {
    const content = validContent();
    content.cards = [...content.cards, content.cards[0]];
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('duplikat');
  });

  it('odrzuca problem bez kompletu 4 slotów', () => {
    const content = validContent();
    content.problems = [
      { ...content.problems[0], slots: content.problems[0].slots.slice(0, 3) },
    ];
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('slot');
  });

  it('odrzuca kartę bonusową wskazującą na nieistniejącą kartę', () => {
    const content = validContent();
    content.problems = [
      {
        ...content.problems[0],
        slots: content.problems[0].slots.map((s, i) =>
          i === 0 ? { ...s, bonusCardIds: ['nie-ma-takiej-karty'] } : s,
        ),
      },
    ];
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('nie-ma-takiej-karty');
  });

  it('odrzuca liczbę rund poniżej 1', () => {
    const content = validContent();
    content.rules = { ...content.rules, roundsPerMission: 0 };
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('roundsPerMission');
  });

  it('odrzuca talię bez kart którejś kategorii kompetencji', () => {
    const content = validContent();
    content.cards = content.cards.filter((c) => c.category !== 'digital');
    const result = validateContent(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('digital');
  });

  it('odrzuca brak problemów', () => {
    const content = validContent();
    content.problems = [];
    const result = validateContent(content);
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Uruchom — ma failować**

Run: `npx vitest run src/firebase/validate.test.ts`
Expected: FAIL — brak modułu.

- [ ] **Step 3: Implementacja**

```typescript
// src/firebase/validate.ts
import type { Card, Character, Problem, RulesConfig, SlotKey } from '../engine/types';

export interface GameContent {
  cards: Card[];
  problems: Problem[];
  characters: Character[];
  rules: RulesConfig;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const REQUIRED_SLOTS: SlotKey[] = ['psychological', 'digital', 'social', 'mentorTalent'];
const COMPETENCE_CATEGORIES = ['psychological', 'digital', 'social'] as const;

/**
 * Walidacja zawartości przed zapisem do Firestore i po odczycie.
 *
 * Uszkodzone dane zablokowałyby grę wszystkim graczom, dlatego sprawdzane są
 * także zależności między sekcjami — na przykład czy karty bonusowe problemów
 * wskazują na istniejące karty.
 */
export function validateContent(content: unknown): ValidationResult {
  const errors: string[] = [];
  const add = (message: string) => errors.push(message);

  if (typeof content !== 'object' || content === null) {
    return { ok: false, errors: ['Zawartość nie jest obiektem.'] };
  }

  const data = content as Partial<GameContent>;

  for (const section of ['cards', 'problems', 'characters', 'rules'] as const) {
    if (!data[section]) add(`Brak sekcji: ${section}.`);
  }
  if (errors.length > 0) return { ok: false, errors };

  const cards = data.cards!;
  const problems = data.problems!;
  const characters = data.characters!;
  const rules = data.rules!;

  if (!Array.isArray(cards) || cards.length === 0) add('Sekcja cards jest pusta.');
  if (!Array.isArray(problems) || problems.length === 0) add('Sekcja problems jest pusta.');
  if (!Array.isArray(characters) || characters.length === 0) add('Sekcja characters jest pusta.');
  if (errors.length > 0) return { ok: false, errors };

  // Karty
  const cardIds = new Set<string>();
  for (const card of cards) {
    if (!card.id) add('Karta bez identyfikatora.');
    else if (cardIds.has(card.id)) add(`Duplikat identyfikatora karty: ${card.id}.`);
    else cardIds.add(card.id);

    if (!card.name?.trim()) add(`Karta ${card.id}: brak nazwy.`);
    if (!card.art?.trim()) add(`Karta ${card.id}: brak emoji.`);
    if (card.category === 'blackswan' && !card.blackSwanKind) {
      add(`Karta ${card.id}: Czarny Łabędź bez określonego wariantu.`);
    }
  }

  for (const category of COMPETENCE_CATEGORIES) {
    if (!cards.some((c) => c.category === category)) {
      add(`Talia nie zawiera żadnej karty kategorii ${category}.`);
    }
  }
  if (!cards.some((c) => c.category === 'talent')) add('Talia nie zawiera talentów.');
  if (!cards.some((c) => c.category === 'mentor')) add('Talia nie zawiera mentorów.');

  // Problemy
  const problemIds = new Set<string>();
  for (const problem of problems) {
    if (!problem.id) add('Problem bez identyfikatora.');
    else if (problemIds.has(problem.id)) add(`Duplikat identyfikatora problemu: ${problem.id}.`);
    else problemIds.add(problem.id);

    if (!problem.name?.trim()) add(`Problem ${problem.id}: brak nazwy.`);
    if (!problem.story?.trim()) add(`Problem ${problem.id}: brak historii.`);
    if (!problem.goal?.trim()) add(`Problem ${problem.id}: brak celu.`);

    const slotKeys = (problem.slots ?? []).map((s) => s.key);
    for (const required of REQUIRED_SLOTS) {
      if (!slotKeys.includes(required)) {
        add(`Problem ${problem.id}: brakuje slotu ${required}.`);
      }
    }

    for (const slot of problem.slots ?? []) {
      if (!slot.hint?.trim()) add(`Problem ${problem.id}, slot ${slot.key}: brak podpowiedzi.`);
      for (const bonusId of slot.bonusCardIds ?? []) {
        if (!cardIds.has(bonusId)) {
          add(`Problem ${problem.id}: karta bonusowa ${bonusId} nie istnieje w talii.`);
        }
      }
    }
  }

  // Postacie
  const characterIds = new Set<string>();
  for (const character of characters) {
    if (!character.id) add('Postać bez identyfikatora.');
    else if (characterIds.has(character.id)) add(`Duplikat identyfikatora postaci: ${character.id}.`);
    else characterIds.add(character.id);
    if (!character.name?.trim()) add(`Postać ${character.id}: brak nazwy.`);
  }

  // Zasady — wartości poza zakresem zablokowałyby rozgrywkę
  const numericRules: Array<[keyof RulesConfig, number, number]> = [
    ['roundsPerMission', 1, 30],
    ['handSize', 1, 12],
    ['missionsPerGame', 1, 20],
    ['teamWinThreshold', 1, 20],
    ['maxMatCardsPerMission', 0, 5],
    ['pointsPerExperience', 0, 10],
    ['pointsPerFulfillment', 0, 20],
  ];

  for (const [key, min, max] of numericRules) {
    const value = rules[key];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      add(`Zasada ${key}: wartość musi być liczbą.`);
    } else if (value < min || value > max) {
      add(`Zasada ${key}: wartość ${value} poza dozwolonym zakresem ${min}–${max}.`);
    }
  }

  if (typeof rules.teamWinThreshold === 'number' &&
      typeof rules.missionsPerGame === 'number' &&
      rules.teamWinThreshold > rules.missionsPerGame) {
    add('Próg zwycięstwa drużynowego jest wyższy niż liczba misji — gra byłaby niemożliwa do wygrania.');
  }

  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: Testy przechodzą**

Run: `npx vitest run src/firebase/validate.test.ts`
Expected: PASS, 8 testów.

- [ ] **Step 5: Commit**

```bash
git add src/firebase/validate.ts src/firebase/validate.test.ts
git commit -m "feat(firebase): add content validation"
```

---

### Task 3: Odczyt i zapis zawartości

**Files:**
- Create: `src/firebase/content.ts`

**Interfaces:**
- Consumes: `client.ts`, `validate.ts`, `src/data/*`
- Produces: `loadContent(): Promise<LoadResult>`, `saveContent(content): Promise<SaveResult>`, `BUILTIN_CONTENT`

- [ ] **Step 1: Implementacja**

```typescript
// src/firebase/content.ts
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ALL_CARDS } from '../data/cards';
import { ALL_CHARACTERS } from '../data/characters';
import { ALL_PROBLEMS } from '../data/problems';
import { DEFAULT_CONFIG } from '../engine/reducer';
import { db } from './client';
import { validateContent, type GameContent } from './validate';

/** Dane wbudowane — zapas, gdy Firestore jest niedostępny. */
export const BUILTIN_CONTENT: GameContent = {
  cards: ALL_CARDS,
  problems: ALL_PROBLEMS,
  characters: ALL_CHARACTERS,
  rules: DEFAULT_CONFIG,
};

export interface LoadResult {
  content: GameContent;
  /** Skąd pochodzą dane — UI informuje gracza o trybie offline. */
  source: 'firestore' | 'builtin';
  warning?: string;
}

const DOC_PATH = { collection: 'content', id: 'game' };

/**
 * Ładuje zawartość z Firestore.
 *
 * Awaria sieci, brak dokumentu i uszkodzone dane prowadzą do tego samego
 * skutku: gra działa na danych wbudowanych. Rozgrywka przy stole nie może
 * zależeć od połączenia.
 */
export async function loadContent(): Promise<LoadResult> {
  try {
    const snapshot = await getDoc(doc(db, DOC_PATH.collection, DOC_PATH.id));

    if (!snapshot.exists()) {
      return { content: BUILTIN_CONTENT, source: 'builtin' };
    }

    const data = snapshot.data();
    const validation = validateContent(data);

    if (!validation.ok) {
      return {
        content: BUILTIN_CONTENT,
        source: 'builtin',
        warning: `Dane w bazie są uszkodzone, gra działa na wersji wbudowanej. Błędy: ${validation.errors.join('; ')}`,
      };
    }

    return { content: data as GameContent, source: 'firestore' };
  } catch (error) {
    return {
      content: BUILTIN_CONTENT,
      source: 'builtin',
      warning: `Brak połączenia z bazą — gra działa w trybie offline. (${String(error)})`,
    };
  }
}

export interface SaveResult {
  ok: boolean;
  errors: string[];
}

/** Zapisuje zawartość. Walidacja poprzedza zapis — uszkodzone dane nie trafią do bazy. */
export async function saveContent(content: GameContent): Promise<SaveResult> {
  const validation = validateContent(content);
  if (!validation.ok) return { ok: false, errors: validation.errors };

  try {
    await setDoc(doc(db, DOC_PATH.collection, DOC_PATH.id), {
      ...content,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true, errors: [] };
  } catch (error) {
    return { ok: false, errors: [`Zapis nie powiódł się: ${String(error)}`] };
  }
}
```

- [ ] **Step 2: Weryfikacja typów**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 3: Commit**

```bash
git add src/firebase/content.ts
git commit -m "feat(firebase): add content load and save with offline fallback"
```

---

### Task 4: Reguły bezpieczeństwa Firestore

**Files:**
- Create: `firestore.rules`
- Create: `firebase.json`
- Create: `.firebaserc`

**Interfaces:**
- Consumes: nic
- Produces: reguły gotowe do wdrożenia

> **Uwaga bezpieczeństwa — do wykonania ręcznie przed wdrożeniem:**
> Reguły zawierają miejsce na UID konta administracyjnego. Bez wstawienia
> prawdziwego UID zapis będzie zablokowany dla wszystkich, łącznie z panelem.

- [ ] **Step 1: Utwórz konto administracyjne**

Wykonaj w przeglądarce (kroki poza kodem):
1. Firebase Console → projekt `savetheworld-eter11` → Authentication.
2. Zakładka „Sign-in method" → włącz „Email/Password".
3. Zakładka „Users" → „Add user" → email `info@eter11.pl` + hasło.
4. Skopiuj UID z kolumny „User UID".

- [ ] **Step 2: Reguły**

```
// firestore.rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Zawartość gry: karty, problemy, postacie, parametry zasad.
    // Odczyt publiczny — gra ładuje dane bez logowania.
    // Zapis wyłącznie z konta administracyjnego.
    match /content/{document} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == 'WSTAW_TUTAJ_UID_KONTA_ADMIN';
    }

    // Wszystkie pozostałe ścieżki zamknięte.
    // Bez tej reguły kolekcje dodane w przyszłości (pokoje gier w fazie 2)
    // mogłyby zostać otwarte przez przeoczenie.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 3: Wstaw UID**

Zastąp `WSTAW_TUTAJ_UID_KONTA_ADMIN` wartością skopiowaną w kroku 1.

- [ ] **Step 4: Konfiguracja Firebase CLI**

```json
// firebase.json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

```json
// .firebaserc
{
  "projects": {
    "default": "savetheworld-eter11"
  }
}
```

- [ ] **Step 5: Wdróż reguły**

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

Expected: `Deploy complete!`

- [ ] **Step 6: Weryfikacja reguł**

W Firebase Console → Firestore → Rules → Playground:
1. Symuluj `get` na `/content/game` bez uwierzytelnienia → **Allow**.
2. Symuluj `update` na `/content/game` bez uwierzytelnienia → **Deny**.
3. Symuluj `update` z UID konta administracyjnego → **Allow**.

- [ ] **Step 7: Commit**

```bash
git add firestore.rules firebase.json .firebaserc
git commit -m "feat(firebase): add security rules and hosting config"
```

---

### Task 5: Logowanie do panelu

**Files:**
- Create: `src/admin/useAdminAuth.ts`
- Create: `src/admin/LoginForm.tsx`

**Interfaces:**
- Consumes: `src/firebase/client.ts`
- Produces: `useAdminAuth()`, `<LoginForm onSubmit error pending />`

- [ ] **Step 1: Hook uwierzytelniania**

```typescript
// src/admin/useAdminAuth.ts
import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase/client';

/**
 * Uwierzytelnianie panelu administracyjnego.
 *
 * Hasło żyje wyłącznie w Firebase — nigdy w kodzie aplikacji.
 * Zmiana hasła odbywa się w Firebase Console, bez ponownego wdrożenia.
 */
export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setChecking(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    setPending(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      // Komunikat celowo nie zdradza, czy błędny był email czy hasło.
      setError('Nieprawidłowy email lub hasło.');
    } finally {
      setPending(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, checking, error, pending, login, logout };
}
```

- [ ] **Step 2: Formularz logowania**

```tsx
// src/admin/LoginForm.tsx
import { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  error: string | null;
  pending: boolean;
}

export function LoginForm({ onSubmit, error, pending }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-black text-accent">Panel ETER11</h1>
      <p className="mt-1 text-sm text-ink-dim">Edycja kart i zasad gry.</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email, password);
        }}
      >
        <label className="block text-sm">
          <span className="text-ink-dim">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            className="mt-1 w-full rounded-lg border border-edge bg-bg px-3 py-2 text-ink"
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-dim">Hasło</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-edge bg-bg px-3 py-2 text-ink"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent px-4 py-2 font-bold text-bg disabled:opacity-40"
        >
          {pending ? 'Logowanie…' : 'Zaloguj'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Weryfikacja typów**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 4: Commit**

```bash
git add src/admin/useAdminAuth.ts src/admin/LoginForm.tsx
git commit -m "feat(admin): add Firebase Auth login"
```

---

### Task 6: Edytor problemów

**Files:**
- Create: `src/admin/ProblemEditor.tsx`

**Interfaces:**
- Consumes: `src/engine/types.ts`, `categoryStyles`
- Produces: `<ProblemEditor problems cards onChange />`

- [ ] **Step 1: Komponent**

```tsx
// src/admin/ProblemEditor.tsx
import { useState } from 'react';
import type { Card, Problem, ProblemType, SlotKey } from '../engine/types';
import { problemTypeLabel, slotLabel } from '../ui/components/categoryStyles';

interface ProblemEditorProps {
  problems: Problem[];
  cards: Card[];
  onChange: (problems: Problem[]) => void;
}

const PROBLEM_TYPES: ProblemType[] = ['action', 'thinking', 'cooperation', 'selfchange'];
const SLOT_KEYS: SlotKey[] = ['psychological', 'digital', 'social', 'mentorTalent'];

function emptyProblem(): Problem {
  return {
    id: `prob-${Date.now()}`,
    name: 'Nowy problem',
    story: '',
    antagonist: '',
    consequence: '',
    goal: '',
    type: 'action',
    art: '🌍',
    draft: true,
    slots: SLOT_KEYS.map((key) => ({ key, hint: '', bonusCardIds: [] })),
  };
}

/** Edytor kart problemów: treść, typ, cztery sloty z podpowiedziami i bonusami. */
export function ProblemEditor({ problems, cards, onChange }: ProblemEditorProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<Problem>) => {
    onChange(problems.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const updateSlot = (problemId: string, slotKey: SlotKey, patch: Partial<Problem['slots'][0]>) => {
    onChange(
      problems.map((p) =>
        p.id === problemId
          ? { ...p, slots: p.slots.map((s) => (s.key === slotKey ? { ...s, ...patch } : s)) }
          : p,
      ),
    );
  };

  const remove = (id: string) => {
    const problem = problems.find((p) => p.id === id);
    const confirmed = window.confirm(
      `Usunąć problem „${problem?.name}"? Tej operacji nie da się cofnąć bez ponownego wczytania danych.`,
    );
    if (confirmed) onChange(problems.filter((p) => p.id !== id));
  };

  /** Karty pasujące kategorią do slotu — tylko one mogą być bonusem. */
  const cardsForSlot = (slotKey: SlotKey) =>
    cards.filter((c) =>
      slotKey === 'mentorTalent'
        ? c.category === 'mentor' || c.category === 'talent'
        : c.category === slotKey,
    );

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Problemy ({problems.length})</h2>
        <button
          type="button"
          onClick={() => onChange([...problems, emptyProblem()])}
          className="rounded-lg border border-accent px-3 py-1 text-sm text-accent"
        >
          Dodaj problem
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {problems.map((problem) => {
          const open = openId === problem.id;
          return (
            <li key={problem.id} className="rounded-xl border border-edge bg-surface">
              <div className="flex items-center gap-3 p-3">
                <span className="text-2xl" aria-hidden="true">{problem.art}</span>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : problem.id)}
                  className="flex-1 text-left"
                >
                  <span className="font-bold">{problem.name}</span>
                  <span className="ml-2 text-xs text-ink-dim">
                    {problemTypeLabel(problem.type)}
                  </span>
                  {problem.draft && (
                    <span className="ml-2 rounded bg-accent-2 px-2 py-0.5 text-[10px] font-bold text-bg">
                      do weryfikacji
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(problem.id)}
                  className="text-xs text-danger underline"
                >
                  Usuń
                </button>
              </div>

              {open && (
                <div className="space-y-3 border-t border-edge p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="text-ink-dim">Nazwa</span>
                      <input
                        value={problem.name}
                        onChange={(e) => update(problem.id, { name: e.target.value })}
                        className="mt-1 w-full rounded border border-edge bg-bg px-2 py-1"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-dim">Emoji</span>
                      <input
                        value={problem.art}
                        onChange={(e) => update(problem.id, { art: e.target.value })}
                        className="mt-1 w-full rounded border border-edge bg-bg px-2 py-1"
                      />
                    </label>
                  </div>

                  <label className="block text-sm">
                    <span className="text-ink-dim">Historia</span>
                    <textarea
                      value={problem.story}
                      onChange={(e) => update(problem.id, { story: e.target.value })}
                      rows={3}
                      className="mt-1 w-full rounded border border-edge bg-bg px-2 py-1"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block text-sm">
                      <span className="text-ink-dim">Przeciwnik</span>
                      <input
                        value={problem.antagonist}
                        onChange={(e) => update(problem.id, { antagonist: e.target.value })}
                        className="mt-1 w-full rounded border border-edge bg-bg px-2 py-1"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-dim">Cel</span>
                      <input
                        value={problem.goal}
                        onChange={(e) => update(problem.id, { goal: e.target.value })}
                        className="mt-1 w-full rounded border border-edge bg-bg px-2 py-1"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-dim">Jeśli się nie uda</span>
                      <input
                        value={problem.consequence}
                        onChange={(e) => update(problem.id, { consequence: e.target.value })}
                        className="mt-1 w-full rounded border border-edge bg-bg px-2 py-1"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="text-sm">
                      <span className="text-ink-dim">Typ</span>
                      <select
                        value={problem.type}
                        onChange={(e) => update(problem.id, { type: e.target.value as ProblemType })}
                        className="ml-2 rounded border border-edge bg-bg px-2 py-1"
                      >
                        {PROBLEM_TYPES.map((type) => (
                          <option key={type} value={type}>{problemTypeLabel(type)}</option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(problem.draft)}
                        onChange={(e) => update(problem.id, { draft: e.target.checked })}
                      />
                      <span className="text-ink-dim">Wymaga weryfikacji merytorycznej</span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold">Cztery ścianki</h3>
                    {problem.slots.map((slot) => (
                      <div key={slot.key} className="rounded-lg border border-edge p-3">
                        <span className="text-xs font-bold">{slotLabel(slot.key)}</span>
                        <label className="mt-2 block text-sm">
                          <span className="text-ink-dim">Podpowiedź dla graczy</span>
                          <input
                            value={slot.hint}
                            onChange={(e) => updateSlot(problem.id, slot.key, { hint: e.target.value })}
                            className="mt-1 w-full rounded border border-edge bg-bg px-2 py-1"
                          />
                        </label>
                        <fieldset className="mt-2">
                          <legend className="text-xs text-ink-dim">
                            Karty bonusowe — zagranie ich daje dodatkową kartę doświadczenia
                          </legend>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {cardsForSlot(slot.key).map((card) => {
                              const checked = slot.bonusCardIds.includes(card.id);
                              return (
                                <label
                                  key={card.id}
                                  className={[
                                    'cursor-pointer rounded border px-2 py-1 text-xs',
                                    checked ? 'border-accent text-accent' : 'border-edge text-ink-dim',
                                  ].join(' ')}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      updateSlot(problem.id, slot.key, {
                                        bonusCardIds: checked
                                          ? slot.bonusCardIds.filter((id) => id !== card.id)
                                          : [...slot.bonusCardIds, card.id],
                                      })
                                    }
                                    className="sr-only"
                                  />
                                  {card.art} {card.name}
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Weryfikacja typów**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 3: Commit**

```bash
git add src/admin/ProblemEditor.tsx
git commit -m "feat(admin): add problem editor"
```

---

### Task 7: Edytor kart i zasad

**Files:**
- Create: `src/admin/CardEditor.tsx`
- Create: `src/admin/RulesEditor.tsx`

**Interfaces:**
- Consumes: `src/engine/types.ts`
- Produces: `<CardEditor cards onChange />`, `<RulesEditor rules onChange />`

- [ ] **Step 1: Edytor kart**

```tsx
// src/admin/CardEditor.tsx
import { useState } from 'react';
import type { BlackSwanKind, Card, CardCategory } from '../engine/types';
import { categoryLabel } from '../ui/components/categoryStyles';

interface CardEditorProps {
  cards: Card[];
  onChange: (cards: Card[]) => void;
}

const CATEGORIES: CardCategory[] = [
  'psychological', 'digital', 'social', 'talent', 'mentor', 'eter11', 'blackswan',
];

const SWAN_KINDS: Array<[BlackSwanKind, string]> = [
  ['extraProblem', 'Dodatkowy problem'],
  ['doubleRequirements', 'Podwojone wymagania'],
  ['swapHands', 'Wymiana rąk'],
];

export function CardEditor({ cards, onChange }: CardEditorProps) {
  const [filter, setFilter] = useState<CardCategory | 'all'>('all');

  const visible = filter === 'all' ? cards : cards.filter((c) => c.category === filter);

  const update = (id: string, patch: Partial<Card>) => {
    onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const add = () => {
    const category: CardCategory = filter === 'all' ? 'psychological' : filter;
    onChange([
      ...cards,
      {
        id: `card-${Date.now()}`,
        name: 'Nowa karta',
        category,
        description: '',
        art: '🎴',
        draft: true,
        ...(category === 'blackswan' ? { blackSwanKind: 'extraProblem' as BlackSwanKind } : {}),
      },
    ]);
  };

  const remove = (id: string) => {
    const card = cards.find((c) => c.id === id);
    const confirmed = window.confirm(
      `Usunąć kartę „${card?.name}"? Jeśli jest kartą bonusową jakiegoś problemu, zapis zostanie odrzucony przez walidację.`,
    );
    if (confirmed) onChange(cards.filter((c) => c.id !== id));
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Karty ({cards.length})</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as CardCategory | 'all')}
            className="rounded border border-edge bg-bg px-2 py-1 text-sm"
          >
            <option value="all">Wszystkie kategorie</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>{categoryLabel(category)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            className="rounded-lg border border-accent px-3 py-1 text-sm text-accent"
          >
            Dodaj kartę
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {visible.map((card) => (
          <li key={card.id} className="rounded-lg border border-edge bg-surface p-3">
            <div className="grid gap-2 sm:grid-cols-[3rem_1fr_1fr_auto]">
              <input
                value={card.art}
                onChange={(e) => update(card.id, { art: e.target.value })}
                aria-label="Emoji"
                className="rounded border border-edge bg-bg px-2 py-1 text-center"
              />
              <input
                value={card.name}
                onChange={(e) => update(card.id, { name: e.target.value })}
                aria-label="Nazwa karty"
                className="rounded border border-edge bg-bg px-2 py-1"
              />
              <select
                value={card.category}
                onChange={(e) => update(card.id, { category: e.target.value as CardCategory })}
                aria-label="Kategoria"
                className="rounded border border-edge bg-bg px-2 py-1 text-sm"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{categoryLabel(category)}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(card.id)}
                className="text-xs text-danger underline"
              >
                Usuń
              </button>
            </div>

            <input
              value={card.description}
              onChange={(e) => update(card.id, { description: e.target.value })}
              placeholder="Opis karty"
              aria-label="Opis karty"
              className="mt-2 w-full rounded border border-edge bg-bg px-2 py-1 text-sm"
            />

            {card.category === 'blackswan' && (
              <label className="mt-2 block text-sm">
                <span className="text-ink-dim">Wariant Czarnego Łabędzia</span>
                <select
                  value={card.blackSwanKind ?? 'extraProblem'}
                  onChange={(e) => update(card.id, { blackSwanKind: e.target.value as BlackSwanKind })}
                  className="ml-2 rounded border border-edge bg-bg px-2 py-1"
                >
                  {SWAN_KINDS.map(([kind, label]) => (
                    <option key={kind} value={kind}>{label}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="mt-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={Boolean(card.draft)}
                onChange={(e) => update(card.id, { draft: e.target.checked })}
              />
              <span className="text-ink-dim">Wymaga weryfikacji merytorycznej</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Edytor zasad**

```tsx
// src/admin/RulesEditor.tsx
import type { RulesConfig } from '../engine/types';

interface RulesEditorProps {
  rules: RulesConfig;
  onChange: (rules: RulesConfig) => void;
}

const FIELDS: Array<{ key: keyof RulesConfig; label: string; hint: string; min: number; max: number }> = [
  { key: 'roundsPerMission', label: 'Rundy na misję', hint: 'Po tylu rundach problem wygrywa.', min: 1, max: 30 },
  { key: 'handSize', label: 'Kart na ręce', hint: 'Ile kart trzyma gracz.', min: 1, max: 12 },
  { key: 'missionsPerGame', label: 'Misji w grze', hint: 'Po tylu misjach gra się kończy.', min: 1, max: 20 },
  { key: 'teamWinThreshold', label: 'Próg zwycięstwa drużyny', hint: 'Tyle rozwiązanych problemów daje wspólną wygraną.', min: 1, max: 20 },
  { key: 'maxMatCardsPerMission', label: 'Kart z postaci na misję', hint: 'Ile kart ze swojej postaci gracz może użyć.', min: 0, max: 5 },
  { key: 'pointsPerExperience', label: 'Punkty za doświadczenie', hint: 'Punktacja końcowa.', min: 0, max: 10 },
  { key: 'pointsPerFulfillment', label: 'Punkty za spełnienie', hint: 'Punktacja końcowa.', min: 0, max: 20 },
];

export function RulesEditor({ rules, onChange }: RulesEditorProps) {
  return (
    <section>
      <h2 className="text-lg font-bold">Parametry zasad</h2>
      <p className="mt-1 text-sm text-ink-dim">
        Zmiany obowiązują od następnej rozpoczętej gry.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label key={field.key} className="block rounded-lg border border-edge bg-surface p-3 text-sm">
            <span className="font-semibold">{field.label}</span>
            <input
              type="number"
              min={field.min}
              max={field.max}
              value={rules[field.key]}
              onChange={(e) =>
                onChange({ ...rules, [field.key]: Number(e.target.value) })
              }
              className="mt-1 w-full rounded border border-edge bg-bg px-2 py-1"
            />
            <span className="mt-1 block text-xs text-ink-dim">{field.hint}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Weryfikacja typów**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 4: Commit**

```bash
git add src/admin/CardEditor.tsx src/admin/RulesEditor.tsx
git commit -m "feat(admin): add card and rules editors"
```

---

### Task 8: Tryb testowy

**Files:**
- Create: `src/admin/TestMode.tsx`

**Interfaces:**
- Consumes: `useGame`, `applyBlackSwan`, ekrany gry
- Produces: `<TestMode content />`

> **Kolejność:** ten komponent wymaga czteroargumentowej wersji `useGame`.
> Wykonaj najpierw kroki 1–2 z Zadania 10 (rozszerzenie `useGame` o parametr
> `content`), a potem wróć tutaj. Bez tego `npx tsc --noEmit` zgłosi błąd
> „Expected 1-3 arguments, but got 4".

- [ ] **Step 1: Komponent**

```tsx
// src/admin/TestMode.tsx
import { useState } from 'react';
import { applyBlackSwan } from '../engine/reducer';
import type { BlackSwanKind, GameState } from '../engine/types';
import { MissionScreen } from '../ui/screens/MissionScreen';
import { SummaryScreen } from '../ui/screens/SummaryScreen';
import { FinaleScreen } from '../ui/screens/FinaleScreen';
import { useGame } from '../ui/useGame';
import type { GameContent } from '../firebase/validate';

interface TestModeProps {
  content: GameContent;
}

const TEST_PLAYERS = [
  { id: 'test-1', name: 'Tester 1', characterId: 'ch-odkrywca' },
  { id: 'test-2', name: 'Tester 2', characterId: 'pa-opiekun' },
  { id: 'test-3', name: 'Tester 3', characterId: 'te-praktyk' },
];

const SWAN_LABELS: Array<[BlackSwanKind, string]> = [
  ['extraProblem', 'Dodatkowy problem'],
  ['doubleRequirements', 'Podwojone wymagania'],
  ['swapHands', 'Wymiana rąk'],
];

/**
 * Tryb testowy do balansowania gry.
 *
 * Pozwala rozegrać partię z podglądem stanu, cofaniem ruchów i ręcznym
 * wywołaniem Czarnego Łabędzia — bez czekania, aż karta wypadnie z talii.
 */
export function TestMode({ content }: TestModeProps) {
  const [seed, setSeed] = useState(1);
  const [showState, setShowState] = useState(false);
  // Karty i problemy z panelu, nie wbudowane — tryb testowy ma pokazywać
  // dokładnie to, co administrator właśnie edytuje.
  const game = useGame(TEST_PLAYERS, seed, content.rules, {
    cards: content.cards,
    problems: content.problems,
  });
  const { state, dispatch, undo, history } = game;

  // Czarny Łabędź omija reducer — to narzędzie testowe, nie ruch gracza.
  const [override, setOverride] = useState<GameState | null>(null);
  const effectiveState = override ?? state;

  const triggerSwan = (kind: BlackSwanKind) => {
    setOverride(applyBlackSwan(effectiveState, kind));
  };

  return (
    <div>
      <section className="rounded-xl border border-accent-2 bg-surface p-4">
        <h2 className="font-bold text-accent-2">Tryb testowy</h2>
        <p className="mt-1 text-xs text-ink-dim">
          Rozgrywka na 3 testerów. Zmiany kart i zasad z panelu obowiązują tutaj
          od nowej partii.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm">
            <span className="text-ink-dim">Ziarno tasowania</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="ml-2 w-24 rounded border border-edge bg-bg px-2 py-1"
            />
          </label>
          <button
            type="button"
            onClick={() => { setSeed((s) => s + 1); setOverride(null); }}
            className="rounded border border-edge px-3 py-1 text-sm"
          >
            Nowa partia
          </button>
          <button
            type="button"
            onClick={() => { undo(); setOverride(null); }}
            disabled={history.length === 0}
            className="rounded border border-edge px-3 py-1 text-sm disabled:opacity-40"
          >
            Cofnij ruch ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setShowState((v) => !v)}
            className="rounded border border-edge px-3 py-1 text-sm"
          >
            {showState ? 'Ukryj stan' : 'Pokaż stan (JSON)'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-dim">Wywołaj Czarnego Łabędzia:</span>
          {SWAN_LABELS.map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() => triggerSwan(kind)}
              disabled={effectiveState.phase !== 'mission'}
              className="rounded border border-accent-2 px-2 py-1 text-xs text-accent-2 disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>

        {override && (
          <p className="mt-2 text-xs text-accent-2">
            Stan zmodyfikowany ręcznie. Kolejny ruch gracza wróci do normalnego przebiegu.
          </p>
        )}

        {showState && (
          <pre className="mt-3 max-h-64 overflow-auto rounded bg-bg p-3 text-[10px] text-ink-dim">
            {JSON.stringify(
              {
                phase: effectiveState.phase,
                mission: effectiveState.mission && {
                  round: effectiveState.mission.round,
                  problems: effectiveState.mission.problems.map((p) => p.name),
                  played: effectiveState.mission.played.length,
                  swans: effectiveState.mission.activeBlackSwans,
                },
                drawPile: effectiveState.drawPile.length,
                players: effectiveState.players.map((p) => ({
                  name: p.name,
                  hand: p.hand.length,
                  mat: p.mat.map((c) => c.name),
                  experience: p.experience.length,
                })),
              },
              null,
              2,
            )}
          </pre>
        )}
      </section>

      <div className="mt-4">
        {effectiveState.phase === 'setup' && (
          <button
            type="button"
            onClick={() => { setOverride(null); dispatch({ type: 'START_MISSION' }); }}
            className="rounded-lg bg-accent px-6 py-3 font-bold text-bg"
          >
            Odkryj problem
          </button>
        )}
        {effectiveState.phase === 'mission' && (
          <MissionScreen game={{ ...game, state: effectiveState }} />
        )}
        {effectiveState.phase === 'missionSummary' && (
          <SummaryScreen game={{ ...game, state: effectiveState }} />
        )}
        {effectiveState.phase === 'finale' && (
          <FinaleScreen
            game={{ ...game, state: effectiveState }}
            onRestart={() => { setSeed((s) => s + 1); setOverride(null); }}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Weryfikacja typów**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 3: Commit**

```bash
git add src/admin/TestMode.tsx
git commit -m "feat(admin): add test mode with undo and manual Black Swan"
```

---

### Task 9: Panel — złożenie

**Files:**
- Create: `src/admin/AdminApp.tsx`

**Interfaces:**
- Consumes: wszystkie komponenty panelu, `src/firebase/content.ts`
- Produces: `<AdminApp />`

- [ ] **Step 1: Komponent**

```tsx
// src/admin/AdminApp.tsx
import { useEffect, useState } from 'react';
import { BUILTIN_CONTENT, loadContent, saveContent } from '../firebase/content';
import type { GameContent } from '../firebase/validate';
import { CardEditor } from './CardEditor';
import { LoginForm } from './LoginForm';
import { ProblemEditor } from './ProblemEditor';
import { RulesEditor } from './RulesEditor';
import { TestMode } from './TestMode';
import { useAdminAuth } from './useAdminAuth';

type Tab = 'problems' | 'cards' | 'rules' | 'test';

const TABS: Array<[Tab, string]> = [
  ['problems', 'Problemy'],
  ['cards', 'Karty'],
  ['rules', 'Zasady'],
  ['test', 'Tryb testowy'],
];

export function AdminApp() {
  const auth = useAdminAuth();
  const [content, setContent] = useState<GameContent>(BUILTIN_CONTENT);
  const [tab, setTab] = useState<Tab>('problems');
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.user) return;
    loadContent().then((result) => {
      setContent(result.content);
      if (result.warning) setStatus(result.warning);
    });
  }, [auth.user]);

  // Ostrzeżenie przed zamknięciem karty z niezapisanymi zmianami.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const update = (patch: Partial<GameContent>) => {
    setContent((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setStatus(null);
  };

  const save = async () => {
    setStatus('Zapisywanie…');
    const result = await saveContent(content);
    if (result.ok) {
      setDirty(false);
      setErrors([]);
      setStatus('Zapisano. Gracze zobaczą zmiany po odświeżeniu strony.');
    } else {
      setErrors(result.errors);
      setStatus(null);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eter11-content-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setContent(parsed);
        setDirty(true);
        setStatus('Wczytano plik. Sprawdź zawartość i zapisz, żeby trafiła do bazy.');
        setErrors([]);
      } catch {
        setErrors(['Plik nie jest poprawnym JSON-em.']);
      }
    };
    reader.readAsText(file);
  };

  if (auth.checking) {
    return <main className="p-8 text-sm text-ink-dim">Sprawdzanie sesji…</main>;
  }

  if (!auth.user) {
    return <LoginForm onSubmit={auth.login} error={auth.error} pending={auth.pending} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-accent">Panel ETER11</h1>
          <p className="text-xs text-ink-dim">Zalogowano jako {auth.user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportJson} className="rounded border border-edge px-3 py-1 text-sm">
            Eksportuj JSON
          </button>
          <label className="cursor-pointer rounded border border-edge px-3 py-1 text-sm">
            Importuj JSON
            <input
              type="file"
              accept="application/json"
              onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className="rounded bg-accent px-4 py-1 text-sm font-bold text-bg disabled:opacity-40"
          >
            {dirty ? 'Zapisz zmiany' : 'Brak zmian'}
          </button>
          <button type="button" onClick={auth.logout} className="rounded border border-edge px-3 py-1 text-sm">
            Wyloguj
          </button>
        </div>
      </header>

      {status && (
        <p className="mt-3 rounded border border-edge bg-surface px-3 py-2 text-sm">{status}</p>
      )}

      {errors.length > 0 && (
        <div role="alert" className="mt-3 rounded border border-danger bg-surface px-3 py-2">
          <p className="text-sm font-bold text-danger">Zapis odrzucony — popraw błędy:</p>
          <ul className="mt-1 list-inside list-disc text-xs text-ink-dim">
            {errors.map((error, index) => <li key={index}>{error}</li>)}
          </ul>
        </div>
      )}

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Sekcje panelu">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              'rounded-lg px-4 py-2 text-sm',
              tab === key ? 'bg-accent font-bold text-bg' : 'border border-edge',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === 'problems' && (
          <ProblemEditor
            problems={content.problems}
            cards={content.cards}
            onChange={(problems) => update({ problems })}
          />
        )}
        {tab === 'cards' && (
          <CardEditor cards={content.cards} onChange={(cards) => update({ cards })} />
        )}
        {tab === 'rules' && (
          <RulesEditor rules={content.rules} onChange={(rules) => update({ rules })} />
        )}
        {tab === 'test' && <TestMode key={JSON.stringify(content.rules)} content={content} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Weryfikacja typów**

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 3: Commit**

```bash
git add src/admin/AdminApp.tsx
git commit -m "feat(admin): assemble admin panel with tabs, save and export"
```

---

### Task 10: Routing i ładowanie zawartości w grze

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/ui/GameApp.tsx`
- Modify: `src/ui/useGame.ts`

**Interfaces:**
- Consumes: `AdminApp`, `loadContent`
- Produces: aplikacja rozpoznająca ścieżkę `/admin`, gra czytająca zawartość z Firestore

- [ ] **Step 1: Routing**

Zastąp `src/App.tsx`:

```tsx
import { AdminApp } from './admin/AdminApp';
import { GameApp } from './ui/GameApp';

/**
 * Routing bez biblioteki — aplikacja ma dokładnie dwa widoki.
 * Ścieżka /admin nie jest linkowana z interfejsu gry.
 */
export default function App() {
  const isAdmin = window.location.pathname.startsWith('/admin');
  return isAdmin ? <AdminApp /> : <GameApp />;
}
```

- [ ] **Step 2: useGame przyjmuje zawartość**

W `src/ui/useGame.ts` zastąp sygnaturę i wnętrze `useGame`:

```typescript
import { useCallback, useState } from 'react';
import { createGame, reduce, DEFAULT_CONFIG } from '../engine/reducer';
import { buildDeck } from '../data/cards';
import { ALL_PROBLEMS } from '../data/problems';
import type { Action, Card, GameState, Problem, RulesConfig } from '../engine/types';

export interface PlayerSetup {
  id: string;
  name: string;
  characterId: string;
}

export interface GameContentInput {
  cards?: Card[];
  problems?: Problem[];
}

/**
 * Opakowanie silnika gry dla React.
 *
 * Karty i problemy można podać z zewnątrz (dane z Firestore); brak argumentu
 * oznacza dane wbudowane — dzięki temu testy i tryb offline działają bez sieci.
 */
export function useGame(
  players: PlayerSetup[],
  seed: number,
  config: RulesConfig = DEFAULT_CONFIG,
  content: GameContentInput = {},
) {
  const [state, setState] = useState<GameState>(() =>
    createGame({
      players,
      deck: content.cards ? duplicateForDeck(content.cards) : buildDeck(),
      problems: content.problems ?? ALL_PROBLEMS,
      seed,
      config,
    }),
  );
  const [history, setHistory] = useState<GameState[]>([]);
  const [rejection, setRejection] = useState<string | null>(null);

  const dispatch = useCallback((action: Action) => {
    setState((current) => {
      const result = reduce(current, action);
      if (result.rejected) {
        setRejection(result.rejected);
        return current;
      }
      setRejection(null);
      setHistory((prev) => [...prev, current]);
      return result.state;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      setState(prev[prev.length - 1]);
      setRejection(null);
      return prev.slice(0, -1);
    });
  }, []);

  const dismissRejection = useCallback(() => setRejection(null), []);

  return { state, dispatch, rejection, dismissRejection, history, undo };
}

/**
 * Zwielokrotnia karty kompetencji, talentów i mentorów.
 * Karty specjalne pozostają pojedyncze — ich rzadkość jest częścią zasad.
 */
function duplicateForDeck(cards: Card[]): Card[] {
  const special = cards.filter((c) => c.category === 'eter11' || c.category === 'blackswan');
  const regular = cards.filter((c) => c.category !== 'eter11' && c.category !== 'blackswan');
  const copies = regular.flatMap((card) => [card, { ...card, id: `${card.id}-b` }]);
  return [...copies, ...special];
}
```

- [ ] **Step 3: Gra ładuje zawartość**

Zastąp `src/ui/GameApp.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { BUILTIN_CONTENT, loadContent } from '../firebase/content';
import type { GameContent } from '../firebase/validate';
import { FinaleScreen } from './screens/FinaleScreen';
import { MissionScreen } from './screens/MissionScreen';
import { SetupScreen } from './screens/SetupScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { useGame, type PlayerSetup } from './useGame';

function RunningGame({ players, seed, content, onRestart }: {
  players: PlayerSetup[];
  seed: number;
  content: GameContent;
  onRestart: () => void;
}) {
  const game = useGame(players, seed, content.rules, {
    cards: content.cards,
    problems: content.problems,
  });
  const { state, dispatch } = game;

  if (state.phase === 'finale') return <FinaleScreen game={game} onRestart={onRestart} />;
  if (state.phase === 'missionSummary') return <SummaryScreen game={game} />;
  if (state.phase === 'mission') return <MissionScreen game={game} />;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-black text-accent">
        {state.missionNumber === 0 ? 'Gotowi do pierwszej misji?' : 'Kolejna misja czeka'}
      </h1>
      <p className="mt-3 text-sm text-ink-dim">
        Rozwiązane problemy: {state.solvedProblems.length} · Pozostało kart problemów:{' '}
        {state.problemPile.length}
      </p>
      <button
        type="button"
        onClick={() => dispatch({ type: 'START_MISSION' })}
        className="mt-8 rounded-lg bg-accent px-8 py-4 text-lg font-bold text-bg"
      >
        Odkryj problem
      </button>
    </main>
  );
}

export function GameApp() {
  const [content, setContent] = useState<GameContent | null>(null);
  const [offline, setOffline] = useState(false);
  const [session, setSession] = useState<{ players: PlayerSetup[]; seed: number } | null>(null);

  useEffect(() => {
    loadContent().then((result) => {
      setContent(result.content);
      setOffline(result.source === 'builtin');
    });
  }, []);

  if (!content) {
    return <main className="p-8 text-sm text-ink-dim">Ładowanie kart…</main>;
  }

  return (
    <>
      {offline && (
        <p className="bg-raised px-4 py-1 text-center text-xs text-ink-dim">
          Tryb offline — gra korzysta z kart zapisanych w aplikacji.
        </p>
      )}
      {session ? (
        <RunningGame
          key={session.seed}
          players={session.players}
          seed={session.seed}
          content={content}
          onRestart={() => setSession(null)}
        />
      ) : (
        <SetupScreen onStart={(players) => setSession({ players, seed: Date.now() })} />
      )}
    </>
  );
}
```

- [ ] **Step 4: SetupScreen czyta postacie z zawartości**

W `src/ui/screens/SetupScreen.tsx` zmień sygnaturę na przyjmującą postacie:

```tsx
interface SetupScreenProps {
  onStart: (players: PlayerSetup[]) => void;
  characters?: Character[];
}

export function SetupScreen({ onStart, characters = ALL_CHARACTERS }: SetupScreenProps) {
```

Zastąp wszystkie użycia `ALL_CHARACTERS` wewnątrz komponentu zmienną `characters`.
Dodaj import typu:

```tsx
import type { Character } from '../../engine/types';
```

W `GameApp.tsx` przekaż postacie:

```tsx
<SetupScreen
  characters={content.characters}
  onStart={(players) => setSession({ players, seed: Date.now() })}
/>
```

- [ ] **Step 5: Testy i typy**

Run: `npm test`
Expected: PASS, wszystkie pliki.

Run: `npx tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/ui/
git commit -m "feat: add admin routing and Firestore content loading"
```

---

### Task 11: Wdrożenie

**Files:**
- Modify: `package.json`
- Create: `README.md`

**Interfaces:**
- Consumes: wszystko powyżej
- Produces: działająca aplikacja pod adresem Firebase Hosting

- [ ] **Step 1: Skrypt wdrożenia**

W `package.json`, w `"scripts"`:

```json
"deploy": "npm run build && firebase deploy --only hosting"
```

- [ ] **Step 2: README**

```markdown
# ETER11 — Save the World

Webowa wersja karcianej gry edukacyjnej dla dzieci 8–12 lat i rodziców.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Gra: http://localhost:5173
Panel administracyjny: http://localhost:5173/admin

## Testy

```bash
npm test          # jednorazowo
npm run test:watch
```

## Wdrożenie

```bash
npm run deploy
```

Reguły bezpieczeństwa bazy wdrażane osobno:

```bash
firebase deploy --only firestore:rules
```

## Panel administracyjny

Ścieżka `/admin`, logowanie kontem Firebase (`info@eter11.pl`).
Hasło ustawiane w Firebase Console → Authentication → Users.
**Hasła nie umieszczamy w kodzie ani w tym repozytorium.**

Panel pozwala edytować karty problemów, karty kompetencji, talentów
i mentorów, parametry zasad oraz rozegrać partię testową.

Przycisk „Eksportuj JSON" zapisuje całą zawartość do pliku — warto zrobić
kopię przed większymi zmianami.

## Struktura

```
src/engine/   silnik gry — czysty TypeScript, bez React i bez sieci
src/data/     karty wbudowane (zapas, gdy baza niedostępna)
src/ui/       interfejs gry
src/admin/    panel administracyjny
src/firebase/ klient bazy, walidacja, odczyt i zapis zawartości
```

Silnik jest niezależny od React i Firebase. Cała logika zasad
jest testowana bez przeglądarki.

## Stan projektu

Faza 1: rozgrywka na jednym urządzeniu (hot-seat).
Faza 2 (planowana): multiplayer online z kodem pokoju.

Karty oznaczone w panelu etykietą „do weryfikacji" zostały dopisane
technicznie i czekają na sprawdzenie merytoryczne — dotyczy to problemów
9, 11, 12 i 13, których instrukcja nie zawierała kompletnych wymagań.
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `dist/` utworzony, brak błędów.

- [ ] **Step 4: Wdrożenie**

Run: `npm run deploy`
Expected: `Hosting URL: https://savetheworld-eter11.web.app`

- [ ] **Step 5: Weryfikacja po wdrożeniu**

Sprawdź w przeglądarce:
1. `https://savetheworld-eter11.web.app` — ekran startowy gry.
2. Pełna rozgrywka: ustawienia → misja → podsumowanie → finał.
3. `https://savetheworld-eter11.web.app/admin` — formularz logowania.
4. Logowanie kontem administracyjnym → panel się otwiera.
5. Zmiana nazwy dowolnej karty → „Zapisz zmiany" → komunikat o powodzeniu.
6. Odświeżenie gry w innej karcie → zmieniona nazwa jest widoczna.
7. Wylogowanie → ponowne wejście na `/admin` pokazuje formularz logowania.

- [ ] **Step 6: Commit**

```bash
git add package.json README.md
git commit -m "chore: add deploy script and README"
```

---

## Definicja ukończenia planu 3

- [ ] `npm test` — wszystkie testy zielone
- [ ] `npx tsc --noEmit` — brak błędów typów
- [ ] Gra działa pod adresem Firebase Hosting
- [ ] Panel `/admin` wymaga logowania; niezalogowany użytkownik nie zapisze zmian
- [ ] Reguły Firestore wdrożone; Playground potwierdza odrzucenie zapisu bez uwierzytelnienia
- [ ] Zmiana karty w panelu jest widoczna w grze po odświeżeniu
- [ ] Wyłączenie sieci nie blokuje rozgrywki (komunikat „tryb offline")
- [ ] Hasło administracyjne nie występuje w repozytorium (weryfikacja: `git grep -i "ETER11ADMIN"` — brak wyników)
