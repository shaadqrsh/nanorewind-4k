/** @type {import('tailwindcss').Config} */
// Colors come from CSS variables in index.css (space-separated RGB), so
// opacity modifiers like bg-cover/90 still work.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './*.tsx', './components/**/*.tsx', './hooks/**/*.ts', './services/**/*.ts', './utils/**/*.ts'],
  theme: {
    extend: {
      colors: {
        // Oxblood album: the page, raised panels, the darker cover band, rules
        page: v('page'),
        panel: v('panel'),
        cover: v('cover'),
        rule: v('rule'),
        // Text on the page, from strongest to quietest
        bone: { DEFAULT: v('bone'), 2: v('bone-2'), 3: v('bone-3') },
        corner: v('corner'),
        brass: v('brass'),
        rust: v('rust'),
        sage: v('sage'),
        // The loupe and slider handle: a dark object laid on top of a photo
        lens: v('lens'),
      },
      fontFamily: {
        display: ['"Young Serif"', 'Georgia', 'serif'],
        sans: ['"Atkinson Hyperlegible"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"Cascadia Mono"', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out both',
        'progress': 'progress 1.4s ease-in-out infinite',
        'breathe': 'breathe 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Indeterminate bar for a photo that's restoring (a third of the width,
        // sliding fully across).
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
        // Skeleton placeholders
        breathe: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
};
