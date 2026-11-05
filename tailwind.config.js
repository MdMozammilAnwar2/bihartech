/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#10162F', 800: '#141C3A', 700: '#1C2448', 600: '#262F57', 500: '#3A4270' },
        brand: { yellow: '#FFD300', hyper: '#3A10E5', mint: '#AEE938', pink: '#F966FF', beige: '#FFF0E5', paleblue: '#F5FCFF', red: '#E91C11', orange: '#FF8C00' },
        ink: { DEFAULT: '#10162F', soft: '#4B5068', mute: '#727894' },
      },
      fontFamily: {
        sans: ['"Figtree"', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      boxShadow: {
        hard: '6px 6px 0 0 #10162F',
        hardsm: '3px 3px 0 0 #10162F',
      },
    },
  },
  plugins: [],
}
