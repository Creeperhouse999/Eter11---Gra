/// <reference types="vitest" />
import { defineConfig } from 'vite';
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
  },
});
