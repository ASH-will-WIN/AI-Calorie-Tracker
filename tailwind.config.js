module.exports = {
    content: [
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
      { pattern: /(bg|text)-(primary|secondary|blue|purple)-(100|600)/ },
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          },
          secondary: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#f97316',
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
          },
          neutral: {
            50: 'rgb(var(--neutral-50) / <alpha-value>)',
            100: 'rgb(var(--neutral-100) / <alpha-value>)',
            200: 'rgb(var(--neutral-200) / <alpha-value>)',
            300: 'rgb(var(--neutral-300) / <alpha-value>)',
            400: 'rgb(var(--neutral-400) / <alpha-value>)',
            500: 'rgb(var(--neutral-500) / <alpha-value>)',
            600: 'rgb(var(--neutral-600) / <alpha-value>)',
            700: 'rgb(var(--neutral-700) / <alpha-value>)',
            800: 'rgb(var(--neutral-800) / <alpha-value>)',
            900: 'rgb(var(--neutral-900) / <alpha-value>)',
          },
          surface: 'rgb(var(--surface-color) / <alpha-value>)',
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          display: ['Poppins', 'system-ui', 'sans-serif'],
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-in-out',
          'slide-up': 'slideUp 0.3s ease-out',
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
        },
        boxShadow: {
          'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
          'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }
      },
    },
    plugins: [],
  };
