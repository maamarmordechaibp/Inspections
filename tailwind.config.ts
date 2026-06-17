/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          navy: '#11264D',
          navyDark: '#0B1E3F',
          gold: '#E5C642',
          goldLight: '#F0DA6E',
          cyan: '#69C5E8',
          cyanLight: '#8FD6F0',
        },
      },
    },
  },
  plugins: [],
}