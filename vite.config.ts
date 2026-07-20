/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
