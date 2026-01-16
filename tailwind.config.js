/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/App.css",
  ],
  theme: {
    extend: {
      colors: {
        'casino-red': 'hsl(0, 100%, 27%)',
        'deep-red': 'hsl(348, 83%, 47%)',
        'rich-gold': 'hsl(51, 100%, 50%)',
        'warm-gold': 'hsl(39, 100%, 50%)',
        'dark-theater': 'hsl(0, 0%, 10%)',
        'curtain-shadow': 'hsl(0, 0%, 18%)',
      },
    },
  },
  plugins: [],
}