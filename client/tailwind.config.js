/** @type {import('tailwindcss').Config} */
// Court Vision design tokens — Phase 1: FOUND-02
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        'cv-court': '#1a472a',
        'cv-hardwood': '#c8a96e',
        'cv-chalk': '#f5f0e8',
        'cv-steel': '#1e293b',
        'cv-navy': '#0f172a',
        'cv-accent': '#f97316',
        'cv-accent-hover': '#ea6c00',
      },
      fontFamily: {
        display: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'cv': '0.5rem',
      },
    },
  },
  plugins: [],
};
