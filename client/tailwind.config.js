/** @type {import('tailwindcss').Config} */
// Court Vision design tokens — Phase 1: FOUND-02
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        border: 'var(--border)',
        sidebar: 'var(--sidebar)',
        'sidebar-foreground': 'var(--sidebar-foreground)',
        'cv-court': 'var(--cv-court)',
        'cv-hardwood': 'var(--cv-hardwood)',
        'cv-chalk': 'var(--cv-chalk)',
        'cv-steel': 'var(--cv-steel)',
        'cv-navy': 'var(--cv-navy)',
        'cv-accent': 'var(--cv-accent)',
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
