import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Poprawa/usunięcie WŁASNEJ wypowiedzi w dyskusji sprawdzały tylko wpis pod
 * `editIndex` — nigdy resztę tablicy `messages`. Skutek: piszący, edytując
 * swoją wypowiedź, mógł w TYM SAMYM zapisie (wołając Firestore SDK wprost,
 * z pominięciem `discussions.ts`) podmienić treść, obrazek albo `authorUid`
 * DOWOLNEJ cudzej wypowiedzi w tej samej tablicy — dokładnie to, przed czym
 * `authorUid` miał chronić (patrz komentarz w `discussions.ts`,
 * `canEditMessage`).
 *
 * Wymaga żywego Firestore Emulatora — `npm run test:rules`, nie `npm test`.
 */
let testEnv: RulesTestEnvironment;

const THREAD = 'thread-1';

const baseThread = {
  title: 'Temat',
  description: 'Opis',
  author: 'Alice',
  createdAt: '2026-01-01T00:00:00.000Z',
  closed: false,
  messages: [
    { author: 'Alice', authorUid: 'alice', text: 'Pierwsza wypowiedź Alice', at: 't1' },
    { author: 'Bob', authorUid: 'bob', text: 'Wypowiedź Boba', at: 't2' },
  ],
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'eter11-rules-test',
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
    },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

async function seedThread() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(`discussions/${THREAD}`).set(baseThread);
  });
}

describe('firestore.rules — poprawa własnej wypowiedzi nie rusza cudzych', () => {
  it('Bob NIE poprawi swojej wypowiedzi, jeśli przy okazji podmienia wypowiedź Alice', async () => {
    await seedThread();
    const bob = testEnv.authenticatedContext('bob', { email: 'bob@example.com', firebase: { sign_in_provider: 'password' } });
    await assertFails(
      bob
        .firestore()
        .doc(`discussions/${THREAD}`)
        .update({
          editIndex: 1,
          messages: [
            // index 0 (Alice) po cichu przejęty przez Boba.
            { author: 'Alice', authorUid: 'bob', text: 'PODMIENIONE', at: 't1' },
            { author: 'Bob', authorUid: 'bob', text: 'Wypowiedź Boba (poprawiona)', at: 't2', editedAt: 't3' },
          ],
        }),
    );
  });

  it('Bob WCIĄŻ poprawi tylko swoją wypowiedź, gdy reszta zostaje bez zmian', async () => {
    await seedThread();
    const bob = testEnv.authenticatedContext('bob', { email: 'bob@example.com', firebase: { sign_in_provider: 'password' } });
    await assertSucceeds(
      bob
        .firestore()
        .doc(`discussions/${THREAD}`)
        .update({
          editIndex: 1,
          messages: [
            baseThread.messages[0],
            { author: 'Bob', authorUid: 'bob', text: 'Wypowiedź Boba (poprawiona)', at: 't2', editedAt: 't3' },
          ],
        }),
    );
  });
});

describe('firestore.rules — usunięcie własnej wypowiedzi nie rusza cudzych', () => {
  it('Bob NIE usunie swojej wypowiedzi, jeśli przy okazji podmienia wypowiedź Alice', async () => {
    await seedThread();
    const bob = testEnv.authenticatedContext('bob', { email: 'bob@example.com', firebase: { sign_in_provider: 'password' } });
    await assertFails(
      bob
        .firestore()
        .doc(`discussions/${THREAD}`)
        .update({
          editIndex: 1,
          // Bob znika (poprawnie), ale wpis Alice też został podmieniony.
          messages: [{ author: 'Alice', authorUid: 'bob', text: 'PODMIENIONE', at: 't1' }],
        }),
    );
  });

  it('Bob WCIĄŻ usunie tylko swoją wypowiedź, gdy reszta zostaje bez zmian', async () => {
    await seedThread();
    const bob = testEnv.authenticatedContext('bob', { email: 'bob@example.com', firebase: { sign_in_provider: 'password' } });
    await assertSucceeds(
      bob
        .firestore()
        .doc(`discussions/${THREAD}`)
        .update({
          editIndex: 1,
          messages: [baseThread.messages[0]],
        }),
    );
  });
});
