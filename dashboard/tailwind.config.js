/** @type {import('tailwindcss').Config} */
// Paleta "Sideline Navy" (ver .kiro/specs/02-dashboard/design.md, sección 3).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#0B1426', 900: '#111D35', 800: '#18284A', 700: '#22365F' },
        acento: '#00A3FF',
        alerta: '#FF8A00',
        defensa: '#F43F5E',
        balon: '#A0522D',
        campo: '#14532D',
        texto: { DEFAULT: '#E6EDF7', suave: '#94A3B8' },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
