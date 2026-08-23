/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Usuwa starszy format `woff` z gotowego arkusza i z wyniku budowania.
 *
 * @fontsource dostarcza każdy krój w dwóch formatach; `woff` jest tam
 * wyłącznie dla przeglądarek sprzed 2016 roku, a dokładał 257 KB plików,
 * których nikt nie pobiera. Czyścimy na etapie `generateBundle`, bo do tego
 * momentu Vite zdążył już scalić arkusze z `node_modules` w jeden plik.
 */
function dropLegacyWoff() {
  return {
    name: 'eter-drop-legacy-woff',
    generateBundle(_options: unknown, bundle: Record<string, { type: string; source?: unknown; fileName: string }>) {
      for (const [key, asset] of Object.entries(bundle)) {
        if (asset.type !== 'asset') continue;

        // Same pliki .woff — nikt się już do nich nie odwoła.
        if (asset.fileName.endsWith('.woff')) {
          delete bundle[key];
          continue;
        }

        if (!asset.fileName.endsWith('.css') || typeof asset.source !== 'string') continue;
        asset.source = asset.source.replace(
          /,\s*url\([^)]*\.woff\)\s*format\(["']woff["']\)/g,
          '',
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), dropLegacyWoff()],
  build: {
    rollupOptions: {
      output: {
        // Firebase to największa zależność, a gra potrzebuje z niej tylko
        // odczytu zawartości. Osobny kawałek pozwala przeglądarce trzymać go
        // w pamięci podręcznej między wdrożeniami gry.
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Domyślne 5 s bywa za mało pod obciążeniem: część testów renderuje
    // ciężkie widoki (edytor z ~65 kartami, plansza misji), a cała suita
    // idzie równolegle. Taki test wysypywał się losowo na timeout — nie z
    // powodu usterki, tylko wolnego renderu. 15 s daje margines; prawdziwy
    // zawis i tak trwałby dłużej i zostałby złapany.
    testTimeout: 15000,
    // `*.rules.test.ts` sprawdza firestore.rules/storage.rules przez
    // @firebase/rules-unit-testing — potrzebuje żywego Emulatora (patrz
    // `npm run test:rules`). Pod zwykłe `vitest run` (CI, `npm test`) nie ma
    // czego się łączyć, więc te pliki są tu wyłączone.
    exclude: [...configDefaults.exclude, '**/*.rules.test.ts'],
  },
});
