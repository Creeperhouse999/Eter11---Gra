/**
 * Dopisuje wpis do Pamięci zespołu (kolekcja `memory`, zakładka „Pamięć"
 * w panelu) albo wypisuje istniejące.
 *
 *   node scripts/memory.mjs --list
 *   node scripts/memory.mjs "Jedno zdanie, które ma pamiętać cały zespół."
 *
 * Po co osobny skrypt: Alan poprosił, żebym dopisywał tam ustalenia na
 * bieżąco, bez proszenia — a jedyną drogą był panel w przeglądarce, którego
 * w pętli nie otwieram. Reguły Firestore wpuszczają dokładnie cztery pola
 * i limit 300 znaków; skrypt pilnuje tego PRZED wysłaniem, żeby odmowa nie
 * przychodziła jako ogólne „permission denied".
 *
 * Hasło NIGDY w kodzie — bierzemy je z .env (poza gitem) albo z process.env
 * (CI), tak samo jak w mark-report.mjs.
 */
import { readFileSync } from 'node:fs';

const API_KEY = 'AIzaSyAaA1OJrJSjmDU7RPo6KXv0HhzVG9OI1X0';
const PROJECT = 'savetheworld-eter11';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const MAX = 300;

function loadEnv() {
  try {
    const text = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
    const env = {};
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return env;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env };
const EMAIL = env.BOT_EMAIL ?? env.ADMIN_EMAIL;
const PASSWORD = env.BOT_PASSWORD ?? env.ADMIN_PASSWORD;

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
  if (!res.ok) throw new Error(`Logowanie: ${data.error?.message ?? res.status}`);
  return { token: data.idToken, uid: data.localId, name: data.displayName || 'Claude' };
}

async function list() {
  // Odczyt Pamięci wymaga konta z prawem edycji (reguła `mozeEdytowac`):
  // to notatki o zespole, nie treść gry. Bez logowania baza zwraca pustą
  // listę, co wygląda jak „nikt nic nie zapisał" — a to nieprawda.
  if (!EMAIL || !PASSWORD) throw new Error('Brak BOT_EMAIL / BOT_PASSWORD w .env.');
  const me = await signIn();
  const res = await fetch(`${BASE}/memory?key=${API_KEY}&pageSize=200`, {
    headers: { Authorization: `Bearer ${me.token}` },
  });
  const data = await res.json();
  const docs = (data.documents ?? [])
    .map((d) => ({
      text: d.fields?.text?.stringValue ?? '',
      author: d.fields?.author?.stringValue ?? '',
      at: d.fields?.createdAt?.stringValue ?? '',
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
  for (const d of docs) console.log(`[${d.at.slice(0, 10)} ${d.author}] ${d.text}`);
  console.log(`\nWpisów: ${docs.length}`);
}

async function add(text) {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Pusty wpis.');
  if (clean.length > MAX) {
    throw new Error(`Wpis ma ${clean.length} znaków, limit to ${MAX}. Skróć — to ma być jedno zdanie.`);
  }
  if (!EMAIL || !PASSWORD) throw new Error('Brak BOT_EMAIL / BOT_PASSWORD w .env.');

  const me = await signIn();
  const res = await fetch(`${BASE}/memory?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${me.token}` },
    body: JSON.stringify({
      fields: {
        text: { stringValue: clean },
        author: { stringValue: me.name },
        authorUid: { stringValue: me.uid },
        createdAt: { stringValue: new Date().toISOString() },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zapis odrzucony (${res.status}): ${err.slice(0, 200)}`);
  }
  console.log(`✓ Dopisano do Pamięci: ${clean}`);
}

const [arg, ...rest] = process.argv.slice(2);
try {
  if (!arg || arg === '--help') {
    console.log('Użycie: node scripts/memory.mjs --list | "<jedno zdanie>"');
  } else if (arg === '--list') {
    await list();
  } else {
    await add([arg, ...rest].join(' '));
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
