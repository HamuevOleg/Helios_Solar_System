/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:     '#0a0e1a',
        panel:  '#111827',
        accent: '#fb923c',
        good:   '#22c55e',
        warn:   '#eab308',
        bad:    '#ef4444',
        muted:  '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-accent': '0 0 24px -8px rgba(251,146,60,0.45)',
        'glow-good':   '0 0 24px -8px rgba(34,197,94,0.45)',
      },
    },
  },
  plugins: [],
};
