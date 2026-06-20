/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // CivilOS Unified Design System — canvas stays dark (CAD drawing area),
        // UI chrome (panels/toolbar/header) is light per the unified system.
        canvas: {
          bg: '#0D0F12',
          grid: '#1A1D23',
          border: '#2A2D35',
        },
        surface: {
          DEFAULT: '#ffffff',
          2: '#f9fafb',
        },
        panel: {
          bg: '#f9fafb',
          hover: '#f3f4f6',
          active: '#e8f0fe',
          border: '#e5e7eb',
        },
        accent: {
          primary: '#1a56db',    // CivilOS unified primary blue
          secondary: '#1e429f',  // primary dark
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626',
          muted: '#6b7280',
        },
        text: {
          primary: '#111827',
          secondary: '#374151',
          muted: '#6b7280',
          inverse: '#ffffff',
        },
        // BIM Object colors
        bim: {
          wall: '#64748B',
          door: '#F59E0B',
          window: '#00B4D8',
          column: '#EF4444',
          beam: '#8B5CF6',
          slab: '#10B981',
          room: '#1E2128',
          grid: '#1A3A4A',
        }
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
        xs: '0.75rem',
        sm: '0.8125rem',
      },
      spacing: {
        toolbar: '48px',
        panel: '280px',
        'panel-sm': '220px',
        header: '44px',
      },
      boxShadow: {
        panel: '0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 3px 0 rgba(0,0,0,0.06)',
        tooltip: '0 2px 8px rgba(0,0,0,0.25)',
        active: '0 0 0 2px rgba(26,86,219,0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
