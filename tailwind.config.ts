import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
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
    },
  },
  plugins: [],
};

export default config;
