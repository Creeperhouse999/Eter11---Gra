/**
 * Ustawia postęp prac na zgłoszeniu — „W kolejce", „Robi się", „Sprawdzam",
 * „Zrobione" albo czyści.
 *
 * Po co osobny skrypt: postęp widać w panelu, ale agent (ja albo ten
 * w chmurze) pracuje z wiersza poleceń i też musi umieć pokazać zespołowi,
 * że zgłoszenie zostało zauważone. Bez tego „nikt tego nie tknął" i „siedzę
 * przy tym od godziny" wyglądają dla zgłaszającego identycznie.
 *
 * NIE rusza pola `status` — to osobna rzecz i należy do zgłaszającego
 * (`done` stawia wyłącznie on).
 *
 * Użycie:
 *   node scripts/set-progress.mjs --list
 *   node scripts/set-progress.mjs "<fragment tytułu>" queued|working|testing|finished|none
 *   node scripts/set-progress.mjs --all-open queued
 */
import { readFileSync } from 'node:fs';

const API_KEY = 'AIzaSyAaA1OJrJSjmDU7RPo6KXv0HhzVG9OI1X0';
const BASE =
  'https://firestore.googleapis.com/v1/projects/savetheworld-eter11/databases/(default)/documents';

const POSTEPY = ['queued', 'working', 'testing', 'finished'];
const ETYKIETY = {
  queued: 'W kolejce',
  working: 'Robi się',
  testing: 'Sprawdzam',
  finished: 'Zrobione',
};

/** Statusy, przy których zgłoszenie czeka na robotę. */
const OTWARTE = ['new', 'reopened'];

function env(nazwa) {
  if (process.env[nazwa]) return process.env[nazwa];
  try {
    const plik = readFileSync('.env', 'utf8');
    return (plik.match(new RegExp(`^${nazwa}=(.*)$`, 'm'))?.[1] ?? '').trim().replace(/["\r]/g, '');
  } catch {
    return '';
  }
}

async function signIn() {
  const email = env('BOT_EMAIL');
  const password = env('BOT_PASSWORD');
  if (!email || !password) {
    console.error('Brak BOT_EMAIL / BOT_PASSWORD — nie ma czym się zalogować.');
    process.exit(1);
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (!data.idToken) {
    console.error(`Logowanie nie powiodło się: ${data.error?.message ?? 'nieznany błąd'}`);
    process.exit(1);
  }
  return data.idToken;
}

async function zgloszenia() {
  const res = await fetch(`${BASE}/reports?key=${API_KEY}&pageSize=300`);
  const data = await res.json();
  if (data.error) {
    console.error(`Nie udało się pobrać zgłoszeń: ${data.error.message}`);
    process.exit(1);
  }
  return (data.documents ?? []).map((doc) => ({
    id: doc.name.split('/').pop(),
    title: doc.fields?.title?.stringValue ?? '',
    status: doc.fields?.status?.stringValue ?? '',
    priority: doc.fields?.priority?.stringValue ?? 'medium',
    progress: doc.fields?.progress?.stringValue ?? '',
  }));
}

async function ustaw(token, report, postep) {
  // `updateMask` jest tu konieczny: PATCH bez niego nadpisuje CAŁY dokument,
  // czyli skasowałby tytuł, opis i notatki. Reguły odrzuciłyby taki zapis,
  // ale nawet gdyby przeszedł, zgłoszenie zostałoby puste.
  const maska = 'updateMask.fieldPaths=progress&updateMask.fieldPaths=progressAt';
  const fields = postep
    ? {
        progress: { stringValue: postep },
        progressAt: { stringValue: new Date().toISOString() },
      }
    : { progress: { nullValue: null }, progressAt: { nullValue: null } };

  const res = await fetch(`${BASE}/reports/${report.id}?key=${API_KEY}&${maska}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (data.error) {
    console.error(`  ✗ ${report.title}: ${data.error.message}`);
    return false;
  }
  console.log(`  ✓ ${report.title} → ${postep ? ETYKIETY[postep] : 'wyczyszczone'}`);
  return true;
}

const [arg1, arg2] = process.argv.slice(2);

if (!arg1 || arg1 === '--help') {
  console.log('Użycie:');
  console.log('  node scripts/set-progress.mjs --list');
  console.log('  node scripts/set-progress.mjs "<fragment tytułu>" queued|working|testing|finished|none');
  console.log('  node scripts/set-progress.mjs --all-open queued');
  process.exit(0);
}

const lista = await zgloszenia();

if (arg1 === '--list') {
  for (const r of lista.filter((x) => OTWARTE.includes(x.status))) {
    const etykieta = r.progress ? ETYKIETY[r.progress] ?? r.progress : '—';
    console.log(`[${r.priority.padEnd(6)}] ${r.status.padEnd(8)} ${etykieta.padEnd(10)} ${r.title}`);
  }
  process.exit(0);
}

const postep = arg1 === '--all-open' ? arg2 : arg2;
if (postep !== 'none' && !POSTEPY.includes(postep)) {
  console.error(`Nieznany postęp „${postep}". Dozwolone: ${POSTEPY.join(', ')}, none.`);
  process.exit(1);
}
const wartosc = postep === 'none' ? null : postep;

const token = await signIn();

if (arg1 === '--all-open') {
  const otwarte = lista.filter((r) => OTWARTE.includes(r.status));
  console.log(`Ustawiam „${wartosc ? ETYKIETY[wartosc] : 'brak'}" na ${otwarte.length} zgłoszeniach:`);
  let ok = 0;
  for (const r of otwarte) {
    // Po kolei, nie równolegle: przy kilkunastu naraz Firestore potrafi
    // odrzucić część zapisów, a wtedy nie widać, które przeszły.
    if (await ustaw(token, r, wartosc)) ok += 1;
  }
  console.log(`Gotowe: ${ok}/${otwarte.length}.`);
  process.exit(ok === otwarte.length ? 0 : 1);
}

const pasujace = lista.filter((r) => r.title.toLowerCase().includes(arg1.toLowerCase()));
if (pasujace.length === 0) {
  console.error(`Żadne zgłoszenie nie pasuje do „${arg1}".`);
  process.exit(1);
}
if (pasujace.length > 1) {
  console.error(`Fragment „${arg1}" pasuje do ${pasujace.length} zgłoszeń — doprecyzuj:`);
  for (const r of pasujace) console.error(`  • ${r.title}`);
  process.exit(1);
}

await ustaw(token, pasujace[0], wartosc);
