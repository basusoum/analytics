/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        surface: {
          950: '#E2E8F0',   // deepest shadow
          900: '#F8F9FA',   // body / main bg
          875: '#F1F5F9',   // subtle mid-step
          850: '#FFFFFF',   // cards / glass
          800: '#F8FAFC',   // elevated inner
          700: '#F1F5F9',   // hover
          600: '#E2E8F0',   // active / borders
        },
        gold: {
          DEFAULT: '#2563EB', // Blue base
          bright:  '#3B82F6',
          dim:     '#1D4ED8',
          muted:   '#1E3A8A',
        },
        coral:  { DEFAULT: '#EF4444' }, // Red
        sage:   { DEFAULT: '#22C55E' }, // Green
        copper: { DEFAULT: '#F97316' }, // Orange
        steel:  { DEFAULT: '#64748B' }, // Slate
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
