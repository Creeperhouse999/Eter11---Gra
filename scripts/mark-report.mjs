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

/**
 * Do porównania: małe litery, a wszystkie odmiany białych znaków (spacja
 * nierozdzielająca ` ` z panelu, tabulator, wielokrotna spacja) jako
 * pojedyncza zwykła spacja.
 *
 * Zgłoszenie z prawdziwym tytułem „…wybiera się ta sama postać" (NBSP
 * między słowami — tak zapisał je panel) nie dawało się oznaczyć fragmentem
 * ze zwykłą spacją w tym samym miejscu: `.includes()` porównuje bajt po
 * bajcie, więc `  !== ' '` mimo identycznego wyglądu na ekranie.
 * Commit z trailerem `Report-Fixed:` przechodził przez Actions bez błędu
 * (skrypt tylko OSTRZEGA), a zgłoszenie zostawało błędnie „reopened" mimo
 * wdrożonej naprawy.
 */
const normalizuj = (tekst) => tekst.toLowerCase().replace(/\s+/g, ' ').trim();

const reports = await listReports();
const needle = normalizuj(query);
const matches = reports.filter((d) => normalizuj(field(d, 'title')).includes(needle));

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

/**
 * Powiadomienie dla zgłaszającego.
 *
 * Alan zgłosił: „napraw, aby każde działanie, które wykonałeś, pojawiało się
 * w powiadomieniach". Panel wysyłał je przy zmianie statusu, ten skrypt nie —
 * a naprawy z chmury idą właśnie skryptem, więc zgłaszający dowiadywał się
 * o nich tylko wtedy, gdy sam zajrzał na listę.
 *
 * Link prowadzi wprost do zgłoszenia (`?open=<id>`), tak jak prosił Alan:
 * „abym mógł klikać w powiadomienie i aby to kierowało mnie do danego
 * miejsca, którego dotyczy powiadomienie".
 */
async function powiadomZglaszajacego() {
  const autor = field(doc, 'author').trim();
  if (!autor) return;

  // Zgłoszenia pamiętają podpis („Adam"), nie konto — konta szukamy po imieniu
  // albo po adresie e-mail, tak samo jak robi to panel (`uidsForAuthor`).
  const rolesRes = await fetch(`${BASE}/roles?key=${API_KEY}&pageSize=100`);
  const rolesData = await rolesRes.json();
  const szukane = autor.toLowerCase();

  const uids = (rolesData.documents ?? [])
    .filter((r) => {
      const f = r.fields ?? {};
      const imie = (f.name?.stringValue ?? '').trim().toLowerCase();
      const mail = (f.email?.stringValue ?? '').trim().toLowerCase();
      return imie === szukane || mail === szukane || mail.split('@')[0] === szukane;
    })
    .map((r) => r.name.split('/').pop());

  if (uids.length === 0) {
    console.log(`  (bez powiadomienia — nie znalazłem konta dla „${autor}")`);
    return;
  }

  // Reguły bazy dopuszczają tylko cztery rodzaje powiadomień, a z tego dwa
  // dotyczą zgłoszeń. Komentarz bez zmiany statusu (`new`) jedzie jako
  // `report-fixed`, bo to ten sam dzwonek „jest coś nowego przy Twoim
  // zgłoszeniu" — poszerzanie listy w regułach byłoby luzowaniem uprawnień
  // dla samej etykiety.
  const TYTULY = {
    fixed: `Twoje zgłoszenie czeka na sprawdzenie: „${field(doc, 'title')}"`,
    dismissed: `Twoje zgłoszenie zostało odrzucone: „${field(doc, 'title')}"`,
    new: `Nowa wiadomość w zgłoszeniu: „${field(doc, 'title')}"`,
    reopened: `Zgłoszenie wróciło do poprawki: „${field(doc, 'title')}"`,
  };
  const tytul = TYTULY[status];
  if (!tytul) return;

  const RODZAJE = {
    fixed: 'report-fixed',
    dismissed: 'report-dismissed',
    new: 'report-fixed',
    reopened: 'report-fixed',
  };

  const createdAt = new Date().toISOString();
  let wyslane = 0;

  for (const uid of uids) {
    const res = await fetch(`${BASE}/notifications?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fields: {
          uid: { stringValue: uid },
          kind: { stringValue: RODZAJE[status] },
          title: { stringValue: tytul },
          ...(comment ? { body: { stringValue: comment.slice(0, 300) } } : {}),
          from: { stringValue: 'Claude' },
          link: { stringValue: `/admin/reports/${status}?open=${id}` },
          createdAt: { stringValue: createdAt },
          read: { booleanValue: false },
        },
      }),
    });
    if (res.ok) wyslane += 1;
    else console.log(`  (powiadomienie odrzucone: ${(await res.json()).error?.message})`);
  }

  if (wyslane > 0) console.log(`  → powiadomiono ${autor}`);
}

// Nieudane powiadomienie nie może wywrócić oznaczenia: status jest już
// zapisany, a to tylko dzwonek. Inaczej CI świeciłby na czerwono po udanej
// naprawie.
try {
  await powiadomZglaszajacego();
} catch (error) {
  console.log(`  (powiadomienie się nie udało: ${error.message})`);
}
