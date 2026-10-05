/** Sistema de diseño AgroPiña Pro. Compilar con: npm run build:css */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      },
      colors: {
        brand: { 50: '#ecfdf3', 100: '#d1fadf', 200: '#a6f4c5', 300: '#6ce9a6', 400: '#32d583', 500: '#12b76a', 600: '#039855', 700: '#027a48', 800: '#05603a', 900: '#054f31', 950: '#022c1c' },
        gold: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        ink: { 50: '#f6f7f6', 100: '#eceeec', 200: '#d9ddda', 300: '#b4bcb7', 400: '#87928c', 500: '#66716b', 600: '#4f5955', 700: '#3d4642', 800: '#262d2a', 850: '#1c2220', 900: '#141917', 950: '#0b0f0d' }
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,20,.04), 0 6px 20px -8px rgba(16,24,20,.10)',
        lift: '0 2px 4px rgba(16,24,20,.04), 0 18px 40px -16px rgba(16,24,20,.22)',
        glow: '0 10px 30px -10px rgba(3,152,85,.55)'
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } }
      },
      animation: { 'fade-up': 'fade-up .35s cubic-bezier(.2,.7,.2,1) both', shimmer: 'shimmer 1.4s infinite' }
    }
  }
};
