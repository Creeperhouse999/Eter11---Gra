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
  },
});
