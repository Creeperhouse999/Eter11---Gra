/**
 * Sprawdza, czy któryś ekran nie wypycha strony w bok na wąskim telefonie.
 *
 * Zrzuty z przeglądarki bez trybu urządzenia potrafią kłamać: renderują
 * w stałej szerokości i wszystko wygląda na ucięte, choć na prawdziwym
 * telefonie jest dobrze. Dlatego zamiast patrzeć na obrazek — MIERZYMY:
 * ustawiamy prawdziwy widok telefonu przez protokół debugowania i pytamy
 * stronę, czy jej szerokość przewijania przekracza szerokość okna.
 *
 * Użycie (serwer deweloperski musi już działać):
 *   node scripts/check-overflow.mjs http://localhost:5199
 */
const base = process.argv[2] ?? 'http://localhost:5199';
const WIDTHS = [320, 390, 414];

const chrome =
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

import { spawn } from 'node:child_process';

const port = 9333;
const proc = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function endpoint() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const json = await res.json();
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch {
      // przeglądarka jeszcze wstaje
    }
    await sleep(250);
  }
  throw new Error('Przeglądarka nie wystartowała.');
}

const ws = await endpoint();
const { WebSocket } = await import('ws').catch(() => ({ WebSocket: globalThis.WebSocket }));
const socket = new WebSocket(ws);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

let nextId = 1;
const pending = new Map();
socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  const waiter = pending.get(msg.id);
  if (waiter) {
    pending.delete(msg.id);
    waiter(msg.result);
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

let problems = 0;
for (const width of WIDTHS) {
  await send(
    'Emulation.setDeviceMetricsOverride',
    { width, height: 844, deviceScaleFactor: 2, mobile: true },
    sessionId,
  );
  await send('Page.navigate', { url: base }, sessionId);
  await sleep(2500);

  const { result } = await send(
    'Runtime.evaluate',
    {
      expression: `JSON.stringify({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
        winiec: [...document.querySelectorAll('*')]
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 5)
          .map((el) => el.tagName + '.' + String(el.className).slice(0, 60)),
      })`,
      returnByValue: true,
    },
    sessionId,
  );
  const data = JSON.parse(result.value);
  const overflow = data.scroll - data.client;
  const ok = overflow <= 1;
  console.log(
    `${width}px: ${ok ? 'OK' : `WYCHODZI POZA EKRAN o ${overflow}px`} ` +
      `(scroll ${data.scroll}, okno ${data.client})`,
  );
  if (!ok) {
    problems += 1;
    data.winiec.forEach((el) => console.log(`    ${el}`));
  }
}

socket.close();
proc.kill();
process.exit(problems > 0 ? 1 : 0);
