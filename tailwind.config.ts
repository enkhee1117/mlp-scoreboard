import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist)', 'Geist', 'var(--font-inter)', 'Inter', '-apple-system', 'system-ui', 'sans-serif'],
        serif: ['var(--font-instrument-serif)', '"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains-mono)', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
        // Legacy alias used by main's pages — Space Grotesk fallback to Geist.
        display: ['var(--font-space-grotesk)', 'Space Grotesk', 'var(--font-geist)', 'system-ui', 'sans-serif'],
      },
      colors: {
        paper: 'var(--paper)',
        'paper-2': 'var(--paper-2)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        line: 'var(--line)',
        court: 'var(--court)',
        'court-deep': 'var(--court-deep)',
        serve: 'var(--serve)',
        berry: 'var(--berry)',
        sky: 'var(--sky)',
        // Legacy tokens referenced by main's pages (admin, tournaments, history, profile, scoreboard).
        // Kept so those pages render until they migrate to the new system.
        volt: '#D4FF00',
        'volt-hover': '#BCE600',
        'cyan-accent': '#00E5FF',
        'dark-bg': '#0B0E14',
        'card-bg': '#151A23',
        'border-dark': '#222A38',
        'text-muted': '#94A3B8',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      borderRadius: {
        card: '18px',
        hero: '22px',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulse: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '.4' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-600px) rotate(720deg)', opacity: '0' },
        },
      },
      animation: {
        pop: 'pop .25s ease',
        slideUp: 'slideUp .25s ease',
        pulse: 'pulse 1.4s infinite',
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
