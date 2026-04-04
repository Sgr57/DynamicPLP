/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        aurora: 'aurora 4s ease-in-out infinite',
        'sparkle-rise': 'sparkle-rise 2s ease-out infinite',
        'star-glow': 'star-glow 1.8s ease-in-out infinite',
        'border-sweep': 'border-sweep 2.5s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        aurora: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'sparkle-rise': {
          '0%': { opacity: '0', transform: 'translateY(0) scale(0.3)' },
          '10%': { opacity: '1', transform: 'translateY(-4px) scale(1)' },
          '70%': { opacity: '0.6', transform: 'translateY(-45px) scale(0.6)' },
          '100%': { opacity: '0', transform: 'translateY(-55px) scale(0.2)' },
        },
        'star-glow': {
          '0%, 100%': { filter: 'brightness(1) drop-shadow(0 0 4px rgba(196,181,253,0.4))' },
          '50%': { filter: 'brightness(1.3) drop-shadow(0 0 12px rgba(196,181,253,1)) drop-shadow(0 0 24px rgba(139,92,246,0.5))' },
        },
        'border-sweep': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
