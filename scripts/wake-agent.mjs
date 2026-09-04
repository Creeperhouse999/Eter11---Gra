/**
 * Budzi agenta w chmurze, gdy pojawi się nowe zgłoszenie albo wpis w dyskusji.
 *
 * Po co: routine w Claude Cloud chodziła z zegara raz na dobę (o 2:00 w nocy),
 * więc zgłoszenie wysłane rano czekało na obsługę kilkanaście godzin. Alan
 * poprosił, żeby agent ruszał od razu.
 *
 * Czemu tędy, a nie z Firestore: baza sama nikogo nie zawoła — zrobiłyby to
 * Cloud Functions, których w tym projekcie świadomie nie używamy. Panel w
 * przeglądarce też nie może, bo musiałby nosić token do konta Claude, a ten
 * da się wyjąć z narzędzi deweloperskich. GitHub Actions ma sekrety
 * bezpiecznie i i tak już odpytuje Firestore co kilka minut, więc to on
 * pilnuje i woła.
 *
 * Jak rozpoznaje „nowe": pamięta w gałęzi `agent-state` identyfikatory już
 * widziane. Bez tej pamięci każdy przebieg budziłby agenta od nowa na te same
 * zgłoszenia. Porównujemy identyfikatory, nie liczbę wpisów — skasowanie
 * jednego i dodanie drugiego daje tę samą liczbę, a jest zmianą.
 *
 * Wymaga: `CLAUDE_CODE_TOKEN` (sekret repozytorium), `VITE_FIREBASE_API_KEY`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const PROJECT = 'savetheworld-eter11';
const TRIGGER = process.env.CLAUDE_TRIGGER_ID ?? 'trig_0116hs38Lz5rxNhGwrz2oGQc';
const STATE_FILE = process.env.STATE_FILE ?? 'agent-state.json';

// Publiczny klucz web Firebase — ten sam, co w `mark-report.mjs` i w kodzie
// gry. Nie jest sekretem: chroni nas nie on, tylko reguły bazy.
const apiKey = 'AIzaSyAaA1OJrJSjmDU7RPo6KXv0HhzVG9OI1X0';
const token = process.env.CLAUDE_CODE_TOKEN;

/** Pobiera dokumenty kolekcji (odczyt publiczny, REST). */
async function pobierz(collection) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)` +
    `/documents/${collection}?key=${apiKey}&pageSize=300`;

  const response = await fetch(url);
  if (!response.ok) {
    // Błąd odczytu nie może wyglądać jak „nic nowego": pusta lista
    // zapisałaby się jako stan i przy następnym przebiegu wszystkie
    // zgłoszenia wyglądałyby na nowe, budząc agenta bez powodu.
    throw new Error(`Nie udało się odczytać ${collection}: ${response.status}`);
  }

  const data = await response.json();
  return data.documents ?? [];
}

/**
 * Odciski wątków dyskusji: identyfikator PLUS liczba wiadomości.
 *
 * Sam identyfikator wystarcza tylko na nowe wątki, a odpowiedź w dyskusji to
 * nowa wiadomość w wątku, który już istnieje — po samych identyfikatorach
 * wyglądałaby na „nic nowego" i agent nigdy by się nie obudził. Wiadomości
 * leżą w tablicy `messages` wewnątrz dokumentu wątku, więc jej długość mówi,
 * czy ktoś dopisał.
 */
async function odciskiWatkow() {
  return (await pobierz('discussions')).map((doc) => {
    const ile = doc.fields?.messages?.arrayValue?.values?.length ?? 0;
    return `${doc.name.split('/').pop()}:${ile}`;
  });
}

/**
 * Zgłoszenia czekające na obsługę. Zamknięte pomijamy — inaczej agent budziłby
 * się od tego, że ktoś potwierdził „działa".
 */
async function otwarteZgloszenia() {
  const zamkniete = ['done', 'fixed', 'dismissed'];

  return (await pobierz('reports'))
    .filter((doc) => !zamkniete.includes(doc.fields?.status?.stringValue ?? ''))
    // Liczba notatek w odcisku: dopisanie komentarza pod zgłoszeniem („dalej
    // nie działa", odpowiedź zgłaszającego) to też coś, na co agent ma
    // zareagować, a samo id się przy tym nie zmienia.
    .map((doc) => {
      const ile = doc.fields?.notes?.arrayValue?.values?.length ?? 0;
      return `${doc.name.split('/').pop()}:${ile}`;
    });
}

/**
 * Poprzedni stan, o ile jest się czego uchwycić.
 *
 * Plik bywa PUSTY, nie tylko nieobecny: workflow tworzy go przekierowaniem
 * (`git show … > agent-state.json`), a gdy gałęzi stanu jeszcze nie ma,
 * zostaje zerobajtowy plik. Samo `existsSync` uznawało to za „mam stan",
 * po czym `JSON.parse('')` wywracało cały przebieg. Uszkodzoną treść
 * traktujemy tak samo — lepiej zacząć od zera niż paść.
 */
function wczytajStan() {
  if (!existsSync(STATE_FILE)) return null;
  const tresc = readFileSync(STATE_FILE, 'utf8').trim();
  if (!tresc) return null;
  try {
    const dane = JSON.parse(tresc);
    return {
      reports: Array.isArray(dane.reports) ? dane.reports : [],
      discussions: Array.isArray(dane.discussions) ? dane.discussions : [],
    };
  } catch {
    console.warn('Zapisany stan jest uszkodzony — zaczynam od nowa.');
    return null;
  }
}

const zapisany = wczytajStan();
// Brak stanu = pierwszy przebieg. Sprawdzamy PRZED zapisem: po nim plik już
// istnieje i pytanie o niego zawsze odpowiadałoby „nie pierwszy".
const pierwszyPrzebieg = zapisany === null;
const poprzedni = zapisany ?? { reports: [], discussions: [] };

const teraz = {
  reports: await otwarteZgloszenia(),
  // Dyskusje agent sprawdza przy każdej pobudce — Alan chce, żeby odpisywał
  // na wątki, nie tylko naprawiał zgłoszenia.
  discussions: await odciskiWatkow(),
};

const nowe = (klucz) => {
  const znane = new Set(poprzedni[klucz] ?? []);
  return teraz[klucz].filter((id) => !znane.has(id));
};

const noweZgloszenia = nowe('reports');
const noweDyskusje = nowe('discussions');

console.log(
  `Zgłoszenia otwarte: ${teraz.reports.length} (nowych: ${noweZgloszenia.length}), ` +
    `wątki: ${teraz.discussions.length} (nowych: ${noweDyskusje.length})`,
);

// Stan zapisujemy ZAWSZE, także gdy budzimy agenta — inaczej kolejny przebieg
// (za 5 minut, gdy agent jeszcze pracuje) obudziłby go drugi raz na to samo.
writeFileSync(STATE_FILE, `${JSON.stringify(teraz, null, 2)}\n`);

// Pierwszy przebieg: nie ma z czym porównać, więc wszystko wygląda na nowe.
// Zapisujemy stan i wychodzimy, zamiast budzić agenta na całą historię.
if (pierwszyPrzebieg) {
  console.log('Pierwszy przebieg — zapisuję stan bez budzenia.');
  process.exit(0);
}

if (noweZgloszenia.length === 0 && noweDyskusje.length === 0) {
  console.log('Nic nowego — agent śpi dalej.');
  process.exit(0);
}

if (!token) {
  console.error('Jest co robić, ale brak CLAUDE_CODE_TOKEN — nie ma czym obudzić agenta.');
  process.exit(1);
}

const response = await fetch(`https://api.anthropic.com/v1/code/triggers/${TRIGGER}/run`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'anthropic-beta': 'code-triggers-2025-04-01',
  },
  body: JSON.stringify({}),
});

if (!response.ok) {
  const tresc = await response.text();
  console.error(`Nie udało się obudzić agenta (${response.status}): ${tresc.slice(0, 400)}`);
  process.exit(1);
}

console.log('Agent obudzony.');
