/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#DC2626',
        luxury: '#050505',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Sora', 'Barlow Condensed', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '2rem',
        '4xl': '2.5rem',
        '5xl': '3rem',
        'full': '9999px',
      },
    },
  },
  plugins: [],
}
