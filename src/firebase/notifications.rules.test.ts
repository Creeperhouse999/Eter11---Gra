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
 * Powiadomienie `kind: 'announcement'` w dzwonku wygląda jak oficjalne
 * ogłoszenie od admina (AnnouncementsPanel pokazuje je z tym samym `from`,
 * bez sprawdzania, kto naprawdę je wysłał). Kolekcja `announcements`
 * poprawnie pilnuje `jestAdmin()` przy tworzeniu treści ogłoszenia, ale
 * `notifications` — osobny zapis, który faktycznie ląduje w dzwonku —
 * wymagał tylko `mozeEdytowac()`, czyli KAŻDEGO konta zespołu poza `viewer`.
 * Coworker/editor mógł więc ominąć panel i zapisać przez SDK notification
 * z `kind: 'announcement'`, `from: 'Admin'` i dowolnym `uid` odbiorcy —
 * podszywając się pod admina w cudzej skrzynce.
 *
 * Wymaga żywego Firestore Emulatora — `npm run test:rules`, nie `npm test`.
 */
let testEnv: RulesTestEnvironment;

const baseNotification = {
  uid: 'victim',
  kind: 'announcement',
  title: 'Ważna wiadomość od admina',
  from: 'Admin',
  link: '/admin/announcements',
  createdAt: '2026-01-01T00:00:00.000Z',
  read: false,
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

describe('firestore.rules — kto podszywa się pod ogłoszenie admina w dzwonku', () => {
  it('coworker NIE stworzy powiadomienia typu "announcement"', async () => {
    await setRole('mallory', 'coworker');
    const mallory = accountCtx('mallory');
    await assertFails(
      mallory.firestore().collection('notifications').add(baseNotification),
    );
  });

  it('admin WCIĄŻ stworzy powiadomienie typu "announcement"', async () => {
    await setRole('alan', 'admin');
    const alan = accountCtx('alan');
    await assertSucceeds(
      alan.firestore().collection('notifications').add(baseNotification),
    );
  });

  it('coworker wciąż tworzy powiadomienia innego rodzaju (np. discussion-reply)', async () => {
    await setRole('mallory', 'coworker');
    const mallory = accountCtx('mallory');
    await assertSucceeds(
      mallory.firestore().collection('notifications').add({
        ...baseNotification,
        kind: 'discussion-reply',
        from: 'mallory',
      }),
    );
  });
});
