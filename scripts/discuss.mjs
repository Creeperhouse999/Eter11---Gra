/**
 * Dyskusje zespołu z terminala — zakładanie wątków i odpowiadanie.
 *
 * Odpowiednik `mark-report.mjs`, tylko dla kolekcji `discussions`. Loguje się
 * kontem redakcyjnym przez REST Auth (to samo, co robi panel), więc pod
 * wypowiedzią stoi prawdziwe imię z konta — reguły Firestore i tak wpuszczają
 * zapis tylko zalogowanemu członkowi zespołu.
 *
 * Wątek jest append-only: reguły pozwalają wyłącznie DOPISAĆ jedną wypowiedź
 * na końcu (`messages[0:n] == stare`), nigdy podmienić cudzej. Skrypt trzyma
 * się tego samego — czyta wątek, dokłada jedną wypowiedź, zapisuje.
 *
 * Użycie:
 *   node scripts/discuss.mjs --list
 *   node scripts/discuss.mjs new "<tytuł>" "<treść pierwszej wypowiedzi>"
 *   node scripts/discuss.mjs reply "<fragment tytułu>" "<treść odpowiedzi>"
 */
import { readFileSync } from 'node:fs';

const API_KEY = 'AIzaSyAaA1OJrJSjmDU7RPo6KXv0HhzVG9OI1X0';
const PROJECT = 'savetheworld-eter11';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/** Podpis pod wypowiedziami — rola programisty w tym zespole nazywa się Claude. */
const AUTHOR = 'Claude';

/** Znacznik czasu tej operacji — jeden dla wpisu i powiadomień o nim. */
const now = new Date().toISOString();

/**
 * Powiadamia tych, którzy w wątku już zabrali głos.
 *
 * Panel robi to przy każdej odpowiedzi, a ten skrypt do tej pory NIE — więc
 * gdy pisałem z terminala, nikt się o tym nie dowiadywał. Alan zauważył to po
 * pustym dzwonku mimo pięciu moich wypowiedzi w wątkach tego samego dnia.
 *
 * Kogo powiadamiamy: założyciela wątku i wszystkich, którzy w nim odpisali —
 * ale nie tego, kto właśnie pisze. To nie ogłoszenie dla całego zespołu, tylko
 * ciąg dalszy CZYJEJŚ rozmowy.
 *
 * Podpisy w wątkach to imiona, nie konta, więc most robimy tak samo jak panel:
 * po imieniu z wpisu roli, po adresie i po jego części przed małpą.
 */
async function powiadomUczestnikow(token, { tytul, id, poprzednieWypowiedzi, zalozyciel, tresc }) {
  const zainteresowani = new Set(
    [zalozyciel, ...poprzednieWypowiedzi.map((m) => m.author)].filter(Boolean),
  );
  zainteresowani.delete(AUTHOR);
  if (zainteresowani.size === 0) return;

  const res = await fetch(`${BASE}/roles?key=${API_KEY}&pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dane = await res.json();
  if (dane.error) return; // Powiadomienie to dodatek — brak listy nie psuje wpisu.

  const zespol = (dane.documents ?? []).map((doc) => ({
    uid: doc.name.split('/').pop(),
    email: doc.fields?.email?.stringValue ?? '',
    name: doc.fields?.name?.stringValue ?? '',
  }));

  const uidy = new Set();
  for (const podpis of zainteresowani) {
    const szukany = podpis.trim().toLowerCase();
    for (const osoba of zespol) {
      const email = osoba.email.trim().toLowerCase();
      if (
        osoba.name.trim().toLowerCase() === szukany ||
        email === szukany ||
        email.split('@')[0] === szukany
      ) {
        uidy.add(osoba.uid);
      }
    }
  }

  for (const uid of uidy) {
    await fetch(`${BASE}/notifications?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fields: {
          uid: { stringValue: uid },
          kind: { stringValue: 'discussion-reply' },
          title: { stringValue: `${AUTHOR} odpisał(a) w wątku „${tytul}"` },
          body: { stringValue: tresc.trim().slice(0, 140) },
          from: { stringValue: AUTHOR },
          link: { stringValue: `/admin/discussions?open=${id}` },
          createdAt: { stringValue: now },
          read: { booleanValue: false },
        },
      }),
    }).catch(() => {});
  }
}

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
// skrypt działa i lokalnie, i w CI (sekrety przez process.env).
const env = { ...loadEnv(), ...process.env };
const EMAIL = env.BOT_EMAIL ?? env.ADMIN_EMAIL;
const PASSWORD = env.BOT_PASSWORD ?? env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Brak BOT_EMAIL / BOT_PASSWORD (albo ADMIN_*) w .env.');
  process.exit(1);
}

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
  // Reguły wymagają, by nowa wypowiedź miała `authorUid` równy piszącemu
  // (inaczej dałoby się podszyć pod kogoś innego), więc uid jest tu
  // potrzebny tak samo jak token.
  MOJE_UID = data.localId;
  return data.idToken;
}

/** Uid zalogowanego konta — wypełnia `signIn`. */
let MOJE_UID = '';

const field = (doc, name) =>
  doc.fields?.[name]?.stringValue ?? doc.fields?.[name]?.timestampValue ?? '';

/** Wypowiedzi wątku w postaci zwykłych obiektów. */
function readMessages(doc) {
  const values = doc.fields?.messages?.arrayValue?.values ?? [];
  return values.map((v) => {
    const f = v.mapValue?.fields ?? {};
    return {
      author: f.author?.stringValue ?? '',
      text: f.text?.stringValue ?? '',
      at: f.at?.stringValue ?? '',
      // `authorUid` MUSI przetrwać odczyt i ponowny zapis. Reguły wymagają,
      // by wcześniejsze wypowiedzi wróciły identyczne — zgubienie tego pola
      // po drodze zmienia historię i cały zapis leci z „Missing or
      // insufficient permissions", nawet gdy dopisujemy tylko na końcu.
      ...(f.authorUid?.stringValue ? { authorUid: f.authorUid.stringValue } : {}),
      ...(f.image?.stringValue ? { image: f.image.stringValue } : {}),
    };
  });
}

/** Wypowiedzi z powrotem do formatu Firestore REST. */
function writeMessages(messages) {
  return {
    arrayValue: {
      values: messages.map((m) => ({
        mapValue: {
          fields: {
            author: { stringValue: m.author },
            text: { stringValue: m.text },
            at: { stringValue: m.at },
            // Bez tego pola reguły odrzucają zapis („Missing or insufficient
            // permissions") — to ono, a nie podpis `author`, decyduje o tym,
            // czyja jest wypowiedź i kto może ją później poprawić.
            ...(m.authorUid ? { authorUid: { stringValue: m.authorUid } } : {}),
            ...(m.image ? { image: { stringValue: m.image } } : {}),
          },
        },
      })),
    },
  };
}

async function listDiscussions() {
  const res = await fetch(`${BASE}/discussions?key=${API_KEY}&pageSize=100`);
  const data = await res.json();
  return (data.documents ?? []).sort((a, b) =>
    field(b, 'createdAt').localeCompare(field(a, 'createdAt')),
  );
}

const [, , command, ...rest] = process.argv;

if (!command || command === '--list') {
  const threads = await listDiscussions();
  console.log(`Wątków: ${threads.length}\n`);
  for (const doc of threads) {
    const count = readMessages(doc).length;
    const closed = doc.fields?.closed?.booleanValue ? ' [ustalone]' : '';
    console.log(`[${String(count).padStart(2)} wyp.]${closed} ${field(doc, 'title')}`);
  }
  if (!command) {
    console.log('\nUżycie:');
    console.log('  node scripts/discuss.mjs new "<tytuł>" "<treść>"');
    console.log('  node scripts/discuss.mjs reply "<fragment tytułu>" "<treść>"');
  }
  process.exit(0);
}


if (command === 'new') {
  const [title, description] = rest;
  if (!title || !description) {
    console.error('Użycie: node scripts/discuss.mjs new "<tytuł>" "<treść>"');
    process.exit(1);
  }

  const token = await signIn();
  // Identyfikatorem jest znacznik czasu — jak w historii treści, sortowanie po
  // nazwie dokumentu daje kolejność chronologiczną bez dodatkowego indeksu.
  const id = now;
  const res = await fetch(`${BASE}/discussions/${encodeURIComponent(id)}?key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      fields: {
        title: { stringValue: title },
        description: { stringValue: description },
        author: { stringValue: AUTHOR },
        createdAt: { stringValue: now },
        messages: { arrayValue: { values: [] } },
      },
    }),
  });
  const result = await res.json();
  if (result.error) {
    console.error(`Nie udało się założyć wątku: ${result.error.message}`);
    process.exit(1);
  }
  console.log(`✓ Założono wątek „${title}" (jako ${AUTHOR})`);
  process.exit(0);
}

if (command === 'reply') {
  const [query, text] = rest;
  if (!query || !text) {
    console.error('Użycie: node scripts/discuss.mjs reply "<fragment tytułu>" "<treść>"');
    process.exit(1);
  }

  // Normalizacja białych znaków (NBSP z panelu, wielokrotna spacja) do
  // pojedynczej zwykłej spacji — patrz ten sam zabieg w mark-report.mjs,
  // gdzie brak go kosztował źle oznaczone zgłoszenie mimo poprawnego
  // fragmentu tytułu.
  const normalizuj = (tekst) => tekst.toLowerCase().replace(/\s+/g, ' ').trim();

  const threads = await listDiscussions();
  const needle = normalizuj(query);
  const matches = threads.filter((d) => normalizuj(field(d, 'title')).includes(needle));

  if (matches.length === 0) {
    console.error(`Nie znaleziono wątku z tytułem zawierającym „${query}".`);
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error('Wiele pasujących wątków — doprecyzuj tytuł:');
    for (const doc of matches) console.error(`  - ${field(doc, 'title')}`);
    process.exit(1);
  }

  const doc = matches[0];
  const id = doc.name.split('/').pop();
  const token = await signIn();

  // Dopisujemy JEDNĄ wypowiedź na końcu — reguły odrzucą każdą inną zmianę
  // historii wątku (stare wypowiedzi muszą zostać nietknięte).
  const messages = readMessages(doc);
  messages.push({ author: AUTHOR, text, at: now, authorUid: MOJE_UID });

  const res = await fetch(
    `${BASE}/discussions/${encodeURIComponent(id)}?key=${API_KEY}&updateMask.fieldPaths=messages`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fields: { messages: writeMessages(messages) } }),
    },
  );
  const result = await res.json();
  if (result.error) {
    console.error(`Nie udało się dopisać wypowiedzi: ${result.error.message}`);
    process.exit(1);
  }
  await powiadomUczestnikow(token, {
    tytul: field(doc, 'title'),
    id,
    poprzednieWypowiedzi: messages.slice(0, -1),
    zalozyciel: field(doc, 'author'),
    tresc: text,
  });

  console.log(`✓ Odpowiedziano w „${field(doc, 'title')}" (jako ${AUTHOR})`);
  process.exit(0);
}

console.error(`Nieznane polecenie: ${command}. Dozwolone: --list, new, reply.`);
process.exit(1);
