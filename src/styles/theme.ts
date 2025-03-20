export const theme = {
  colors: {
    // Brand colors
    primary: {
      DEFAULT: '#000000',
      50: '#f7f7f7',
      100: '#e3e3e3',
      200: '#c8c8c8',
      300: '#a4a4a4',
      400: '#818181',
      500: '#666666',
      600: '#515151',
      700: '#434343',
      800: '#383838',
      900: '#313131',
      950: '#1a1a1a',
    },
    secondary: {
      DEFAULT: '#666666',
      50: '#f8f8f8',
      100: '#f0f0f0',
      200: '#e4e4e4',
      300: '#d1d1d1',
      400: '#b4b4b4',
      500: '#9a9a9a',
      600: '#818181',
      700: '#6a6a6a',
      800: '#5a5a5a',
      900: '#4e4e4e',
      950: '#292929',
    },
    // UI colors
    background: {
      DEFAULT: '#FFFFFF',
      subtle: '#F9FAFB',
      muted: '#F3F4F6',
    },
    foreground: {
      DEFAULT: '#111827',
      subtle: '#4B5563',
      muted: '#6B7280',
    },
    border: {
      DEFAULT: '#E5E7EB',
      subtle: '#F3F4F6',
    },
    // Feedback colors
    success: {
      DEFAULT: '#34D399',
      foreground: '#065F46',
      background: '#ECFDF5',
    },
    warning: {
      DEFAULT: '#FBBF24',
      foreground: '#92400E',
      background: '#FFFBEB',
    },
    error: {
      DEFAULT: '#EF4444',
      foreground: '#991B1B',
      background: '#FEF2F2',
    },
  },
  typography: {
    fonts: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    sizes: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeights: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
  },
  spacing: {
    0: '0',
    px: '1px',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const

export type Theme = typeof theme 