/// <reference types="vitest" />
import { defineConfig } from 'vite';

/**
 * Konfiguracja WYŁĄCZNIE dla `*.rules.test.ts` (firestore.rules/storage.rules
 * przez @firebase/rules-unit-testing). Osobno od `vite.config.ts`, bo ten
 * plik świadomie WYŁĄCZA te testy (potrzebują żywego Emulatora — bez niego
 * `vitest run`/`npm test` w CI by po prostu wisiał albo padał na brak
 * połączenia). Uruchamia się przez `npm run test:rules`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.rules.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Każdy plik *.rules.test.ts woła `initializeTestEnvironment` z tym samym
    // `projectId` ('eter11-rules-test'), więc wszystkie mówią do JEDNEGO
    // Firestore Emulatora. Domyślnie Vitest uruchamia pliki testowe RÓWNOLEGLE
    // (osobne wątki/procesy) — `clearFirestore()` z `afterEach` jednego pliku
    // kasował dane w trakcie testu innego pliku. Efekt: losowy plik i losowy
    // test (raz `notifications`, raz `discussions`, raz `roles`) padał
    // z `PERMISSION_DENIED` mimo poprawnych reguł — nie do odróżnienia od
    // prawdziwej regresji bez wielokrotnego uruchomienia. Pliki muszą iść
    // po kolei.
    fileParallelism: false,
  },
});
