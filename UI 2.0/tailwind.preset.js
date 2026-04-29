/**
 * Lex Protocol — Tailwind CSS preset
 * Mirror of colors_and_type.css tokens. Extend your app's tailwind.config.js:
 *
 *   import lexPreset from './design-system/tailwind.preset.js';
 *   export default { presets: [lexPreset], content: [...] };
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        midnight: {
          court:  '#050505',
          deep:   '#0a0a0c',
          raised: '#111114',
          elev:   '#17171c',
          line:   '#1f1f26',
          mute:   '#2a2a33',
        },
        gavel: {
          chrome:   '#e0e0e0',
          silver:   '#b8b8bc',
          steel:    '#7a7a82',
          graphite: '#4a4a52',
        },
        verdict: {
          neon:     '#00ffc3',
          'neon-dim': '#00b386',
          violet:   '#6a00ff',
          'violet-dim': '#4a00b8',
          amber:    '#ffb800',
          crimson:  '#ff3355',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Editorial New', 'Tiempos Headline', 'Georgia', 'serif'],
        mono:  ['JetBrains Mono', 'Berkeley Mono', 'ui-monospace', 'Menlo', 'monospace'],
        sans:  ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'sans-serif'],
      },
      fontSize: {
        micro:   ['10px', { lineHeight: '1.2', letterSpacing: '0.18em' }],
        label:   ['11px', { lineHeight: '1.3', letterSpacing: '0.12em' }],
        caption: ['12px', { lineHeight: '1.4' }],
        'body-sm': ['13px', { lineHeight: '1.55' }],
        body:    ['15px', { lineHeight: '1.55' }],
        'body-lg': ['17px', { lineHeight: '1.6' }],
        display: ['112px', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
      },
      borderWidth: {
        hair: '0.5px',
      },
      borderRadius: {
        xs:   '2px',
        sm:   '4px',
        md:   '6px',
        lg:   '10px',
        xl:   '16px',
      },
      boxShadow: {
        1:  '0 1px 0 rgba(255,255,255,0.03) inset, 0 1px 2px rgba(0,0,0,0.6)',
        2:  '0 1px 0 rgba(255,255,255,0.03) inset, 0 4px 12px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(224,224,224,0.06)',
        3:  '0 1px 0 rgba(255,255,255,0.04) inset, 0 16px 40px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(224,224,224,0.08)',
        4:  '0 1px 0 rgba(255,255,255,0.05) inset, 0 40px 80px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(0,255,195,0.10)',
        'neon-sm': '0 0 8px rgba(0,255,195,0.35)',
        'neon-md': '0 0 16px rgba(0,255,195,0.45), 0 0 32px rgba(0,255,195,0.20)',
        'neon-lg': '0 0 24px rgba(0,255,195,0.55), 0 0 48px rgba(0,255,195,0.25)',
        'violet-md': '0 0 16px rgba(106,0,255,0.55), 0 0 32px rgba(106,0,255,0.22)',
        'crimson-md': '0 0 14px rgba(255,51,85,0.55)',
      },
      backdropBlur: {
        glass: '18px',
        'glass-lg': '32px',
      },
      transitionTimingFunction: {
        terminal: 'cubic-bezier(0.16, 1, 0.3, 1)',
        crisp:    'cubic-bezier(0.2, 0.6, 0.2, 1)',
      },
      transitionDuration: {
        instant: '80ms',
        fast:    '160ms',
        base:    '240ms',
        slow:    '400ms',
        reveal:  '800ms',
      },
      spacing: {
        bento: '12px',
      },
    },
  },
  plugins: [
    // Register utility classes that match colors_and_type.css
    function ({ addUtilities }) {
      addUtilities({
        '.glass-blur': {
          background: 'rgba(20, 20, 26, 0.55)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          border: '0.5px solid rgba(224, 224, 224, 0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 12px rgba(0,0,0,0.55)',
        },
        '.neon-text': {
          color: '#00ffc3',
          textShadow: '0 0 8px rgba(0, 255, 195, 0.35)',
        },
        '.hair-border': {
          border: '0.5px solid rgba(224, 224, 224, 0.08)',
        },
        '.neon-border': {
          border: '0.5px solid rgba(0, 255, 195, 0.35)',
        },
        '.bg-blueprint': {
          backgroundColor: '#050505',
          backgroundImage:
            'linear-gradient(to right, rgba(0,255,195,0.04) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(0,255,195,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        },
        '.micro-label': {
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: '10px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: '#7a7a82',
        },
      });
    },
  ],
};
