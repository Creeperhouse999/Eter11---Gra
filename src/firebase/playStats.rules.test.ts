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
 * `recordFinishedGame`/`recordFinishedTutorial` (playStats.ts) zapisują
 * `stats/play` przez `setDoc(..., {merge:true})`, ale KAŻDA z nich dotyka
 * tylko części z czterech pól naraz — żadna nie pisze wszystkich czterech
 * jednym zapisem. Stara reguła wymagała obecności WSZYSTKICH czterech pól w
 * `request.resource.data`. Dla scalania to nieszkodliwe, GDY dokument już
 * istnieje (istniejące pola dochodzą przy scaleniu) — ale gdy dokumentu
 * jeszcze nie ma (`resource == null`), scalanie nie ma z czym się połączyć,
 * więc dokument nigdy by się nie dał założyć pierwszym zapisem.
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

describe('firestore.rules — stats/play daje się założyć częściowym zapisem', () => {
  it('anonim zakłada dokument samym `finished` (recordFinishedGame — brak tutorialsFinished)', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(
      anon.firestore().doc('stats/play').set(
        { finished: 1, won: 1, missionsSolved: 3 },
        { merge: true },
      ),
    );
  });

  it('anonim zakłada dokument samym `tutorialsFinished` (recordFinishedTutorial)', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(
      anon.firestore().doc('stats/play').set({ tutorialsFinished: 1 }, { merge: true }),
    );
  });
});

describe('firestore.rules — stats/play wciąż pilnuje kierunku i rozmiaru przyrostu', () => {
  it('anonim NIE cofnie licznika (dokument istnieje, nowa wartość mniejsza)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('stats/play').set({ finished: 5, won: 2, missionsSolved: 10, tutorialsFinished: 1 });
    });
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      anon.firestore().doc('stats/play').set({ finished: 3 }, { merge: true }),
    );
  });

  it('anonim NIE doda naraz więcej niż jedna partia daje (finished skacze o 50)', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      anon.firestore().doc('stats/play').set({ finished: 50 }, { merge: true }),
    );
  });

  it('anonim NIE wpisze pola spoza czwórki liczników', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      anon.firestore().doc('stats/play').set({ finished: 1, playerName: 'Zosia' }, { merge: true }),
    );
  });
});
