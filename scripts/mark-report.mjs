/**
 * Zmiana statusu zgłoszenia z terminala.
 *
 * Reguły Firestore wpuszczają zapis statusu tylko zalogowanym. Skrypt loguje
 * się kontem redakcyjnym przez REST Auth (to samo, co robi panel), dostaje
 * token i nim aktualizuje dokument — bez omijania reguł, jak zwykły użytkownik.
 *
 * Hasło NIGDY w kodzie: bierzemy je z .env (poza gitem). Bez hasła skrypt
 * wypisuje, co trzeba ustawić, i kończy.
 *
 * Użycie:
 *   node scripts/mark-report.mjs <fragment-tytułu> [pending|new|fixed|reopened|dismissed|done]
 *   node scripts/mark-report.mjs --list
 */
import { readFileSync } from 'node:fs';

const API_KEY = 'AIzaSyAaA1OJrJSjmDU7RPo6KXv0HhzVG9OI1X0';
const PROJECT = 'savetheworld-eter11';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/** Wczytuje .env ręcznie — bez zależności, tylko KLUCZ=wartość. */
function loadEnv() {
  try {
    const text = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
    const env = {};
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return env;
  } catch {
    return {};
  }
}

// Zmienne środowiskowe procesu mają pierwszeństwo przed .env — dzięki temu
// skrypt działa i lokalnie (z .env), i w CI (GitHub Actions podaje sekrety
// przez process.env, bez pliku .env w repo).
const env = { ...loadEnv(), ...process.env };
// Logujemy się kontem programisty (`claude@code.com`, rola programmer), żeby
// odpowiedzi w zgłoszeniach były podpisane jako programista. Gdy go nie ma,
// spadamy na konto admina.
const EMAIL = env.BOT_EMAIL ?? env.ADMIN_EMAIL;
const PASSWORD = env.BOT_PASSWORD ?? env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Brak ADMIN_EMAIL / ADMIN_PASSWORD w pliku .env.');
  console.error('Utwórz .env w katalogu projektu (jest w .gitignore):');
  console.error('  ADMIN_EMAIL=info@eter11.pl');
  console.error('  ADMIN_PASSWORD=...');
  process.exit(1);
}

/** Loguje się i zwraca token dostępu. */
async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (data.error) throw new Error(`Logowanie nieudane: ${data.error.message}`);
  return data.idToken;
}

const field = (doc, name) =>
  doc.fields?.[name]?.stringValue ?? doc.fields?.[name]?.timestampValue ?? '';

async function listReports() {
  const res = await fetch(`${BASE}/reports?key=${API_KEY}&pageSize=100`);
  const data = await res.json();
  return (data.documents ?? []).sort((a, b) =>
    field(b, 'createdAt').localeCompare(field(a, 'createdAt')),
  );
}

const [, , query, status = 'fixed', comment] = process.argv;

if (query === '--list' || !query) {
  const reports = await listReports();
  console.log(`Zgłoszeń: ${reports.length}\n`);
  for (const doc of reports) {
    console.log(`[${field(doc, 'status').padEnd(8)}] ${field(doc, 'title')}`);
  }
  if (!query) {
    console.log('\nUżycie: node scripts/mark-report.mjs "<fragment tytułu>" [pending|new|fixed|reopened|dismissed|done]');
  }
  process.exit(0);
}

const VALID = ['pending', 'new', 'fixed', 'reopened', 'dismissed', 'done'];
if (!VALID.includes(status)) {
  console.error(`Nieznany status: ${status}. Dozwolone: ${VALID.join(', ')}.`);
  process.exit(1);
}

const reports = await listReports();
const needle = query.toLowerCase();
const matches = reports.filter((d) => field(d, 'title').toLowerCase().includes(needle));

if (matches.length === 0) {
  console.error(`Nie znaleziono zgłoszenia z tytułem zawierającym "${query}".`);
  process.exit(1);
}
if (matches.length > 1) {
  console.error(`Wiele pasujących zgłoszeń — doprecyzuj tytuł:`);
  for (const doc of matches) console.error(`  - ${field(doc, 'title')}`);
  process.exit(1);
}

const doc = matches[0];
const id = doc.name.split('/').pop();
const token = await signIn();

/** Notatki z bazy — żeby dopisać do rozmowy, a nie ją nadpisać. */
function readNotes(source) {
  const values = source.fields?.notes?.arrayValue?.values ?? [];
  return values.map((v) => {
    const f = v.mapValue?.fields ?? {};
    return {
      from: f.from?.stringValue ?? 'dev',
      text: f.text?.stringValue ?? '',
      at: f.at?.stringValue ?? '',
    };
  });
}

const fields = { status: { stringValue: status } };
const paths = ['status'];

if (comment) {
  // Programista odpowiada — dopisujemy notatkę „dev" do rozmowy.
  const notes = readNotes(doc);
  notes.push({ from: 'dev', text: comment, at: new Date().toISOString() });
  fields.notes = {
    arrayValue: {
      values: notes.map((n) => ({
        mapValue: {
          fields: {
            from: { stringValue: n.from },
            text: { stringValue: n.text },
            at: { stringValue: n.at },
          },
        },
      })),
    },
  };
  paths.push('notes');
}

const mask = paths.map((p) => `updateMask.fieldPaths=${p}`).join('&');
const res = await fetch(`${BASE}/reports/${id}?key=${API_KEY}&${mask}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ fields }),
});
const result = await res.json();
if (result.error) {
  console.error(`Nie udało się zmienić statusu: ${result.error.message}`);
  process.exit(1);
}
console.log(`✓ "${field(doc, 'title')}" → ${status}${comment ? ' (+ komentarz)' : ''}`);
