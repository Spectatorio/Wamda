/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        serif: ['Source Serif Pro', 'serif']
      },
      colors: {
        'wamda-primary': 'hsl(var(--wamda-primary))',
        'wamda-secondary': 'hsl(var(--wamda-secondary))',
        'wamda-neutral-1': 'hsl(var(--wamda-neutral-1))',
        'wamda-neutral-2': 'hsl(var(--wamda-neutral-2))',
        'wamda-neutral-3': 'hsl(var(--wamda-neutral-3))',
        'wamda-neutral-4': 'hsl(var(--wamda-neutral-4))',
        'wamda-accent-1': 'hsl(var(--wamda-accent-1))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out forwards',
        'fade-up': 'fadeUp 0.6s ease-in-out forwards',
        'panel-border-draw': 'drawBorder 1.2s ease-in-out forwards',
        'slight-rotate': 'slightRotate 20s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drawBorder: {
          "0%": { strokeDashoffset: "1000", opacity: "0" },
          "100%": { strokeDashoffset: "0", opacity: "1" },
        },
        slightRotate: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} 