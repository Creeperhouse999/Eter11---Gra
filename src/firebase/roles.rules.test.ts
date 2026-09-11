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
 * `jestAdmin()` traktuje rolę `programmer` (konto bota, dane logowania
 * w sekretach GitHub Actions) identycznie jak `admin` — uzasadnione tam,
 * gdzie bot faktycznie musi działać jak admin. Ale `roles` i `accountRemovals`
 * miały to samo `jestAdmin()`, mimo że komentarz przy `roles` mówi wprost:
 * „Nadaje wyłącznie admin; co-admin i niżej nie zmieniają ról, także własnej
 * (inaczej ktoś podniósłby się do admina)". Z kontem `programmer` dało się
 * zrobić dokładnie to, przed czym reguła miała chronić: nadpisać własny wpis
 * w `roles` na `role: 'admin'`.
 *
 * Wymaga żywego Firestore Emulatora — `npm run test:rules`, nie `npm test`.
 */
let testEnv: RulesTestEnvironment;

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

async function setRole(uid: string, role: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(`roles/${uid}`).set({ role, name: uid, email: `${uid}@example.com` });
  });
}

function accountCtx(uid: string) {
  return testEnv.authenticatedContext(uid, {
    email: `${uid}@example.com`,
    firebase: { sign_in_provider: 'password' },
  });
}

describe('firestore.rules — bot (programmer) nie podnosi się do admina', () => {
  it('programmer NIE nadpisze własnej roli na admin', async () => {
    await setRole('bot', 'programmer');
    const bot = accountCtx('bot');
    await assertFails(
      bot.firestore().doc('roles/bot').set({ role: 'admin', name: 'bot', email: 'bot@example.com' }),
    );
  });

  it('programmer NIE nadpisze cudzej roli', async () => {
    await setRole('bot', 'programmer');
    await setRole('coworker1', 'coworker');
    const bot = accountCtx('bot');
    await assertFails(
      bot.firestore().doc('roles/coworker1').set({ role: 'admin', name: 'coworker1', email: 'coworker1@example.com' }),
    );
  });

  it('programmer NIE skasuje wpisu roli', async () => {
    await setRole('bot', 'programmer');
    await setRole('coworker1', 'coworker');
    const bot = accountCtx('bot');
    await assertFails(bot.firestore().doc('roles/coworker1').delete());
  });

  it('prawdziwy admin wciąż nadaje role', async () => {
    await setRole('alan', 'admin');
    const alan = accountCtx('alan');
    await assertSucceeds(
      alan.firestore().doc('roles/ktos').set({ role: 'coworker', name: 'ktos', email: 'ktos@example.com' }),
    );
  });

  it('programmer NIE zleci trwałego usunięcia cudzego konta', async () => {
    await setRole('bot', 'programmer');
    const bot = accountCtx('bot');
    await assertFails(
      bot.firestore().collection('accountRemovals').add({
        uid: 'ofiara',
        email: 'ofiara@example.com',
        requestedBy: 'bot',
        requestedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
  });

  it('prawdziwy admin wciąż zleca usunięcie konta', async () => {
    await setRole('alan', 'admin');
    const alan = accountCtx('alan');
    await assertSucceeds(
      alan.firestore().collection('accountRemovals').add({
        uid: 'ofiara',
        email: 'ofiara@example.com',
        requestedBy: 'alan',
        requestedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
  });
});
