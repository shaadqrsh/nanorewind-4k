/** @type {import('tailwindcss').Config} */
// Moved out of index.html: Tailwind now compiles at build time instead of
// running from cdn.tailwindcss.com in the browser.
export default {
  content: ['./index.html', './*.tsx', './components/**/*.tsx', './hooks/**/*.ts', './services/**/*.ts', './utils/**/*.ts'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Darkroom palette - warm ink, not cold slate
        ink: {
          950: '#0c0a09',  // near-black, warm
          900: '#161311',
          850: '#1c1815',
          800: '#241f1b',
          700: '#332b25',
          600: '#473c33',
          500: '#6b5d50',
          400: '#998a7b',
          300: '#c4b8a9',
          200: '#e3dcd1',
          100: '#f2eee7',
        },
        // Safelight amber - the darkroom glow
        amber: {
          300: '#f0c489',
          400: '#e6b06a',
          500: '#e0a458',   // primary accent
          600: '#c98a3e',
          700: '#a66d2c',
        },
        // Conservation rust (alerts / removal)
        rust: {
          400: '#d98a6a',
          500: '#c46a48',
          600: '#a8512f',
        },
        patina: {
          400: '#7fa896',
          500: '#5f8a76',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        widest: '0.28em',
      },
      boxShadow: {
        'plate': '0 2px 4px rgba(0,0,0,0.5), 0 12px 40px -8px rgba(0,0,0,0.65)',
        'safelight': '0 0 60px -10px rgba(224,164,88,0.35)',
      },
      animation: {
        'develop': 'develop 1.6s ease-out forwards',
        'grain': 'grain 0.6s steps(4) infinite',
        'rise': 'rise 0.7s cubic-bezier(0.2,0.7,0.2,1) both',
        'safelight-pulse': 'safelightPulse 4s ease-in-out infinite',
        'scan': 'scan 3.6s ease-in-out infinite',
      },
      keyframes: {
        develop: {
          '0%':   { filter: 'brightness(0.2) contrast(0.6) sepia(0.8)', opacity: '0' },
          '40%':  { opacity: '1' },
          '100%': { filter: 'brightness(1) contrast(1) sepia(0)', opacity: '1' },
        },
        rise: {
          '0%':   { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        safelightPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%':       { opacity: '0.85' },
        },
        // translateY % is relative to the band (1/3 of the plate's height),
        // so -100% → 300% sweeps from just above the top to just below the bottom.
        scan: {
          '0%, 100%': { transform: 'translateY(-100%)' },
          '50%':       { transform: 'translateY(300%)' },
        },
      },
    }
  }
};
