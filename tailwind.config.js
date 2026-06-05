/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // CivilOS Dark CAD Theme
        canvas: {
          bg: '#0D0F12',
          grid: '#1A1D23',
          border: '#2A2D35',
        },
        panel: {
          bg: '#12151A',
          hover: '#1E2128',
          active: '#252930',
          border: '#2A2D35',
        },
        accent: {
          primary: '#00B4D8',    // CAD cyan — main action color
          secondary: '#0077A8',  // darker cyan
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          muted: '#64748B',
        },
        text: {
          primary: '#E8EAF0',
          secondary: '#9CA3AF',
          muted: '#6B7280',
          inverse: '#0D0F12',
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
        display: ['Rajdhani', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        bengali: ['Noto Sans Bengali', 'sans-serif'],
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
        panel: '0 0 0 1px rgba(0,180,216,0.1), 0 4px 24px rgba(0,0,0,0.4)',
        tooltip: '0 2px 8px rgba(0,0,0,0.6)',
        active: '0 0 0 2px rgba(0,180,216,0.5)',
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
