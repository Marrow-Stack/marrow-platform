/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutral scale — warm off-whites in light, true deep charcoal in dark
        ink: {
          50:  '#F7F7F5',
          100: '#EFEEEA',
          200: '#DDDBD4',
          300: '#B8B5AB',
          400: '#8C8980',
          500: '#625F58',
          600: '#3E3C37',
          700: '#252420',
          800: '#18170F',   // dark bg surface
          900: '#100F0A',   // dark bg base
        },
        // Accent — not amber/gold but a warm saffron-orange-slate
        // Modern, editorial, not AI-cliché
        accent: {
          50:  '#FFF8EE',
          100: '#FDEFD7',
          200: '#F9D89A',
          300: '#F4BB52',
          400: '#EFA020',   // primary CTA
          500: '#D4870A',
          600: '#A66205',
          700: '#7A4804',
        },
        // Surface shades for light mode
        surface: {
          0:   '#FFFFFF',
          1:   '#FAFAF8',
          2:   '#F4F3EF',
          3:   '#ECEAE3',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Geist"', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      boxShadow: {
        'card':     '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.05)',
        'card-md':  '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        'card-lg':  '0 4px 16px rgba(0,0,0,0.10), 0 16px 48px rgba(0,0,0,0.08)',
        'glow':     '0 0 0 3px rgba(239,160,32,0.25)',
        'glow-lg':  '0 8px 32px rgba(239,160,32,0.20)',
      },
    },
  },
  plugins: [],
}
