import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';
import type firebase from 'firebase/compat/app';

/**
 * `UploadTask` (SDK compat) ma `.then()`, ale nie jest formalnie `Promise` —
 * `assertFails`/`assertSucceeds` chcą prawdziwej obietnicy.
 */
function put(
  ref: firebase.storage.Reference,
  bytes: Uint8Array,
  metadata: firebase.storage.UploadMetadata,
): Promise<unknown> {
  return Promise.resolve(ref.put(bytes, metadata));
}

/**
 * `reports/` przyjmuje `create` całkiem bez logowania — zgłoszenie z gry idzie
 * bez konta, więc reguła musi wpuścić anonima. Jedyną ochroną jest typ pliku:
 * SVG to XML i może nieść `<script>`/`onload`, a `ImageLightbox` ma link
 * „otwórz surowy plik", który otwiera Storage jako dokument najwyższego
 * poziomu — tam taki skrypt wykonałby się w oczach zespołu przeglądającego
 * zgłoszenie. `upload.ts` (SVG_FOLDERS) blokuje to po stronie klienta, ale
 * klient nie jest jedyną bramą do Storage — te testy sprawdzają regułę samą,
 * jakby ktoś wołał SDK/REST z pominięciem aplikacji.
 *
 * Wymaga żywego Storage Emulatora — `npm run test:rules`, nie `npm test`.
 */
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'eter11-rules-test',
    storage: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../storage.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('storage.rules — reports/', () => {
  it('anonim NIE wgra SVG jako „zrzut ekranu błędu"', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      put(anon.storage().ref('reports/x.svg'), new Uint8Array([1, 2, 3]), {
        contentType: 'image/svg+xml',
      }),
    );
  });

  it('anonim wciąż wgra PNG (zgłoszenie z gry ma działać bez konta)', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(
      put(anon.storage().ref('reports/x.png'), new Uint8Array([1, 2, 3]), {
        contentType: 'image/png',
      }),
    );
  });
});

describe('storage.rules — discussions/', () => {
  it('zespół (zalogowany kontem hasłowym) NIE wgra SVG', async () => {
    const zespol = testEnv.authenticatedContext('alice', {
      firebase: { sign_in_provider: 'password' },
    });
    await assertFails(
      put(zespol.storage().ref('discussions/x.svg'), new Uint8Array([1, 2, 3]), {
        contentType: 'image/svg+xml',
      }),
    );
  });

  it('zespół wciąż wgra JPEG', async () => {
    const zespol = testEnv.authenticatedContext('alice', {
      firebase: { sign_in_provider: 'password' },
    });
    await assertSucceeds(
      put(zespol.storage().ref('discussions/x.jpg'), new Uint8Array([1, 2, 3]), {
        contentType: 'image/jpeg',
      }),
    );
  });
});

describe('storage.rules — icons/ i cards/ (zespół) — SVG zostaje dozwolony', () => {
  it('zespół wciąż wgra SVG pod icons/ — tam pisze wyłącznie zespół, upload.ts to dopuszcza', async () => {
    const zespol = testEnv.authenticatedContext('alice', {
      firebase: { sign_in_provider: 'password' },
    });
    await assertSucceeds(
      put(zespol.storage().ref('icons/x.svg'), new Uint8Array([1, 2, 3]), {
        contentType: 'image/svg+xml',
      }),
    );
  });
});
