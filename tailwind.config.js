import lineClamp from '@tailwindcss/line-clamp';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--eter-bg)',
        surface: 'var(--eter-surface)',
        raised: 'var(--eter-raised)',
        edge: 'var(--eter-edge)',
        ink: 'var(--eter-ink)',
        'ink-dim': 'var(--eter-ink-dim)',
        accent: 'var(--eter-accent)',
        'accent-2': 'var(--eter-accent-2)',
        danger: 'var(--eter-danger)',
        success: 'var(--eter-success)',
      },
      fontFamily: {
        display: 'var(--eter-font-display)',
        body: 'var(--eter-font-body)',
        mono: 'var(--eter-font-mono)',
      },
    },
  },
  plugins: [
    // Tailwind 3 nie ma line-clamp w rdzeniu, a bez niego długie nazwy
    // kart i podpowiedzi ścianek wychodzą poza krawędź.
    lineClamp,
  ],
};
