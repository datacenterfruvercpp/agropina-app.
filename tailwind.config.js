/** Sistema de diseño AgroPiña Pro. Compilar con: npm run build:css */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      colors: {
        brand: { 50: '#ecfdf3', 100: '#d1fadf', 200: '#a6f4c5', 300: '#6ce9a6', 400: '#32d583', 500: '#12b76a', 600: '#039855', 700: '#027a48', 800: '#05603a', 900: '#054f31', 950: '#022c1c' },
        gold: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        ink: { 50: '#f5f7fa', 100: '#eef1f5', 200: '#dfe4ea', 300: '#c5cdd7', 400: '#8f9aa8', 500: '#66717f', 600: '#4d5866', 700: '#3a4452', 800: '#26303c', 850: '#1c242f', 900: '#141b24', 950: '#0c1219' },
        shell: { DEFAULT: '#0f1b2b', 2: '#17263b', 3: '#21334c' }
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,.06)',
        lift: '0 2px 4px rgba(15,23,42,.05), 0 12px 32px -12px rgba(15,23,42,.25)',
        panel: '-16px 0 48px -16px rgba(15,23,42,.35)',
        glow: '0 6px 16px -8px rgba(3,152,85,.55)'
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } }
      },
      animation: { 'fade-up': 'fade-up .35s cubic-bezier(.2,.7,.2,1) both', shimmer: 'shimmer 1.4s infinite' }
    }
  }
};
