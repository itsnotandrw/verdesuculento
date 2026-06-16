import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        surface: 'var(--bg-elev)',
        'surface-2': 'var(--bg-elev-2)',
        fg: 'var(--fg)',
        'fg-dim': 'var(--fg-dim)',
        'fg-mute': 'var(--fg-mute)',
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        'accent-fg': 'var(--accent-fg)',
      },
      fontFamily: {
        display: ['Instrument Serif', 'Times New Roman', 'serif'],
        ui: ['Inter', 'Helvetica Neue', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
