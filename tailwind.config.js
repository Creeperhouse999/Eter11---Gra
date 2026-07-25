/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Kanały RGB (np. `--eter-surface-rgb: 20 29 51`), nie gołe `var(--eter-*)`.
      // Goły `var()` nie ma slotu na alfę, więc Tailwind CISZĄ gubił każdy
      // modyfikator `/opacity` (`bg-bg/80`, `bg-surface/90`, `text-ink-dim/30`
      // itd.) — kompilowały się do niczego, więc przyciemnienia pod modalem/
      // powiększeniem/Czarnym Łabędziem NIE zaciemniały tła. Forma
      // `rgb(<kanały> / <alpha-value>)` naprawia alfę, a wersja pełna (bez
      // modyfikatora) wychodzi bit w bit jak dotąd: rgb(20 29 51 / 1) === #141d33.
      // Kanały ustawia i utrzymuje `applyTheme` (obok wersji hex), więc tryb
      // jasny i motyw z panelu też je aktualizują.
      colors: {
        bg: 'rgb(var(--eter-bg-rgb) / <alpha-value>)',
        surface: 'rgb(var(--eter-surface-rgb) / <alpha-value>)',
        raised: 'rgb(var(--eter-raised-rgb) / <alpha-value>)',
        edge: 'rgb(var(--eter-edge-rgb) / <alpha-value>)',
        ink: 'rgb(var(--eter-ink-rgb) / <alpha-value>)',
        'ink-dim': 'rgb(var(--eter-ink-dim-rgb) / <alpha-value>)',
        accent: 'rgb(var(--eter-accent-rgb) / <alpha-value>)',
        'accent-2': 'rgb(var(--eter-accent-2-rgb) / <alpha-value>)',
        danger: 'rgb(var(--eter-danger-rgb) / <alpha-value>)',
        success: 'rgb(var(--eter-success-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: 'var(--eter-font-display)',
        body: 'var(--eter-font-body)',
        mono: 'var(--eter-font-mono)',
      },
    },
  },
  // Bez pluginów. `line-clamp` (długie nazwy kart i podpowiedzi ścianek nie
  // wychodzą poza krawędź) jest wbudowany w Tailwind od 3.3 — osobny plugin
  // tylko dublował go i sypał ostrzeżeniem przy każdym budowaniu.
  plugins: [],
};
