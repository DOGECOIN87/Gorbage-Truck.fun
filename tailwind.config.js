/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx,jsx,js}',
  ],
  theme: {
    extend: {
      fontSize: {
        // Typography hierarchy
        'display-lg': ['clamp(3.5rem, 10vw, 5rem)', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '900' }],
        'display-md': ['clamp(2.5rem, 8vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '900' }],
        'display-sm': ['clamp(2rem, 6vw, 2.5rem)', { lineHeight: '1.2', letterSpacing: '0', fontWeight: '900' }],
        'h1': ['clamp(1.75rem, 5vw, 2rem)', { lineHeight: '1.2', fontWeight: '800' }],
        'h2': ['clamp(1.5rem, 4vw, 1.75rem)', { lineHeight: '1.3', fontWeight: '700' }],
        'h3': ['clamp(1.25rem, 3.5vw, 1.5rem)', { lineHeight: '1.4', fontWeight: '700' }],
        'body-lg': ['clamp(1rem, 2.5vw, 1.125rem)', { lineHeight: '1.5', fontWeight: '500' }],
        'body': ['clamp(0.875rem, 2vw, 1rem)', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['clamp(0.8125rem, 1.8vw, 0.875rem)', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['clamp(0.75rem, 1.5vw, 0.8125rem)', { lineHeight: '1.4', fontWeight: '600' }],
        'label': ['clamp(0.625rem, 1.2vw, 0.75rem)', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '0.05em' }],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      padding: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch': '44px', // Minimum touch target size
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
};
