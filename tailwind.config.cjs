/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'cyber': {
          'primary': '#ff2a6d',
          'secondary': '#05d9e8',
          'accent': '#7700ff',
          'background': '#1a1a2e',
          'surface': '#16213e',
          'text': '#d1f7ff',
          'border': '#ff2a6d',
          'correct': '#00ff9f',    // Neon green for correct letters
          'present': '#ffb800',    // Neon orange for present letters
          'absent': '#2a2a3a',     // Dark blue-grey for absent letters
          'key-bg': '#2d2d44',     // Slightly lighter background for keys
        },
      },
      boxShadow: {
        'neon': '0 0 5px theme(colors.cyber.primary), 0 0 20px theme(colors.cyber.primary)',
        'neon-secondary': '0 0 5px theme(colors.cyber.secondary), 0 0 20px theme(colors.cyber.secondary)',
      },
      fontFamily: {
        'cyber': ['Orbitron', 'sans-serif'],
      },
      keyframes: {
        glow: {
          '0%, 100%': { textShadow: '0 0 10px #ff2a6d, 0 0 20px #ff2a6d, 0 0 30px #ff2a6d' },
          '50%': { textShadow: '0 0 20px #ff2a6d, 0 0 30px #ff2a6d, 0 0 40px #ff2a6d' },
        }
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
