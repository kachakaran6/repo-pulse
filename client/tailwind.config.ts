import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 12-Step Neutral Scale (mapped to CSS variables)
        neutral: {
          1: 'var(--neutral-1)',
          2: 'var(--neutral-2)',
          3: 'var(--neutral-3)',
          4: 'var(--neutral-4)',
          5: 'var(--neutral-5)',
          6: 'var(--neutral-6)',
          7: 'var(--neutral-7)',
          8: 'var(--neutral-8)',
          9: 'var(--neutral-9)',
          10: 'var(--neutral-10)',
          11: 'var(--neutral-11)',
          12: 'var(--neutral-12)',
        },
        // Editorial Accent
        accent: {
          subtle: 'var(--accent-subtle)',
          border: 'var(--accent-border)',
          DEFAULT: 'var(--accent-base)',
          base: 'var(--accent-base)',
          text: 'var(--accent-text)',
        },
        // Semantic Verdicts (Keep, Pause, Retire)
        verdict: {
          keep: {
            bg: 'var(--verdict-keep-bg)',
            border: 'var(--verdict-keep-border)',
            DEFAULT: 'var(--verdict-keep-base)',
            base: 'var(--verdict-keep-base)',
            text: 'var(--verdict-keep-text)',
          },
          pause: {
            bg: 'var(--verdict-pause-bg)',
            border: 'var(--verdict-pause-border)',
            DEFAULT: 'var(--verdict-pause-base)',
            base: 'var(--verdict-pause-base)',
            text: 'var(--verdict-pause-text)',
          },
          retire: {
            bg: 'var(--verdict-retire-bg)',
            border: 'var(--verdict-retire-border)',
            DEFAULT: 'var(--verdict-retire-base)',
            base: 'var(--verdict-retire-base)',
            text: 'var(--verdict-retire-text)',
          },
        },
        // 5-Step Activity Heat Ramp (Hot to Dormant)
        activity: {
          5: 'var(--activity-5)',
          4: 'var(--activity-4)',
          3: 'var(--activity-3)',
          2: 'var(--activity-2)',
          1: 'var(--activity-1)',
          0: 'var(--neutral-6)',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['14px', { lineHeight: '20px' }],
        md: ['15px', { lineHeight: '22px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['18px', { lineHeight: '26px' }],
        '2xl': ['22px', { lineHeight: '28px' }],
        '3xl': ['28px', { lineHeight: '34px' }],
        '4xl': ['36px', { lineHeight: '42px' }],
        '5xl': ['48px', { lineHeight: '52px' }],
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
      },
      borderRadius: {
        none: '0px',
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        subtle: 'var(--shadow-subtle)',
        card: 'var(--shadow-card)',
        popover: 'var(--shadow-popover)',
        drawer: 'var(--shadow-drawer)',
        modal: 'var(--shadow-modal)',
      },
      zIndex: {
        base: '0',
        raised: '1',
        sticky: '10',
        popover: '20',
        'drawer-backdrop': '30',
        drawer: '40',
        'modal-backdrop': '50',
        modal: '60',
        toast: '100',
        tooltip: '110',
      },
      transitionDuration: {
        fast: '120ms',
        normal: '200ms',
        slow: '320ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        'in-quiet': 'cubic-bezier(0.3, 0, 1, 1)',
        'out-quiet': 'cubic-bezier(0, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
